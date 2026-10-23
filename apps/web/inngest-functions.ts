import { inngest } from './inngest-client';
import { triggerCall } from '@realty-engine/voice';
import { getSupabaseServer, logEvent, isQuietHoursIST, formatPriceRange } from '@realty-engine/core';
import { sendTemplate, sendFreeForm, SEQUENCES } from '@realty-engine/messaging';
import { generateMessage, sanityCheck, wrapEmailTemplate } from '@realty-engine/content';
import { sendEmail } from '@realty-engine/messaging';
import { whatsappOnVoiceCompleted } from './inngest/functions/voice-completed';
import {
  creativesOnProjectActivated,
  generateImageForCampaign,
  generateVideoForCampaign,
} from './inngest/functions/creatives';
import {
  detectStuckLeadsDaily,
  pollMetaCampaignsHourly,
  alertOnStuckLead,
} from './inngest/functions/cron-monitoring';
import {
  rescoreLeadsNightly,
  weeklyIntelligenceReport,
  referralAskOnClosedWon,
} from './inngest/functions/intelligence';
import {
  cplWatchdogNightly,
  nightlyExperimentInsights,
} from './inngest/functions/workforce-reporting';

function next10amIST(): Date {
  // 10:00 IST = 04:30 UTC. Use today's 04:30 UTC if it's still ahead of us
  // (e.g. a lead created at 8am IST waits 2 hours, not 26), else tomorrow's.
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(4, 30, 0, 0); // 10:00 IST = 04:30 UTC
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return target;
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

// ─── Function A: Auto-call new lead ──────────────────────────────────────────
// lead/created → wait 30s (human opt-out window) → if still 'new', call Bolna,
// then mark contacted. Quiet-hours guard defers calls outside 9am–9pm IST.

export const autoCallNewLead = inngest.createFunction(
  { id: 'auto-call-new-lead', name: 'Auto Call New Lead' },
  { event: 'lead/created' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;

    // Short opt-out window — gives a human the chance to disable the workflow
    await step.sleep('initial-delay', '30s');

    if (isQuietHoursIST()) {
      await step.sleepUntil('wait-for-business-hours', next10amIST());
    }

    // Fetch current lead state — only call if still 'new'
    const lead = await step.run('fetch-lead', async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('leads')
        .select('id, status, phone_e164, project_id, do_not_contact')
        .eq('id', leadId)
        .single();
      if (error || !data) throw new Error(`Lead ${leadId} not found`);
      return data;
    });

    if (lead.do_not_contact) {
      await logEvent('auto_call_skipped_opted_out', {}, { leadId });
      return { status: 'skipped_opted_out' };
    }

    if (lead.status !== 'new') {
      await logEvent('auto_call_skipped_already_touched', { status: lead.status }, { leadId });
      return { status: 'skipped_already_touched' };
    }

    const callResult = await step.run('trigger-bolna-call', async () => triggerCall(leadId));

    await step.run('update-lead-status', async () => {
      const supabase = getSupabaseServer();
      await supabase
        .from('leads')
        .update({ status: 'contacted', last_contacted_at: new Date().toISOString() })
        .eq('id', leadId);
    });

    return { status: 'called', ...callResult };
  }
);

// ─── Retry no-answer calls ────────────────────────────────────────────────────

