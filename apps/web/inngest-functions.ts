import { inngest } from './inngest-client';
import { triggerCall } from '@realty-engine/voice';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { sendTemplate, sendFreeForm, SEQUENCES } from '@realty-engine/messaging';
import { generateMessage, sanityCheck, wrapEmailTemplate } from '@realty-engine/content';
import { sendEmail } from '@realty-engine/messaging';

function isQuietHoursIST(): boolean {
  const now = new Date();
  const istHour = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) / 60 % 24;
  return istHour >= 21 || istHour < 9;
}

function next10amIST(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(4, 30, 0, 0); // 10:00 IST = 04:30 UTC
  return tomorrow;
}

async function getLeadContext(leadId: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('*, projects(*, clients(*))')
    .eq('id', leadId)
    .single();
  return data;
}

function paiseToPriceRange(min: number | null, max: number | null): string {
  const fmt = (p: number) => p >= 10_000_000 ? `₹${(p / 10_000_000).toFixed(1)} Cr` : `₹${(p / 100_000).toFixed(0)} Lac`;
  if (min && max) return `${fmt(min)} to ${fmt(max)}`;
  if (min) return `starting ${fmt(min)}`;
  if (max) return `up to ${fmt(max)}`;
  return 'price on request';
}

// ─── Auto-call new lead ───────────────────────────────────────────────────────

export const autoCallNewLead = inngest.createFunction(
  { id: 'auto-call-new-lead', name: 'Auto Call New Lead' },
  { event: 'lead/created' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;
    await step.sleep('wait-before-call', '90s');
    if (isQuietHoursIST()) {
      await step.sleepUntil('wait-for-business-hours', next10amIST());
    }
    return step.run('trigger-initial-call', async () => triggerCall(leadId));
  }
);

// ─── Retry no-answer calls ────────────────────────────────────────────────────

export const retryNoAnswerLead = inngest.createFunction(
  { id: 'retry-no-answer-lead', name: 'Retry No Answer Lead' },
  { event: 'lead/no-answer' },
  async ({ event, step }: { event: { data: { leadId: string; attempt?: number } }; step: any }) => {
    const { leadId, attempt = 0 } = event.data;

    // After 3 failed calls, start WhatsApp/email drip instead of calling again
    if (attempt >= 3) {
      await step.run('start-no-answer-drip', async () => {
        await inngest.send({ name: 'lead/no-answer-final', data: { leadId } });
      });
      return { status: 'max_retries_reached_drip_started' };
    }

    const delays = ['30m', '4h'];
    if (attempt < delays.length) {
      await step.sleep(`wait-before-retry-${attempt}`, delays[attempt]);
    } else {
      const target = next10amIST();
      target.setUTCHours(6, 0, 0, 0); // 11:30 AM IST = 06:00 UTC
      await step.sleepUntil('wait-for-next-day', target);
    }
    if (isQuietHoursIST()) {
      await step.sleepUntil('wait-for-business-hours', next10amIST());
    }

    // Make the call
    const result = await step.run(`retry-call-${attempt + 1}`, async () => triggerCall(leadId));

    // Schedule next retry with incremented attempt counter.
    // The Bolna webhook fires lead/no-answer with attempt:0 each time, so we must
    // track retries ourselves here rather than relying on the webhook.
    await step.run(`schedule-retry-${attempt + 1}`, async () => {
      await inngest.send({ name: 'lead/no-answer', data: { leadId, attempt: attempt + 1 } });
    });

    return result;
  }
);

// ─── Drip sequence runner ─────────────────────────────────────────────────────

