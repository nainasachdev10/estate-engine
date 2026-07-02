import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { getSupabaseServer } from '@realty-engine/core';
import ActivateButton from '../activate-button';
import ProjectDetailSections from './project-detail-sections';

export const dynamic = 'force-dynamic';

function getAppUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app';
}

const SEGMENT_LABEL: Record<string, string> = {
  luxury: 'Luxury',
  premium: 'Premium',
  mid: 'Mid',
  affordable: 'Affordable',
  plot: 'Plot',
};

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.13)]"
      style={
        accent
          ? { backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }
          : { backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }
      }
    >
      <p
        className="text-2xl font-black tabular-nums"
        style={accent ? { color: '#D4AF37' } : { color: '#fff' }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{label}</p>
      {sub && <p className="mt-1.5 text-[12px] text-gray-600">{sub}</p>}
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
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/projects"
          className="mb-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:text-[#D4AF37]"
        >
          <ArrowLeft className="h-3 w-3" /> Back to projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
              {client?.brand_name ?? client?.name ?? 'Project'}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">{project.name}</h1>
              {project.segment && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }}
                >
                  {SEGMENT_LABEL[project.segment] ?? project.segment}
                </span>
              )}
              {project.status === 'active' && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }}
                >
                  Active
                </span>
              )}
              {project.status === 'draft' && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
                >
                  Draft
                </span>
              )}
            </div>
            {project.location && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {project.location}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/projects/${project.id}/creatives`}
              className="inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                borderColor: 'rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#E5E7EB',
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Ad Creatives
            </Link>
            {project.status === 'draft' ? (
              <ActivateButton projectId={project.id} />
            ) : project.public_slug ? (
              <a
                href={`/p/${project.public_slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-[13px] font-semibold transition-colors"
                style={{
                  borderColor: 'rgba(212,175,55,0.28)',
                  backgroundColor: 'rgba(212,175,55,0.10)',
                  color: '#D4AF37',
                }}
              >
                View Landing <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
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
