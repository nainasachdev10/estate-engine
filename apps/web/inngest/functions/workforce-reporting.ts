// ─── Marketing guardrails + the nightly insight log ──────────────────────────
//
// 1. cplWatchdogNightly — flags any campaign whose cost-per-lead crossed its
//    threshold instead of silently burning budget.
// 2. nightlyExperimentInsights — each night, measurable comparisons are mined
//    from real data and logged with a KEEP/DISCARD verdict in the experiments
//    table. Adopting a winner stays the operator's call.

import { inngest } from '../../inngest-client';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { sendEmail } from '@realty-engine/messaging';

// ─── 2. CPL watchdog ─────────────────────────────────────────────────────────

export const cplWatchdogNightly = inngest.createFunction(
  { id: 'cpl-watchdog-nightly', name: 'CPL Watchdog Nightly' },
  // 23:00 IST = 17:30 UTC
  { cron: '30 17 * * *' },
  async ({ step }: { step: any }) => {
    const supabase = getSupabaseServer();

    const breaches = await step.run('scan-campaigns', async () => {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, spend_paise, leads_count, cpl_alert_paise, project_id, projects(name, clients(brand_name, name, contact_email, slack_webhook_url))')
        .eq('status', 'active')
        .not('cpl_alert_paise', 'is', null);

      const out: Array<{ id: string; name: string; cplPaise: number; thresholdPaise: number; clientEmail: string | null; slack: string | null; brand: string }> = [];
      for (const c of (campaigns ?? []) as any[]) {
        if (!c.leads_count || c.leads_count === 0) continue; // no leads yet — spend alerting is Meta's job
        const cpl = Math.round(c.spend_paise / c.leads_count);
        if (cpl <= c.cpl_alert_paise) continue;
        const project = Array.isArray(c.projects) ? c.projects[0] : c.projects;
        const client = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null;
        out.push({
          id: c.id, name: c.name, cplPaise: cpl, thresholdPaise: c.cpl_alert_paise,
          clientEmail: client?.contact_email ?? null,
          slack: client?.slack_webhook_url ?? null,
          brand: client?.brand_name ?? client?.name ?? '',
        });
      }
      return out;
    });

    if (breaches.length === 0) return { status: 'all_within_threshold' };

    await step.run('notify', async () => {
      for (const b of breaches) {
        await logEvent('cpl_threshold_breached', {
          campaignId: b.id, cplPaise: b.cplPaise, thresholdPaise: b.thresholdPaise,
        });
        if (b.slack) {
          await fetch(b.slack, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `⚠️ *Campaign burning budget* — "${b.name}"\nCPL ₹${Math.round(b.cplPaise / 100)} vs threshold ₹${Math.round(b.thresholdPaise / 100)}. Pause, narrow the audience, or refresh the creative.`,
            }),
          }).catch(() => {});
        }
        if (b.clientEmail && process.env.BREVO_API_KEY) {
          try {
            await sendEmail({
              to: b.clientEmail,
              subject: `⚠️ ${b.brand} · Campaign "${b.name}" is above its cost threshold`,
              htmlBody: `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:24px;">
                <h2 style="color:#b91c1c;">Cost-per-lead alert</h2>
                <p>Campaign <strong>${b.name}</strong> is producing leads at <strong>₹${Math.round(b.cplPaise / 100).toLocaleString('en-IN')}</strong> each — above your ₹${Math.round(b.thresholdPaise / 100).toLocaleString('en-IN')} threshold.</p>
                <p>Recommended: pause it, narrow the audience, or swap the creative. Nothing was changed automatically — this is your call.</p>
              </div>`,
              fromName: 'Realty Engine',
              transactional: true,
            });
          } catch { /* logged above; Slack may still have landed */ }
        }
      }
    });

    return { status: 'alerted', breaches: breaches.length };
  },
);

// ─── 3. Nightly experiment insights ──────────────────────────────────────────
//
// Honest version of "tests one improvement every night": mines yesterday's
// real data for measurable comparisons and logs them with KEEP/DISCARD
// verdicts. Only writes when there is enough data for the comparison to mean
// something — no noise rows.