async function runSequenceStep(leadId: string, sequenceName: string, stepIndex: number): Promise<void> {
  const sequence = SEQUENCES[sequenceName];
  if (!sequence || stepIndex >= sequence.length) return;

  const stepDef = sequence[stepIndex];
  const lead = await getLeadContext(leadId);
  if (!lead) return;

  if (lead.sequence_paused) {
    await logEvent('sequence_step_skipped_paused', { leadId, sequenceName, stepIndex }, { leadId });
    return;
  }

  const project = lead.projects;
  const client = project?.clients;

  if (client?.messaging_paused) {
    await logEvent('sequence_step_skipped_client_paused', { leadId }, { leadId });
    return;
  }

  const ctx = {
    lead: {
      fullName: lead.full_name,
      languagePref: lead.language_pref ?? 'hinglish',
      locationCity: lead.location_city,
      objections: [],
      callSummary: undefined,
    },
    project: {
      name: project?.name ?? '',
      location: project?.location ?? '',
      unitType: project?.unit_type ?? '',
      priceRange: paiseToPriceRange(project?.price_min_paise, project?.price_max_paise),
      keyAmenities: project?.key_amenities ? Object.values(project.key_amenities).flat().slice(0, 5).join(', ') : '',
      brochureUrl: project?.brochure_url,
      segment: project?.segment ?? '',
    },
    client: { brandName: client?.brand_name ?? client?.name ?? '' },
    sequenceStep: stepIndex,
  };

  const generated = await generateMessage(stepDef.kind, ctx, stepDef.channel);

  const ok = await sanityCheck(generated.body);
  if (!ok) {
    await logEvent('sequence_step_sanity_failed', { leadId, kind: stepDef.kind, body: generated.body.slice(0, 100) }, { leadId });
    return;
  }

  if (stepDef.channel === 'whatsapp') {
    const withinWindow = lead.whatsapp_window_open_until && new Date(lead.whatsapp_window_open_until) > new Date();
    if (withinWindow) {
      await sendFreeForm({ phone: lead.phone_e164, body: generated.body, leadId });
    } else {
      const templateMap: Record<string, string> = {
        brochure_send: 'brochure_followup',
        gentle_intro: 'gentle_intro',
        site_visit_nudge: 'site_visit_invite',
        confirm_callback_time: 'callback_confirm',
        social_proof: 'lead_intro_hi',
        urgency_inventory: 'lead_intro_hi',
        value_prop: 'gentle_intro',
      };
      const templateName = templateMap[stepDef.kind] ?? 'lead_intro_hi';
      await sendTemplate({
        phone: lead.phone_e164,
        templateName,
        params: [lead.full_name, client?.brand_name ?? '', project?.name ?? ''],
        mediaUrl: stepDef.kind === 'brochure_send' ? project?.brochure_url : undefined,
        leadId,
      });
    }
  } else if (stepDef.channel === 'email' && lead.email) {
    const html = wrapEmailTemplate({
      bodyHtml: `<p>${generated.body.replace(/\n/g, '</p><p>')}</p>`,
      brandName: client?.brand_name ?? '',
      logoUrl: client?.logo_url,
      projectName: project?.name ?? '',
      ctaText: 'Schedule a Site Visit',
      ctaUrl: `${process.env.APP_URL}/visit/${leadId}`,
    });
    await sendEmail({
      to: lead.email,
      subject: generated.subject ?? `About ${project?.name}`,
      htmlBody: html,
      fromName: client?.brand_name,
      leadId,
    });
  }

  const supabase = getSupabaseServer();
  await supabase.from('leads').update({ sequence_step: stepIndex + 1 }).eq('id', leadId);
  await logEvent('sequence_step_sent', { leadId, sequenceName, stepIndex, kind: stepDef.kind }, { leadId });
}

export const startQualifiedSequence = inngest.createFunction(
  { id: 'start-qualified-sequence', name: 'Start Qualified Drip Sequence' },
  { event: 'lead/qualified' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;
    const supabase = getSupabaseServer();

    await step.run('enroll-sequence', async () => {
      await supabase.from('leads').update({
        sequence_name: 'qualified_warm',
        sequence_step: 0,
        sequence_paused: false,
      }).eq('id', leadId);
    });

    const sequence = SEQUENCES.qualified_warm;
    for (let i = 0; i < sequence.length; i++) {
      const stepDef = sequence[i];
      if (i > 0) {
        await step.sleep(`wait-step-${i}`, `${stepDef.delay_minutes}m`);
      } else {
        await step.sleep('initial-delay', `${stepDef.delay_minutes}m`);
      }
      if (isQuietHoursIST()) {
        await step.sleepUntil(`quiet-hours-${i}`, next10amIST());
      }
      await step.run(`send-step-${i}`, async () => {
        return runSequenceStep(leadId, 'qualified_warm', i);
      });
    }
  }
);

