import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { getSupabaseServer } from '@realty-engine/core';
import ActivateButton from '../activate-button';
import ProjectDetailSections from './project-detail-sections';

export const dynamic = 'force-dynamic';

function getAppUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app';
}

const SEGMENT_BADGE: Record<string, string> = {
  luxury: 'bg-gold/10 text-gold ring-1 ring-inset ring-gold/30',
  premium: 'bg-blue-900/40 text-blue-300 ring-1 ring-inset ring-blue-500/30',
  mid: 'bg-green-900/40 text-green-300 ring-1 ring-inset ring-green-500/30',
  affordable: 'bg-emerald-900/40 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  plot: 'bg-green-900/40 text-green-300 ring-1 ring-inset ring-green-500/30',
};

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-4">
      <p className={`text-2xl font-semibold tabular-nums ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
      <p className="mt-0.5 text-xs uppercase tracking-wider text-gray-400">{label}</p>
      {sub && <p className="mt-1 text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(name, brand_name)')
    .eq('id', params.id)
    .maybeSingle();

  if (!project) notFound();

  const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;

  const [leadsRes, recentLeadsRes] = await Promise.all([
    supabase.from('leads').select('id, status').eq('project_id', params.id),
    supabase
      .from('leads')
      .select('id, full_name, status, score, last_contacted_at, created_at')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const leads = leadsRes.data ?? [];
  const leadIds = leads.map((l: any) => l.id);

  const [callsRes, messagesRes] = leadIds.length > 0
    ? await Promise.all([
        supabase.from('call_logs').select('id').in('lead_id', leadIds),
        supabase.from('messages').select('channel, direction').in('lead_id', leadIds),
      ])
    : [{ data: [] }, { data: [] }];

  const statusCounts = new Map<string, number>();
  for (const l of leads) statusCounts.set(l.status, (statusCounts.get(l.status) ?? 0) + 1);
  const totalLeads = leads.length;
  const qualified = ['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won']
    .reduce((n, s) => n + (statusCounts.get(s) ?? 0), 0);
  const siteVisits = (statusCounts.get('site_visit_booked') ?? 0) + (statusCounts.get('visited') ?? 0);

  const allMessages = messagesRes.data ?? [];
  const outboundCalls = callsRes.data?.length ?? 0;
  const waMessages = allMessages.filter((m: any) => m.channel === 'whatsapp' && m.direction === 'out').length;
  const emailsSent = allMessages.filter((m: any) => m.channel === 'email' && m.direction === 'out').length;

  const appUrl = getAppUrl();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gold">
          <ArrowLeft className="h-3 w-3" /> Back to projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white">{project.name}</h1>
              {project.segment && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${SEGMENT_BADGE[project.segment] ?? ''}`}>
                  {project.segment}
                </span>
              )}
              {project.status === 'draft' && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-400">
                  Draft
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
              {client?.brand_name ?? client?.name}
              {project.location && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{project.location}</span>
              )}
            </p>
          </div>
          {project.status === 'draft' ? (
            <ActivateButton projectId={project.id} />
          ) : project.public_slug ? (
            <a href={`/p/${project.public_slug}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/20">
              View Landing <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBox label="Total Leads" value={totalLeads} accent />
        <StatBox label="Qualified+" value={qualified}
          sub={totalLeads > 0 ? `${Math.round((qualified / totalLeads) * 100)}% conversion` : undefined} />
        <StatBox label="Site Visits" value={siteVisits} />
        <StatBox label="Calls Made" value={outboundCalls} sub={`${waMessages} WhatsApp · ${emailsSent} Email`} />
      </div>

      <ProjectDetailSections
        project={project}
        stats={{ totalLeads, outboundCalls, waMessages, emailsSent, statusCounts }}
        recentLeads={recentLeadsRes.data ?? []}
        appUrl={appUrl}
      />
    </div>
  );
}