export const retryNoAnswerLead = inngest.createFunction(
  {
    id: 'retry-no-answer-lead',
    name: 'Retry No Answer Lead',
    // Serialize per lead so duplicate webhook deliveries can't dial in parallel
    concurrency: { key: 'event.data.leadId', limit: 1 },
  },
  { event: 'lead/no-answer' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;

    // The Bolna webhook emits lead/no-answer once per unanswered call, so the
    // number of calls already placed (call_logs) IS the attempt counter. This
    // avoids the old bug where the function self-scheduled the next attempt
    // immediately after dialing (before knowing the outcome) while the webhook
    // also re-emitted attempt:0, multiplying retry chains.
    const callsPlaced = await step.run('count-calls', async () => {
      const supabase = getSupabaseServer();
      const { count } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', leadId);
      return count ?? 1;
    });

    // After 3 calls (1 original + 2 retries), start WhatsApp/email drip instead
    if (callsPlaced >= 3) {
      await step.run('start-no-answer-drip', async () => {
        await inngest.send({ name: 'lead/no-answer-final', data: { leadId } });
      });
      return { status: 'max_retries_reached_drip_started' };
    }

    const delays = ['30m', '4h'];
    await step.sleep(`wait-before-retry-${callsPlaced}`, delays[Math.min(callsPlaced - 1, delays.length - 1)]);
    if (isQuietHoursIST()) {
      await step.sleepUntil('wait-for-business-hours', next10amIST());
    }

    // Re-check right before dialing: skip if the lead answered/replied in the
    // meantime (status progressed), sequences were paused, or another run
    // already placed a newer call (call count moved past what we saw).
    const shouldCall = await step.run('check-still-unanswered', async () => {
      const supabase = getSupabaseServer();
      const [{ data: lead }, { count: currentCalls }] = await Promise.all([
        supabase.from('leads').select('id, status, sequence_paused, do_not_contact').eq('id', leadId).single(),
        supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('lead_id', leadId),
      ]);
      if (!lead || lead.sequence_paused || lead.do_not_contact) return false;
      if ((currentCalls ?? 0) !== callsPlaced) return false;
      return ['new', 'contacted'].includes(lead.status);
    });

    if (!shouldCall) {
      await logEvent('no_answer_retry_skipped', { leadId, callsPlaced }, { leadId });
      return { status: 'skipped_lead_progressed' };
    }

    // Make the call. If it also goes unanswered, the Bolna webhook emits
    // another lead/no-answer and we land back here with a higher call count.
    return step.run(`retry-call-${callsPlaced}`, async () => triggerCall(leadId));
  }
);

// ─── Drip sequence runner ─────────────────────────────────────────────────────

// Errors thrown by the messaging layer that mean "policy says not now", not
// "the send broke". These must skip the step and let the sequence continue —
// re-throwing makes Inngest retry then fail the run, killing every later step.
function isPolicySkip(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /quiet hours|rate limit|outside 24hr|messaging (is )?disabled|opted out/i.test(msg);
}

type SequenceStepResult = 'sent' | 'skipped' | 'stale';

async function runSequenceStep(leadId: string, sequenceName: string, stepIndex: number): Promise<SequenceStepResult> {
  const sequence = SEQUENCES[sequenceName];
  if (!sequence || stepIndex >= sequence.length) return 'stale';

  const stepDef = sequence[stepIndex];
  const lead = await getLeadContext(leadId);
  if (!lead) return 'stale';

  if (lead.do_not_contact) {
    await logEvent('sequence_step_stale', { leadId, sequenceName, stepIndex, reason: 'opted_out' }, { leadId });
    return 'stale';
  }

  if (lead.sequence_paused) {
    await logEvent('sequence_step_skipped_paused', { leadId, sequenceName, stepIndex }, { leadId });
    return 'skipped';
  }

  // If the lead has since been enrolled in a different sequence (e.g. went from
  // no_answer to qualified), this loop is stale — stop it instead of sending
  // two overlapping drips.
  if (lead.sequence_name && lead.sequence_name !== sequenceName) {
    await logEvent('sequence_step_stale', { leadId, sequenceName, current: lead.sequence_name, stepIndex }, { leadId });
    return 'stale';
  }

  // Dead-end statuses end the drip regardless of pause flags.
  if (['closed_won', 'closed_lost', 'unresponsive'].includes(lead.status)) {
    await logEvent('sequence_step_stale', { leadId, sequenceName, status: lead.status, stepIndex }, { leadId });
    return 'stale';
  }

  const project = lead.projects;
  const client = project?.clients;

  if (client?.messaging_paused) {
    await logEvent('sequence_step_skipped_client_paused', { leadId }, { leadId });
    return 'skipped';
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
      priceRange: formatPriceRange(project?.price_min_paise, project?.price_max_paise),
      keyAmenities: project?.key_amenities ? Object.values(project.key_amenities).flat().slice(0, 5).join(', ') : '',
      brochureUrl: project?.brochure_url,
      segment: project?.segment ?? '',
      siteAddress: project?.site_address ?? project?.location ?? '',
      possessionDate: project?.possession_date ?? '',
      availableUnits: project?.available_units ? String(project.available_units) : '',
      videoUrl: project?.video_url ?? '',
    },
    client: { brandName: client?.brand_name ?? client?.name ?? '' },
    sequenceStep: stepIndex,
  };

  const generated = await generateMessage(stepDef.kind, ctx, stepDef.channel);

  const ok = await sanityCheck(generated.body);
  if (!ok) {
    await logEvent('sequence_step_sanity_failed', { leadId, kind: stepDef.kind, body: generated.body.slice(0, 100) }, { leadId });
    return 'skipped';
  }

  const aisensyCreds = {
    apiKey: client?.aisensy_api_key || undefined,
    senderId: client?.aisensy_sender_id || undefined,
  };

  try {
    if (stepDef.channel === 'whatsapp') {
      const withinWindow = lead.whatsapp_window_open_until && new Date(lead.whatsapp_window_open_until) > new Date();
      if (withinWindow) {
        await sendFreeForm({ phone: lead.phone_e164, body: generated.body, leadId, creds: aisensyCreds });
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
          creds: aisensyCreds,
        });
      }
    } else if (stepDef.channel === 'email' && lead.email) {
      const html = wrapEmailTemplate({
        bodyHtml: `<p>${generated.body.replace(/\n/g, '</p><p>')}</p>`,
        brandName: client?.brand_name ?? '',
        logoUrl: client?.logo_url,
        projectName: project?.name ?? '',
        ctaText: 'Schedule a Site Visit',
        ctaUrl: `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app')}/visit/${leadId}`,
      });
      await sendEmail({
        to: lead.email,
        subject: generated.subject ?? `About ${project?.name}`,
        htmlBody: html,
        fromName: client?.brevo_sender_name || client?.brand_name,
        fromEmail: client?.brevo_sender_email || undefined,
        leadId,
      });
    }
  } catch (err) {
    if (isPolicySkip(err)) {
      await logEvent('sequence_step_skipped_policy', {
        leadId, sequenceName, stepIndex, kind: stepDef.kind,
        reason: err instanceof Error ? err.message : String(err),
      }, { leadId });
      return 'skipped';
    }
    throw err; // real failure — let Inngest retry this step
  }

  const supabase = getSupabaseServer();
  await supabase.from('leads').update({ sequence_step: stepIndex + 1 }).eq('id', leadId);
  await logEvent('sequence_step_sent', { leadId, sequenceName, stepIndex, kind: stepDef.kind }, { leadId });
  return 'sent';
}