export const startNoAnswerSequence = inngest.createFunction(
  { id: 'start-no-answer-sequence', name: 'Start No Answer Drip Sequence' },
  { event: 'lead/no-answer-final' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;
    const supabase = getSupabaseServer();

    await step.run('enroll-sequence', async () => {
      await supabase.from('leads').update({
        sequence_name: 'no_answer',
        sequence_step: 0,
        sequence_paused: false,
      }).eq('id', leadId);
    });

    const sequence = SEQUENCES.no_answer;
    for (let i = 0; i < sequence.length; i++) {
      const stepDef = sequence[i];
      await step.sleep(`wait-step-${i}`, `${stepDef.delay_minutes}m`);
      if (isQuietHoursIST()) {
        await step.sleepUntil(`quiet-hours-${i}`, next10amIST());
      }
      await step.run(`send-step-${i}`, async () => {
        return runSequenceStep(leadId, 'no_answer', i);
      });
    }
  }
);

// ─── Callback-requested sequence ─────────────────────────────────────────────

export const startCallbackSequence = inngest.createFunction(
  { id: 'start-callback-sequence', name: 'Start Callback Requested Sequence' },
  { event: 'lead/callback-requested' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;
    const supabase = getSupabaseServer();

    await step.run('enroll-sequence', async () => {
      await supabase.from('leads').update({
        sequence_name: 'callback_requested',
        sequence_step: 0,
        sequence_paused: false,
      }).eq('id', leadId);
    });

    const sequence = SEQUENCES.callback_requested;
    for (let i = 0; i < sequence.length; i++) {
      const stepDef = sequence[i];
      await step.sleep(`wait-step-${i}`, `${stepDef.delay_minutes}m`);
      if (isQuietHoursIST()) {
        await step.sleepUntil(`quiet-hours-${i}`, next10amIST());
      }
      await step.run(`send-step-${i}`, async () => {
        return runSequenceStep(leadId, 'callback_requested', i);
      });
    }
  }
);

// ─── Daily client report ──────────────────────────────────────────────────────

interface ClientLite {
  id: string;
  name: string;
  brand_name: string | null;
  contact_email: string | null;
  slack_webhook_url: string | null;
}

async function buildClientReport(clientId: string) {
  const supabase = getSupabaseServer();
  const yStart = new Date();
  yStart.setUTCDate(yStart.getUTCDate() - 1);
  yStart.setUTCHours(0, 0, 0, 0);
  const yEnd = new Date(yStart);
  yEnd.setUTCDate(yEnd.getUTCDate() + 1);

  type ProjectRow = { id: string; name: string };
  const { data: projects } = await supabase.from('projects').select('id, name').eq('client_id', clientId);
  const projectIds = (projects ?? []).map((p: ProjectRow) => p.id);
  if (projectIds.length === 0) {
    return { leads: 0, qualified: 0, siteVisits: 0, hotLeads: [] as Array<{ id: string; full_name: string; phone_e164: string; score: number; project: string }> };
  }
  const projectNameById = new Map<string, string>();
  (projects ?? []).forEach((p: ProjectRow) => projectNameById.set(p.id, p.name));

  const { data: dayLeads } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, status, score, last_contacted_at, project_id')
    .in('project_id', projectIds)
    .gte('created_at', yStart.toISOString())
    .lt('created_at', yEnd.toISOString());

  type DayLeadRow = { id: string; full_name: string; phone_e164: string; status: string; score: number; last_contacted_at: string | null; project_id: string };
  const dayLeadsTyped: DayLeadRow[] = (dayLeads ?? []) as DayLeadRow[];
  const leads = dayLeadsTyped.length;
  const qualified = dayLeadsTyped.filter((l) =>
    ['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won'].includes(l.status)
  ).length;
  const siteVisits = dayLeadsTyped.filter((l) =>
    ['site_visit_booked', 'visited'].includes(l.status)
  ).length;

  // Hot leads: score >= 90, not contacted by human (last_contacted_at NULL or no human note)
  const { data: hot } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, score, project_id, last_contacted_at')
    .in('project_id', projectIds)
    .gte('score', 90)
    .is('last_contacted_at', null)
    .order('score', { ascending: false })
    .limit(10);

  const hotLeads = ((hot ?? []) as DayLeadRow[]).map((l) => ({
    id: l.id,
    full_name: l.full_name,
    phone_e164: l.phone_e164,
    score: l.score,
    project: projectNameById.get(l.project_id) ?? 'Unknown',
  }));

  return { leads, qualified, siteVisits, hotLeads };
}

