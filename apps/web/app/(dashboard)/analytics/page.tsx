import { getSupabaseServer } from '@realty-engine/core';
import {
  FunnelSection,
  SourceSection,
  VoiceSection,
  MessagingSection,
  SocialSection,
  type FunnelRow,
  type SourceRow,
  type VoiceStats,
  type ChannelRow,
  type SocialPlatformRow,
} from './analytics-sections';

export const dynamic = 'force-dynamic';

// Forward lifecycle path, in order. A lead's current status implies it has
// already passed through every earlier stage, so the funnel is built from the
// CUMULATIVE count of leads that reached each stage or progressed beyond it.
// `closed_lost` and `unresponsive` are terminal exits, not forward stages, so
// they are reported separately rather than as funnel bars (which is what caused
// the nonsensical >100% "step" values).
const FORWARD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'site_visit_booked',
  'visited',
  'negotiating',
  'closed_won',
] as const;

const STATUS_COLOR: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-amber-500',
  qualified: 'bg-green-500',
  site_visit_booked: 'bg-purple-500',
  visited: 'bg-indigo-500',
  negotiating: 'bg-orange-500',
  closed_won: 'bg-emerald-500',
};

function thirtyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

type LeadRow = { status: string | null; source: string | null; score: number | null };
type CallRow = { outcome: string | null; duration_seconds: number | null };
type MessageRow = { channel: string | null; status: string | null };
type SocialRow = { platform: string | null; status: string | null };
type CampaignRow = { platform: string | null; leads_count: number | null };

