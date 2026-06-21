// ─── Function E: Daily stuck-lead detection (CRON) ──────────────────────────
//
// Runs every day at 09:00 IST (03:30 UTC). Finds any lead that has been stuck
// in status='new' for >30 minutes (i.e. the auto-call workflow somehow failed
// or never ran) and emits a lead/stuck event the operator can wire to PostHog
// or email alerts.
//
// This is the safety net — if Inngest had an outage when the lead was created,
// this cron catches it the next morning and we can retry the call manually.

import { inngest } from '../../inngest-client';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

export const detectStuckLeadsDaily = inngest.createFunction(
  { id: 'detect-stuck-leads-daily', name: 'Detect Stuck Leads Daily' },
  // 09:00 IST = 03:30 UTC (IST is UTC+5:30)
  { cron: 'TZ=Asia/Kolkata 0 9 * * *' },
  async ({ step }: { step: any }) => {
    const stuck = await step.run('find-stuck', async () => {
      const supabase = getSupabaseServer();
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('leads')
        .select('id, project_id, created_at')
        .eq('status', 'new')
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw new Error(`Stuck-leads query failed: ${error.message}`);
      return (data ?? []) as Array<{ id: string; project_id: string; created_at: string }>;
    });

    if (stuck.length === 0) {
      await logEvent('stuck_leads_detected', { count: 0 });
      return { status: 'no_stuck_leads' };
    }

    // Emit one lead/stuck event per stuck lead — downstream subscribers (alert
    // function, ops dashboard, PostHog) decide what to do.
    await step.run('emit-stuck-events', async () => {
      const events = stuck.map((l: { id: string }) => ({
        name: 'lead/stuck',
        data: { leadId: l.id },
      }));
      await inngest.send(events);
      await logEvent('stuck_leads_detected', {
        count: stuck.length,
        leadIds: stuck.slice(0, 20).map((l: { id: string }) => l.id),
      });
    });

    return { status: 'emitted', count: stuck.length };
  },
);

// ─── Function G: Slack alert per stuck lead ───────────────────────────────────

export const alertOnStuckLead = inngest.createFunction(
  { id: 'alert-on-stuck-lead', name: 'Alert on Stuck Lead' },
  { event: 'lead/stuck' },
  async ({ event }: { event: { data: { leadId: string } } }) => {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackUrl) return { status: 'no_slack_configured' };

    const supabase = getSupabaseServer();
    const { data: lead } = await supabase
      .from('leads')
      .select('id, created_at, projects(name)')
      .eq('id', event.data.leadId)
      .single();

    const project = (lead?.projects as any)?.name ?? 'Unknown';
    const createdMinsAgo = lead?.created_at
      ? Math.round((Date.now() - new Date(lead.created_at).getTime()) / 60_000)
      : '?';

    try {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `:warning: Stuck lead detected — ${project} — stuck for ${createdMinsAgo} mins. Lead ID: ${event.data.leadId}`,
        }),
      });
    } catch (err) {
      await logEvent('slack_alert_failed', { error: err instanceof Error ? err.message : String(err) });
    }

    return { status: 'alerted', leadId: event.data.leadId };
  }
);

// ─── Function F: Hourly Meta campaign performance polling (CRON) ─────────────
//
// Every hour, list all active Meta campaigns and refresh spend / impressions /
// clicks / leads from the Meta Insights API. Per-campaign polling is its own
// step (so failures only retry that campaign), and concurrency is capped at 5
// to stay polite with Meta's rate limit.

interface MetaInsightsRow {
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface MetaInsightsResponse {
  data?: MetaInsightsRow[];
  error?: { message?: string };
}

async function fetchMetaCampaignInsights(externalCampaignId: string): Promise<{
  spendPaise: number;
  impressions: number;
  clicks: number;
  leads: number;
}> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN not set');

  const fields = 'spend,impressions,clicks,actions';
  const url =
    `https://graph.facebook.com/v21.0/${encodeURIComponent(externalCampaignId)}/insights` +
    `?fields=${fields}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { method: 'GET' });
  const json = (await res.json()) as MetaInsightsResponse;

  if (!res.ok || json.error) {
    throw new Error(`Meta insights fetch failed: ${json.error?.message ?? res.status}`);
  }

  const row = json.data?.[0];
  if (!row) {
    return { spendPaise: 0, impressions: 0, clicks: 0, leads: 0 };
  }

  // Meta returns spend in account currency (rupees) — convert to paise (×100)
  const spendRupees = parseFloat(row.spend ?? '0');
  const leadAction = row.actions?.find((a) => a.action_type === 'lead' || a.action_type === 'leadgen.other');
  return {
    spendPaise: Math.round(spendRupees * 100),
    impressions: parseInt(row.impressions ?? '0', 10),
    clicks: parseInt(row.clicks ?? '0', 10),
    leads: parseInt(leadAction?.value ?? '0', 10),
  };
}

export const pollMetaCampaignsHourly = inngest.createFunction(
  {
    id: 'poll-meta-campaigns-hourly',
    name: 'Poll Meta Campaigns Hourly',
    concurrency: { limit: 5 },
  },
  { cron: '0 * * * *' },
  async ({ step }: { step: any }) => {
    const campaigns = await step.run('list-active-campaigns', async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, external_campaign_id')
        .eq('platform', 'meta')
        .eq('status', 'active')
        .not('external_campaign_id', 'is', null);

      if (error) throw new Error(`Active campaigns query failed: ${error.message}`);
      return (data ?? []) as Array<{ id: string; external_campaign_id: string }>;
    });

    if (campaigns.length === 0) {
      return { status: 'no_active_campaigns' };
    }

    let updated = 0;
    let failed = 0;

    for (const c of campaigns) {
      try {
        await step.run(`poll-${c.id}`, async () => {
          const metrics = await fetchMetaCampaignInsights(c.external_campaign_id);
          const supabase = getSupabaseServer();
          await supabase
            .from('campaigns')
            .update({
              spend_paise: metrics.spendPaise,
              leads_count: metrics.leads,
            })
            .eq('id', c.id);
          await logEvent('meta_campaign_polled', { campaignId: c.id, ...metrics });
        });
        updated++;
      } catch (err) {
        failed++;
        await logEvent('meta_campaign_poll_failed', {
          campaignId: c.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { status: 'polled', total: campaigns.length, updated, failed };
  },
);