function reportEmailHtml(brandName: string, report: Awaited<ReturnType<typeof buildClientReport>>): string {
  const hotHtml = report.hotLeads.length === 0
    ? '<p style="color:#888;">No hot leads needing immediate attention.</p>'
    : `<ul>${report.hotLeads
        .map(
          (l) =>
            `<li><strong>${l.full_name}</strong> — score ${l.score} — ${l.project}</li>`
        )
        .join('')}</ul>`;

  return `
  <div style="font-family: Georgia, serif; max-width: 600px; margin: auto; padding: 24px; background: #fff;">
    <h2 style="color: #c9a137;">${brandName} — Daily Report</h2>
    <p style="color:#444; font-size:15px;">Summary for yesterday:</p>
    <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
      <tr><td style="padding:8px; border-bottom:1px solid #eee;">New leads</td><td style="text-align:right; font-weight:bold;">${report.leads}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee;">Qualified</td><td style="text-align:right; font-weight:bold;">${report.qualified}</td></tr>
      <tr><td style="padding:8px;">Site visits booked</td><td style="text-align:right; font-weight:bold;">${report.siteVisits}</td></tr>
    </table>
    <h3 style="color:#c9a137; margin-top: 24px;">Hot Leads (score ≥ 90, not yet contacted)</h3>
    ${hotHtml}
    <hr style="margin-top:32px; border:none; border-top:1px solid #eee;" />
    <p style="color:#999; font-size:12px;">Sent by Realty Engine. Reply to this email if anything looks wrong.</p>
  </div>`;
}

export const dailyReport = inngest.createFunction(
  { id: 'daily-client-report', name: 'Daily Client Report' },
  // 9am IST ≈ 3:30am UTC — using 3am UTC as a safe approximation
  { cron: '30 3 * * *' }, // 9:00am IST = 03:30 UTC
  async ({ step }: { step: any }) => {
    const supabase = getSupabaseServer();
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, brand_name, contact_email, slack_webhook_url')
      .eq('status', 'active');

    const list = (clients ?? []) as ClientLite[];

    for (const client of list) {
      const report = await step.run(`build-${client.id}`, async () => buildClientReport(client.id));

      // Email (skip silently if no contact_email or Brevo not configured)
      if (client.contact_email && process.env.BREVO_API_KEY) {
        await step.run(`email-${client.id}`, async () => {
          try {
            await sendEmail({
              to: client.contact_email as string,
              subject: `${client.brand_name ?? client.name} · Daily Report`,
              htmlBody: reportEmailHtml(client.brand_name ?? client.name, report),
              fromName: 'Realty Engine',
            });
          } catch (err) {
            await logEvent('daily_report_email_failed', {
              clientId: client.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        });
      }

      // Slack — only if hot leads exist AND webhook set
      if (report.hotLeads.length > 0 && client.slack_webhook_url) {
        await step.run(`slack-${client.id}`, async () => {
          try {
            const lines = report.hotLeads
              .map((l: { full_name: string; score: number; project: string }) => `• ${l.full_name} — score ${l.score} — ${l.project}`)
              .join('\n');
            await fetch(client.slack_webhook_url as string, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `*${client.brand_name ?? client.name} — Hot Leads*\n${lines}`,
              }),
            });
          } catch (err) {
            await logEvent('daily_report_slack_failed', {
              clientId: client.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        });
      }

      await logEvent('daily_report_sent', { clientId: client.id, ...report });
    }
  }
);

export const functions = [
  autoCallNewLead,
  retryNoAnswerLead,
  startQualifiedSequence,
  startNoAnswerSequence,
  startCallbackSequence,
  dailyReport,
];