async function getAnalytics() {
  const supabase = getSupabaseServer();
  const since = thirtyDaysAgoISO();

  const [leadsRes, recentLeadsRes, callsRes, messagesRes, socialRes, campaignsRes] =
    await Promise.all([
      supabase.from('leads').select('status'),
      supabase.from('leads').select('source, score').gte('created_at', since),
      supabase.from('call_logs').select('outcome, duration_seconds'),
      supabase.from('messages').select('channel, status'),
      supabase.from('social_posts').select('platform, status'),
      supabase.from('campaigns').select('platform, leads_count'),
    ]);

  const leads = (leadsRes.data as LeadRow[]) ?? [];
  const recentLeads = (recentLeadsRes.data as LeadRow[]) ?? [];
  const calls = (callsRes.data as CallRow[]) ?? [];
  const messages = (messagesRes.data as MessageRow[]) ?? [];
  const social = (socialRes.data as SocialRow[]) ?? [];
  const campaigns = (campaignsRes.data as CampaignRow[]) ?? [];

  // --- Cumulative funnel ---
  const statusCounts = new Map<string, number>();
  for (const l of leads) {
    const s = l.status ?? 'new';
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const funnelTotal = leads.length;

  // reached[k] = leads currently at stage k or any deeper forward stage.
  const reached = FORWARD_STAGES.map((_, k) =>
    FORWARD_STAGES.slice(k).reduce((sum, s) => sum + (statusCounts.get(s) ?? 0), 0),
  );
  const entered = reached[0] || 0; // leads that are on the forward path
  const funnel: FunnelRow[] = FORWARD_STAGES.map((status, k) => {
    const prev = k > 0 ? reached[k - 1] : null;
    return {
      status,
      label: status.replace(/_/g, ' '),
      reached: reached[k],
      stepPct: prev && prev > 0 ? Math.round((reached[k] / prev) * 100) : null,
      barPct: entered > 0 ? (reached[k] / entered) * 100 : 0,
      color: STATUS_COLOR[status] ?? 'bg-gray-500',
    };
  });

  const reachedOf = (status: string) => {
    const k = FORWARD_STAGES.indexOf(status as (typeof FORWARD_STAGES)[number]);
    return k >= 0 ? reached[k] : 0;
  };
  const closedWon = statusCounts.get('closed_won') ?? 0;
  const closedLost = statusCounts.get('closed_lost') ?? 0;
  const unresponsive = statusCounts.get('unresponsive') ?? 0;

  // --- Source attribution (30d) ---
  const srcAgg = new Map<string, { leads: number; scoreSum: number }>();
  for (const l of recentLeads) {
    const src = l.source ?? 'unknown';
    const cur = srcAgg.get(src) ?? { leads: 0, scoreSum: 0 };
    cur.leads += 1;
    cur.scoreSum += l.score ?? 0;
    srcAgg.set(src, cur);
  }
  const srcTotal = recentLeads.length;
  const sources: SourceRow[] = Array.from(srcAgg.entries())
    .map(([source, v]) => ({
      source,
      leads: v.leads,
      pct: srcTotal > 0 ? (v.leads / srcTotal) * 100 : 0,
      avgScore: v.leads > 0 ? Math.round(v.scoreSum / v.leads) : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  // --- Voice intelligence ---
  const totalCalls = calls.length;
  const connected = calls.filter((c) => c.outcome && c.outcome !== 'no_answer').length;
  const qualifiedCalls = calls.filter((c) => c.outcome === 'qualified').length;
  const durations = calls
    .map((c) => c.duration_seconds ?? 0)
    .filter((d) => d > 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
  const outcomeCounts = new Map<string, number>();
  for (const c of calls) {
    const o = c.outcome ?? 'no_answer';
    outcomeCounts.set(o, (outcomeCounts.get(o) ?? 0) + 1);
  }
  const voice: VoiceStats = {
    totalCalls,
    connectedPct: totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0,
    qualifiedPct: totalCalls > 0 ? Math.round((qualifiedCalls / totalCalls) * 100) : 0,
    avgDuration,
    outcomes: ['qualified', 'no_answer', 'not_qualified', 'callback', 'wrong_number'].map(
      (key) => ({ key, label: key.replace(/_/g, ' '), count: outcomeCounts.get(key) ?? 0 }),
    ),
  };

  // --- Messaging ---
  const channelAgg = new Map<string, { sent: number; delivered: number; read: number }>();
  for (const m of messages) {
    const ch = m.channel ?? 'unknown';
    const cur = channelAgg.get(ch) ?? { sent: 0, delivered: 0, read: 0 };
    // sent = anything that left the queue
    if (m.status && m.status !== 'queued' && m.status !== 'failed') cur.sent += 1;
    if (m.status === 'delivered' || m.status === 'read' || m.status === 'replied')
      cur.delivered += 1;
    if (m.status === 'read' || m.status === 'replied') cur.read += 1;
    channelAgg.set(ch, cur);
  }
  const channels: ChannelRow[] = ['whatsapp', 'email', 'sms']
    .map((ch) => {
      const v = channelAgg.get(ch) ?? { sent: 0, delivered: 0, read: 0 };
      return {
        channel: ch,
        sent: v.sent,
        deliveredPct: v.sent > 0 ? Math.round((v.delivered / v.sent) * 100) : 0,
        readPct: v.sent > 0 ? Math.round((v.read / v.sent) * 100) : 0,
      };
    })
    .filter((c) => channelAgg.has(c.channel));

  // --- Social engine ---
  const socialPlatformAgg = new Map<string, number>();
  let socialDraft = 0;
  let socialScheduled = 0;
  let socialPosted = 0;
  for (const s of social) {
    const p = s.platform ?? 'unknown';
    socialPlatformAgg.set(p, (socialPlatformAgg.get(p) ?? 0) + 1);
    if (s.status === 'draft') socialDraft += 1;
    else if (s.status === 'scheduled') socialScheduled += 1;
    else if (s.status === 'posted') socialPosted += 1;
  }
  const socialPlatforms: SocialPlatformRow[] = Array.from(socialPlatformAgg.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // --- Campaign attribution by platform ---
  const campaignAgg = new Map<string, number>();
  for (const c of campaigns) {
    const p = c.platform ?? 'unknown';
    campaignAgg.set(p, (campaignAgg.get(p) ?? 0) + (c.leads_count ?? 0));
  }
  const campaignLeads = Array.from(campaignAgg.entries())
    .map(([platform, leads]) => ({ platform, leads }))
    .sort((a, b) => b.leads - a.leads);

  return {
    funnel,
    funnelTotal,
    entered,
    reachedQualified: reachedOf('qualified'),
    reachedSiteVisit: reachedOf('site_visit_booked'),
    closedWon,
    closedLost,
    unresponsive,
    sources,
    srcTotal,
    voice,
    channels,
    social: {
      platforms: socialPlatforms,
      draft: socialDraft,
      scheduled: socialScheduled,
      posted: socialPosted,
      total: social.length,
    },
    campaignLeads,
  };
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  const { closedWon, closedLost, entered, reachedQualified, reachedSiteVisit } = data;
  const decided = closedWon + closedLost;
  // Win rate = won of all decided deals (won + lost), the standard sales definition.
  const winRate = decided > 0 ? Math.round((closedWon / decided) * 100) : 0;
  // Qualification rate = of leads that entered the pipeline, how many reached qualified.
  const qualifyRate = entered > 0 ? Math.round((reachedQualified / entered) * 100) : 0;
  // Qualify → Visit = of qualified leads, how many booked a site visit.
  const visitRate = reachedQualified > 0 ? Math.round((reachedSiteVisit / reachedQualified) * 100) : 0;

  const heroStats: { label: string; value: string; context: string }[] = [
    {
      label: 'Total Leads',
      value: data.funnelTotal.toLocaleString('en-IN'),
      context: 'lifetime tracked',
    },
    { label: 'Win Rate', value: `${winRate}%`, context: `${closedWon} won, ${closedLost} lost` },
    { label: 'Qualify Rate', value: `${qualifyRate}%`, context: `${reachedQualified} of ${entered} reached` },
    { label: 'Qualify → Visit', value: `${visitRate}%`, context: `${reachedSiteVisit} of ${reachedQualified} qualified` },
  ];

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            Analytics
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">
            Funnel Analytics
          </h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Stage conversion, source attribution &amp; engagement · Updated{' '}
            {new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            IST
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {heroStats.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-2xl border p-6"
            style={{
              backgroundColor: '#0a0a0a',
              borderColor: 'rgba(212,175,55,0.18)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
              }}
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600">
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-3xl font-black text-white">{stat.value}</p>
            <p className="mt-1 text-[13px] text-gray-500">{stat.context}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <FunnelSection
            rows={data.funnel}
            entered={data.entered}
            lost={data.closedLost}
            unresponsive={data.unresponsive}
          />
        </div>

        <SourceSection rows={data.sources} total={data.srcTotal} />
        <VoiceSection stats={data.voice} />

        <MessagingSection channels={data.channels} />
        <SocialSection social={data.social} campaignLeads={data.campaignLeads} />
      </div>
    </div>
  );
}
