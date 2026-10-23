// ─── Buyer-intelligence loop functions ────────────────────────────────────────
//
// 1. rescoreLeadsNightly — the continuous intelligence loop. Every open lead is
//    re-scored each night so scores rise with engagement and decay with
//    silence; leads whose score moved get a fresh Next Best Action.
// 2. weeklyIntelligenceReport — the client deliverable: Top 5 Hot + Top 25
//    Warm buying opportunities, each with score, why-now trigger, recommended
//    channel and opening line. Mailed every Monday 9am IST.
// 3. referralAskOnClosedWon — one closed buyer seeds the next: 7 days after
//    closed_won, an automated referral ask goes out (respecting opt-out).

import { inngest } from '../../inngest-client';
import {
  getSupabaseServer,
  logEvent,
  rescoreLead,
  CLOSED_STATUSES,
} from '@realty-engine/core';
import { sendTemplate, sendEmail } from '@realty-engine/messaging';
import { refreshNextBestAction } from '../../utils/next-best-action';

const RESCORE_BATCH = 50;
const NBA_NIGHTLY_CAP = 40; // Claude-spend guard: max NBAs regenerated per night

interface Mover {
  leadId: string;
  delta: number;
  score: number;
  horizon: string;
}

export const rescoreLeadsNightly = inngest.createFunction(
  { id: 'rescore-leads-nightly', name: 'Rescore Leads Nightly' },
  // 03:30 IST = 22:00 UTC — quiet window, fresh board by morning
  { cron: '0 22 * * *' },
  async ({ step }: { step: any }) => {
    const leadIds: string[] = await step.run('list-open-leads', async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('leads')
        .select('id')
        .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`)
        .eq('do_not_contact', false)
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw new Error(`Open-leads query failed: ${error.message}`);
      return (data ?? []).map((l: { id: string }) => l.id);
    });

    if (leadIds.length === 0) {
      return { status: 'no_open_leads' };
    }

    const movers: Mover[] = [];
    for (let offset = 0; offset < leadIds.length; offset += RESCORE_BATCH) {
      const batch = leadIds.slice(offset, offset + RESCORE_BATCH);
      const batchMovers: Mover[] = await step.run(`rescore-batch-${offset}`, async () => {
        const out: Mover[] = [];
        for (const leadId of batch) {
          try {
            const result = await rescoreLead(leadId);
            if (!result) continue;
            const delta = result.score - result.previousScore;
            if (Math.abs(delta) >= 10 || result.horizon === 'hot') {
              out.push({ leadId, delta, score: result.score, horizon: result.horizon });
            }
          } catch (err) {
            await logEvent('nightly_rescore_lead_failed', {
              leadId,
              error: err instanceof Error ? err.message : String(err),
            }, { leadId });
          }
        }
        return out;
      });
      movers.push(...batchMovers);
    }

    // Refresh Next Best Action for the biggest movers (hot first), capped.
    const nbaTargets = movers
      .sort((a, b) => (a.horizon === 'hot' ? -1 : 1) - (b.horizon === 'hot' ? -1 : 1) || Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, NBA_NIGHTLY_CAP);

    for (let i = 0; i < nbaTargets.length; i += 10) {
      const chunk = nbaTargets.slice(i, i + 10);
      await step.run(`refresh-nba-${i}`, async () => {
        for (const m of chunk) {
          await refreshNextBestAction(m.leadId);
        }
      });
    }

    await step.run('log-summary', async () => {
      await logEvent('nightly_rescore_done', {
        scanned: leadIds.length,
        movers: movers.length,
        nbaRefreshed: nbaTargets.length,
        topMovers: movers.slice(0, 10).map((m) => ({ leadId: m.leadId, delta: m.delta, score: m.score })),
      });
    });

    return { status: 'rescored', scanned: leadIds.length, movers: movers.length };
  },
);

// ─── Weekly intelligence report ───────────────────────────────────────────────

interface ReportLead {
  id: string;
  full_name: string;
  score: number;
  score_confidence: number | null;
  horizon: string | null;
  status: string;
  next_best_action: any;
  project_name: string;
  trigger: string | null;
}

async function buildWeeklyRows(clientId: string): Promise<{ hot: ReportLead[]; warm: ReportLead[] }> {
  const supabase = getSupabaseServer();

  const { data: projects } = await supabase.from('projects').select('id, name').eq('client_id', clientId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return { hot: [], warm: [] };
  const nameById = new Map((projects ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));

  const { data: leads } = await supabase
    .from('leads')
    .select('id, full_name, score, score_confidence, horizon, status, next_best_action, project_id')
    .in('project_id', projectIds)
    .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`)
    .eq('do_not_contact', false)
    .order('score', { ascending: false })
    .limit(200);

  const withTriggers: ReportLead[] = [];
  for (const l of (leads ?? []) as any[]) {
    withTriggers.push({
      ...l,
      project_name: nameById.get(l.project_id) ?? '',
      trigger: null,
    });
  }

  // Latest trigger per lead for the top rows only (keeps queries bounded)
  const topRows = withTriggers.slice(0, 30);
  if (topRows.length > 0) {
    const { data: triggers } = await supabase
      .from('lead_triggers')
      .select('lead_id, trigger, created_at')
      .in('lead_id', topRows.map((l) => l.id))
      .order('created_at', { ascending: false });
    const latest = new Map<string, string>();
    for (const t of (triggers ?? []) as Array<{ lead_id: string; trigger: string }>) {
      if (!latest.has(t.lead_id)) latest.set(t.lead_id, t.trigger);
    }
    for (const row of topRows) row.trigger = latest.get(row.id) ?? null;
  }

  const hot = withTriggers.filter((l) => l.horizon === 'hot').slice(0, 5);
  const hotIds = new Set(hot.map((l) => l.id));
  const warm = withTriggers.filter((l) => l.horizon === 'warm' && !hotIds.has(l.id)).slice(0, 25);
  return { hot, warm };
}

function leadRowHtml(l: ReportLead, portalLeadsUrl: string | null): string {
  const nba = l.next_best_action ?? {};
  const name = portalLeadsUrl
    ? `<a href="${portalLeadsUrl}" style="color:#1a1a1a;font-weight:bold;text-decoration:none;">${l.full_name}</a>`
    : `<span style="color:#1a1a1a;font-weight:bold;">${l.full_name}</span>`;
  return `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;">
        ${name}
        <div style="color:#888;font-size:12px;">${l.project_name}</div>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">
        ${l.score}<span style="color:#aaa;font-weight:normal;font-size:11px;"> / ${l.score_confidence ?? 0}% conf</span>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#444;">
        ${l.trigger ?? '—'}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#444;">
        ${nba.action ? `<strong style="text-transform:uppercase;">${nba.action}</strong> via ${nba.channel ?? '—'}${nba.opening_line ? `<div style="color:#777;font-style:italic;margin-top:4px;">“${nba.opening_line}”</div>` : ''}` : '—'}
      </td>
    </tr>`;
}

function weeklyReportHtml(brandName: string, hot: ReportLead[], warm: ReportLead[], portalLeadsUrl: string | null): string {
  const table = (rows: ReportLead[]) => rows.length === 0
    ? '<p style="color:#888;">None this week.</p>'
    : `<table style="width:100%;border-collapse:collapse;font-family:Georgia,serif;">
        <tr style="background:#0f172a;color:#fff;font-size:12px;text-align:left;">
          <th style="padding:8px;">Lead</th><th style="padding:8px;text-align:center;">Score</th>
          <th style="padding:8px;">Why now</th><th style="padding:8px;">Next best action</th>
        </tr>
        ${rows.map((l) => leadRowHtml(l, portalLeadsUrl)).join('')}
      </table>`;

  return `
  <div style="font-family:Georgia,serif;max-width:720px;margin:auto;padding:24px;background:#fff;">
    <h2 style="color:#c9a137;margin-bottom:4px;">${brandName} — Weekly Buying Opportunities</h2>
    <p style="color:#666;font-size:14px;">Ranked by Buying Score. Each name carries a why-now and a recommended first touch — act on the hot list first.</p>
    <h3 style="color:#b91c1c;margin-top:24px;">🔥 Hot — contact this week (${hot.length})</h3>
    ${table(hot)}
    <h3 style="color:#b45309;margin-top:28px;">Warm — nurture &amp; invite (${warm.length})</h3>
    ${table(warm)}
    <hr style="margin-top:32px;border:none;border-top:1px solid #eee;"/>
    <p style="color:#999;font-size:12px;">Scores re-rank nightly. Sent by Realty Engine every Monday.</p>
  </div>`;
}

export const weeklyIntelligenceReport = inngest.createFunction(
  { id: 'weekly-intelligence-report', name: 'Weekly Intelligence Report' },
  // Monday 09:00 IST = Monday 03:30 UTC
  { cron: '30 3 * * 1' },
  async ({ step }: { step: any }) => {
    const clients = await step.run('list-clients', async () => {
      const supabase = getSupabaseServer();
      const { data } = await supabase
        .from('clients')
        .select('id, name, brand_name, contact_email, slug')
        .eq('status', 'active');
      return (data ?? []) as Array<{ id: string; name: string; brand_name: string | null; contact_email: string | null; slug: string | null }>;
    });

    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app';
    let sent = 0;

    for (const client of clients) {
      const rows = await step.run(`build-${client.id}`, async () => buildWeeklyRows(client.id));

      if (rows.hot.length === 0 && rows.warm.length === 0) continue;
      if (!client.contact_email || !process.env.BREVO_API_KEY) continue;

      // The report goes to the CLIENT — links must land inside their portal
      // (the admin /leads routes would bounce them to /request-access).
      const portalLeadsUrl = client.slug ? `${appUrl}/portal/${client.slug}/leads` : null;

      await step.run(`email-${client.id}`, async () => {
        try {
          await sendEmail({
            to: client.contact_email as string,
            subject: `${client.brand_name ?? client.name} · ${rows.hot.length} hot + ${rows.warm.length} warm buying opportunities this week`,
            htmlBody: weeklyReportHtml(client.brand_name ?? client.name, rows.hot, rows.warm, portalLeadsUrl),
            fromName: 'Realty Engine',
            transactional: true,
          });
          await logEvent('weekly_report_sent', { clientId: client.id, hot: rows.hot.length, warm: rows.warm.length });
        } catch (err) {
          await logEvent('weekly_report_failed', {
            clientId: client.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
      sent++;
    }

    return { status: 'done', clients: clients.length, sent };
  },
);

// ─── Referral engine ──────────────────────────────────────────────────────────

export const referralAskOnClosedWon = inngest.createFunction(
  {
    id: 'referral-ask-on-closed-won',
    name: 'Referral Ask on Closed Won',
    idempotency: 'event.data.leadId',
  },
  { event: 'lead/closed_won' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;

    // Let the deal settle before asking — a week after closing.
    await step.sleep('wait-after-close', '7d');

    const lead = await step.run('fetch-lead', async () => {
      const supabase = getSupabaseServer();
      const { data } = await supabase
        .from('leads')
        .select('id, full_name, phone_e164, email, status, do_not_contact, referral_requested_at, projects(name, clients(brand_name, name, aisensy_api_key, aisensy_sender_id, messaging_paused))')
        .eq('id', leadId)
        .single();
      return data;
    });

    if (!lead) return { status: 'lead_missing' };
    if (lead.status !== 'closed_won') return { status: 'no_longer_closed_won' };
    if (lead.do_not_contact) return { status: 'opted_out' };
    if (lead.referral_requested_at) return { status: 'already_asked' };

    const project: any = Array.isArray(lead.projects) ? lead.projects[0] : lead.projects;
    const client: any = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null;
    if (client?.messaging_paused) return { status: 'messaging_paused' };

    const brandName = client?.brand_name ?? client?.name ?? '';

    const result = await step.run('send-referral-ask', async () => {
      // WhatsApp template first (requires an approved 'referral_ask' template);
      // fall back to email so the ask still lands while approval is pending.
      try {
        await sendTemplate({
          phone: lead.phone_e164,
          templateName: 'referral_ask',
          params: [lead.full_name, brandName, project?.name ?? ''],
          leadId,
          creds: {
            apiKey: client?.aisensy_api_key ?? undefined,
            senderId: client?.aisensy_sender_id ?? undefined,
          },
        });
        return 'whatsapp';
      } catch (waErr) {
        if (lead.email) {
          try {
            await sendEmail({
              to: lead.email,
              subject: `Welcome home — and a small favour`,
              htmlBody: `
                <div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:28px;background:#fff;">
                  <h2 style="color:#c9a137;">Congratulations on your new home, ${lead.full_name}!</h2>
                  <p style="color:#444;font-size:15px;line-height:1.6;">
                    From all of us at ${brandName}, thank you for choosing ${project?.name ?? 'us'}.
                    If a friend or family member is also looking, we'd love to take equally good care of them —
                    just reply to this email with their name and we'll do the rest.
                  </p>
                  <p style="color:#888;font-size:12px;">No spam, ever — we only reach out if you introduce them.</p>
                </div>`,
              fromName: brandName || 'Realty Engine',
              leadId,
              transactional: true,
            });
            return 'email';
          } catch {
            return 'failed';
          }
        }
        return 'failed';
      }
    });

    if (result !== 'failed') {
      await step.run('mark-asked', async () => {
        const supabase = getSupabaseServer();
        await supabase.from('leads').update({ referral_requested_at: new Date().toISOString() }).eq('id', leadId);
        await logEvent('referral_ask_sent', { leadId, channel: result }, { leadId });
      });
    }

    return { status: result === 'failed' ? 'send_failed' : 'asked', channel: result };
  },
);