// Shared enrollment + step loop for all drip sequences.
// delay_minutes is interpreted as the offset from enrollment (5, 60, 1440, 2880…
// = "5 min in", "1 hour in", "day 1", "day 2"), so each sleep is the delta from
// the previous step. Breaks out early when a step reports the loop is stale
// (lead enrolled in a newer sequence, lead deleted, or reached a dead-end status).
async function runSequenceLoop(step: any, leadId: string, sequenceName: keyof typeof SEQUENCES): Promise<void> {
  const supabase = getSupabaseServer();

  await step.run('enroll-sequence', async () => {
    await supabase.from('leads').update({
      sequence_name: sequenceName,
      sequence_step: 0,
      sequence_paused: false,
    }).eq('id', leadId);
  });

  const sequence = SEQUENCES[sequenceName];
  let elapsedMinutes = 0;
  for (let i = 0; i < sequence.length; i++) {
    const stepDef = sequence[i];
    const waitMinutes = Math.max(stepDef.delay_minutes - elapsedMinutes, 0);
    if (waitMinutes > 0) {
      await step.sleep(`wait-step-${i}`, `${waitMinutes}m`);
    }
    elapsedMinutes = Math.max(elapsedMinutes, stepDef.delay_minutes);
    if (isQuietHoursIST()) {
      await step.sleepUntil(`quiet-hours-${i}`, next10amIST());
    }
    const result = await step.run(`send-step-${i}`, async () => {
      return runSequenceStep(leadId, sequenceName, i);
    });
    if (result === 'stale') {
      return;
    }
  }
}

export const startQualifiedSequence = inngest.createFunction(
  {
    id: 'start-qualified-sequence',
    name: 'Start Qualified Drip Sequence',
    // A lead can be marked qualified from several places (voice pipeline,
    // WhatsApp reply, manual status change) — dedupe so only one drip runs.
    idempotency: 'event.data.leadId',
  },
  { event: 'lead/qualified' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    await runSequenceLoop(step, event.data.leadId, 'qualified_warm');
  }
);

export const startNoAnswerSequence = inngest.createFunction(
  {
    id: 'start-no-answer-sequence',
    name: 'Start No Answer Drip Sequence',
    idempotency: 'event.data.leadId',
    // If the lead qualifies mid-drip, stop nurturing them as a no-answer.
    cancelOn: [{ event: 'lead/qualified', match: 'data.leadId' }],
  },
  { event: 'lead/no-answer-final' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    await runSequenceLoop(step, event.data.leadId, 'no_answer');
  }
);

