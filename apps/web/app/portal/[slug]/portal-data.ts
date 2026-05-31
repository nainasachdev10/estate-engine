import { getSupabaseServer } from '@realty-engine/core';
import type { FunnelDatum } from './components/funnel-chart';
import type { DailyVolumeDatum } from './components/daily-volume-chart';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'site_visit_booked'
  | 'visited'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'
  | 'unresponsive';

export const FUNNEL_ORDER: { stage: LeadStatus; label: string }[] = [
  { stage: 'new', label: 'New' },
  { stage: 'contacted', label: 'Contacted' },
  { stage: 'qualified', label: 'Qualified' },
  { stage: 'site_visit_booked', label: 'Site Visit' },
  { stage: 'visited', label: 'Visited' },
  { stage: 'negotiating', label: 'Negotiating' },
  { stage: 'closed_won', label: 'Won' },
];

export type Client = {
  id: string;
  name: string;
  brand_name: string | null;
  slug: string | null;
  gold_color_hex: string | null;
  contact_email: string | null;
};

export async function getClient(slug: string): Promise<Client | null> {
  const supabase = getSupabaseServer();
  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, gold_color_hex, contact_email, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return bySlug as Client;
  const { data: byId } = await supabase
    .from('clients')
    .select('id, name, brand_name, gold_color_hex, contact_email, slug')
    .eq('id', slug)
    .maybeSingle();
  return (byId as Client | null) ?? null;
}

export async function getProjects(clientId: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('id, name, price_min_paise')
    .eq('client_id', clientId);
  return (data ?? []) as Array<{ id: string; name: string; price_min_paise: number | null }>;
}

type LeadStatsRow = {
  id: string;
  project_id: string;
  status: LeadStatus;
  score: number;
  created_at: string;
};

export async function getMonthLeadStats(
  clientId: string,
  projectIds: string[],
  priceMap: Map<string, number>,
) {
  if (projectIds.length === 0) {
    return { leadsThisMonth: 0, qualifiedThisMonth: 0, qualifyRate: 0, pipelinePaise: 0 };
  }
  const supabase = getSupabaseServer();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('leads')
    .select('id, project_id, status, score, created_at')
    .in('project_id', projectIds)
    .gte('created_at', monthStart.toISOString());

  const rows = (data ?? []) as LeadStatsRow[];
  const leadsThisMonth = rows.length;
  const qualifiedThisMonth = rows.filter((l) =>
    ['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won'].includes(l.status),
  ).length;
  const qualifyRate = leadsThisMonth === 0 ? 0 : Math.round((qualifiedThisMonth / leadsThisMonth) * 100);
  const pipelinePaise = rows
    .filter((l) => l.score >= 60)
    .reduce((sum, l) => sum + (priceMap.get(l.project_id) ?? 0), 0);

  return { leadsThisMonth, qualifiedThisMonth, qualifyRate, pipelinePaise };
}

export async function getAllTimeFunnel(projectIds: string[]): Promise<FunnelDatum[]> {
  if (projectIds.length === 0) {
    return FUNNEL_ORDER.map((s) => ({ stage: s.stage, label: s.label, count: 0 }));
  }
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('leads').select('status').in('project_id', projectIds);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((l: { status: string }) => {
    counts[l.status] = (counts[l.status] ?? 0) + 1;
  });
  return FUNNEL_ORDER.map((s) => ({
    stage: s.stage,
    label: s.label,
    count: counts[s.stage] ?? 0,
  }));
}

export async function getSiteVisitsAllTime(projectIds: string[]): Promise<number> {
  if (projectIds.length === 0) return 0;
  const supabase = getSupabaseServer();
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .in('project_id', projectIds)
    .in('status', ['site_visit_booked', 'visited', 'negotiating', 'closed_won']);
  return count ?? 0;
}

export async function getHotLeads(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('id, full_name, score, status, last_contacted_at, projects(name)')
    .in('project_id', projectIds)
    .gte('score', 70)
    .not('status', 'in', '("closed_won","closed_lost","unresponsive")')
    .order('score', { ascending: false })
    .limit(8);
  return data ?? [];
}

export async function getDailyVolume(projectIds: string[]): Promise<DailyVolumeDatum[]> {
  const days = 30;
  const today = new Date();
  const istNowMs = today.getTime() + (5.5 * 60 - today.getTimezoneOffset()) * 60_000;
  const istNow = new Date(istNowMs);
  const startDay = new Date(istNow);
  startDay.setUTCDate(istNow.getUTCDate() - (days - 1));
  startDay.setUTCHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay);
    d.setUTCDate(startDay.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  if (projectIds.length > 0) {
    const supabase = getSupabaseServer();
    const fetchFrom = new Date(startDay.getTime() - 36 * 60 * 60 * 1000);
    const { data } = await supabase
      .from('leads')
      .select('created_at')
      .in('project_id', projectIds)
      .gte('created_at', fetchFrom.toISOString());

    (data ?? []).forEach((row: { created_at: string }) => {
      const istDate = new Date(new Date(row.created_at).getTime() + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      if (buckets.has(istDate)) {
        buckets.set(istDate, (buckets.get(istDate) ?? 0) + 1);
      }
    });
  }

  return Array.from(buckets.entries()).map(([date, count]) => {
    const d = new Date(`${date}T00:00:00Z`);
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    return { date, label, count };
  });
}

export function fmtPaise(paise: number): string {
  if (paise >= 10_000_000) return `₹${(paise / 10_000_000).toFixed(1)} Cr`;
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)} L`;
  return `₹${paise.toLocaleString('en-IN')}`;
}