export const nightlyExperimentInsights = inngest.createFunction(
  { id: 'nightly-experiment-insights', name: 'Nightly Experiment Insights' },
  // 02:00 IST = 20:30 UTC
  { cron: '30 20 * * *' },
  async ({ step }: { step: any }) => {
    const supabase = getSupabaseServer();
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    let written = 0;

    // Sales desk: morning vs evening outbound WhatsApp — which gets more replies?
    written += await step.run('sales-send-hour', async () => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('sent_at, replied_at')
        .eq('channel', 'whatsapp')
        .eq('direction', 'out')
        .gte('sent_at', since)
        .not('sent_at', 'is', null)
        .limit(2000);
      const rows = (msgs ?? []) as Array<{ sent_at: string; replied_at: string | null }>;
      if (rows.length < 30) return 0;

      let mSent = 0, mReplied = 0, eSent = 0, eReplied = 0;
      for (const m of rows) {
        const istHour = (new Date(m.sent_at).getUTCHours() + 5.5) % 24;
        const morning = istHour >= 9 && istHour < 14;
        if (morning) { mSent++; if (m.replied_at) mReplied++; }
        else { eSent++; if (m.replied_at) eReplied++; }
      }
      if (mSent < 10 || eSent < 10) return 0;

      const mRate = mReplied / mSent;
      const eRate = eReplied / eSent;
      const eveningWins = eRate > mRate * 1.15;
      const morningWins = mRate > eRate * 1.15;
      await supabase.from('experiments').insert([{
        desk: 'sales',
        hypothesis: 'Evening follow-ups (post-2pm IST) out-perform morning sends on reply rate',
        metric: 'whatsapp_reply_rate',
        baseline: Number((mRate * 100).toFixed(1)),
        variant: Number((eRate * 100).toFixed(1)),
        verdict: eveningWins ? 'keep' : morningWins ? 'discard' : 'inconclusive',
        detail: { window_days: 14, morning_sent: mSent, evening_sent: eSent },
      }]);
      return 1;
    });

    // Marketing desk: best vs worst active campaign CPL.
    written += await step.run('marketing-cpl-spread', async () => {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('name, spend_paise, leads_count')
        .eq('status', 'active')
        .gt('leads_count', 4);
      const withCpl = ((campaigns ?? []) as any[])
        .map((c) => ({ name: c.name, cpl: c.spend_paise / c.leads_count }))
        .sort((a, b) => a.cpl - b.cpl);
      if (withCpl.length < 2) return 0;

      const best = withCpl[0];
      const worst = withCpl[withCpl.length - 1];
      if (worst.cpl <= best.cpl * 1.25) return 0; // spread too small to act on

      await supabase.from('experiments').insert([{
        desk: 'marketing',
        hypothesis: `Shift budget from "${worst.name}" to "${best.name}" (CPL gap)`,
        metric: 'cost_per_lead_paise',
        baseline: Math.round(worst.cpl),
        variant: Math.round(best.cpl),
        verdict: 'keep',
        detail: { campaigns_compared: withCpl.length },
      }]);
      return 1;
    });

    // Intelligence desk: which lead source converted to qualified best?
    written += await step.run('intel-source-conversion', async () => {
      const { data: leads } = await supabase
        .from('leads')
        .select('source, status')
        .gte('created_at', since)
        .limit(3000);
      const rows = (leads ?? []) as Array<{ source: string; status: string }>;
      if (rows.length < 40) return 0;

      const qualifiedSet = new Set(['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won']);
      const bySource = new Map<string, { total: number; q: number }>();
      for (const l of rows) {
        const s = bySource.get(l.source) ?? { total: 0, q: 0 };
        s.total++;
        if (qualifiedSet.has(l.status)) s.q++;
        bySource.set(l.source, s);
      }
      const ranked = Array.from(bySource.entries())
        .filter(([, v]) => v.total >= 10)
        .map(([k, v]) => ({ source: k, rate: v.q / v.total, total: v.total }))
        .sort((a, b) => b.rate - a.rate);
      if (ranked.length < 2) return 0;

      await supabase.from('experiments').insert([{
        desk: 'intelligence',
        hypothesis: `"${ranked[0].source}" leads qualify best — prioritise its volume`,
        metric: 'source_qualification_rate',
        baseline: Number((ranked[ranked.length - 1].rate * 100).toFixed(1)),
        variant: Number((ranked[0].rate * 100).toFixed(1)),
        verdict: ranked[0].rate > ranked[ranked.length - 1].rate * 1.2 ? 'keep' : 'inconclusive',
        detail: { window_days: 14, sources: ranked.map((r) => ({ source: r.source, rate: Number((r.rate * 100).toFixed(1)), n: r.total })) },
      }]);
      return 1;
    });

    await step.run('log-summary', async () => {
      await logEvent('nightly_experiments_done', { written });
    });

    return { status: 'done', written };
  },
);