// ─── Callback-requested sequence ─────────────────────────────────────────────

export const startCallbackSequence = inngest.createFunction(
  {
    id: 'start-callback-sequence',
    name: 'Start Callback Requested Sequence',
    idempotency: 'event.data.leadId',
    cancelOn: [{ event: 'lead/qualified', match: 'data.leadId' }],
  },
  { event: 'lead/callback-requested' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    await runSequenceLoop(step, event.data.leadId, 'callback_requested');
  }
);

// ─── Site visit reminder sequence ────────────────────────────────────────────

export const startSiteVisitSequence = inngest.createFunction(
  {
    id: 'start-site-visit-sequence',
    name: 'Start Site Visit Reminder Sequence',
    idempotency: 'event.data.leadId',
  },
  { event: 'lead/site_visit_booked' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;
    const supabase = getSupabaseServer();

    await step.run('enroll-sequence', async () => {
      await supabase.from('leads').update({
        sequence_name: 'site_visit_booked',
        sequence_step: 0,
        sequence_paused: false,
      }).eq('id', leadId);
    });

    const visitAtIso = await step.run('fetch-visit-date', async () => {
      const { data } = await supabase.from('leads').select('visit_scheduled_at').eq('id', leadId).single();
      return (data?.visit_scheduled_at as string | null) ?? null;
    });
    const visitAt = visitAtIso ? new Date(visitAtIso) : null;

    // Step timing is anchored to the ACTUAL visit date when known — the
    // reminder copy says "your visit is tomorrow", so it must fire the day
    // before the visit, not 24h after booking. Falls back to the generic
    // offsets when the visit date is unknown.
    const targets: Array<Date | null> = visitAt
      ? [
          null, // confirmation: now (after the 5m offset below)
          new Date(visitAt.getTime() - 24 * 60 * 60 * 1000), // reminder: day before visit
          new Date(visitAt.getTime() + 24 * 60 * 60 * 1000), // follow-up: day after visit
        ]
      : [null, null, null];

    const sequence = SEQUENCES.site_visit_booked;
    let elapsedMinutes = 0;
    for (let i = 0; i < sequence.length; i++) {
      const stepDef = sequence[i];
      const target = targets[i];
      if (target && target.getTime() > Date.now()) {
        await step.sleepUntil(`wait-step-${i}`, target);
      } else {
        const waitMinutes = Math.max(stepDef.delay_minutes - elapsedMinutes, 0);
        if (waitMinutes > 0) await step.sleep(`wait-step-${i}`, `${waitMinutes}m`);
        elapsedMinutes = Math.max(elapsedMinutes, stepDef.delay_minutes);
      }
      if (isQuietHoursIST()) {
        await step.sleepUntil(`quiet-hours-${i}`, next10amIST());
      }
      const result = await step.run(`send-step-${i}`, async () => {
        return runSequenceStep(leadId, 'site_visit_booked', i);
      });
      if (result === 'stale') return;
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

  // Hot leads: horizon = hot (falling back to score >= 90 for rows not yet
  // banded by the nightly rescore). Opted-out and closed leads never appear.
  const { data: hot } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, score, project_id, last_contacted_at')
    .in('project_id', projectIds)
    .or('horizon.eq.hot,and(horizon.is.null,score.gte.90)')
    .not('status', 'in', '("closed_won","closed_lost","unresponsive")')
    .eq('do_not_contact', false)
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
    <h3 style="color:#c9a137; margin-top: 24px;">Hot Leads — call these first</h3>
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
  // Lead lifecycle
  autoCallNewLead,
  retryNoAnswerLead,
  whatsappOnVoiceCompleted,
  startQualifiedSequence,
  startNoAnswerSequence,
  startCallbackSequence,
  startSiteVisitSequence,
  // Creative pipeline (project activation)
  creativesOnProjectActivated,
  generateImageForCampaign,
  generateVideoForCampaign,
  // Cron monitoring + reporting
  detectStuckLeadsDaily,
  pollMetaCampaignsHourly,
  alertOnStuckLead,
  dailyReport,
  // Buyer intelligence
  rescoreLeadsNightly,
  weeklyIntelligenceReport,
  referralAskOnClosedWon,
  // AI workforce: marketing guardrails + nightly insights
  cplWatchdogNightly,
  nightlyExperimentInsights,
];
