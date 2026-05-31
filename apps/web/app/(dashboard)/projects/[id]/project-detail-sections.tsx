import Link from 'next/link';
import { Home, Users, Calendar, Phone, MessageSquare, Mail } from 'lucide-react';
import WebhookUrls from '../webhook-urls';

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won', 'closed_lost'] as const;
const STATUS_COLOR: Record<string, string> = {
  new: '#3b82f6', contacted: '#f59e0b', qualified: '#22c55e',
  site_visit_booked: '#a855f7', visited: '#6366f1', negotiating: '#f97316',
  closed_won: '#34d399', closed_lost: '#ef4444',
};
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  new: { bg: 'rgba(59,130,246,0.10)', color: '#93c5fd' },
  contacted: { bg: 'rgba(245,158,11,0.10)', color: '#fcd34d' },
  qualified: { bg: 'rgba(34,197,94,0.10)', color: '#86efac' },
  site_visit_booked: { bg: 'rgba(168,85,247,0.10)', color: '#d8b4fe' },
  visited: { bg: 'rgba(99,102,241,0.10)', color: '#a5b4fc' },
  negotiating: { bg: 'rgba(249,115,22,0.10)', color: '#fdba74' },
  closed_won: { bg: 'rgba(52,211,153,0.10)', color: '#34d399' },
  closed_lost: { bg: 'rgba(239,68,68,0.10)', color: '#fca5a5' },
  unresponsive: { bg: 'rgba(255,255,255,0.06)', color: '#9CA3AF' },
};

export interface ProjectDetailProps {
  project: {
    id: string;
    price_min_paise: number | null;
    price_max_paise: number | null;
    unit_type: string | null;
    available_units: number | null;
    possession_date: string | null;
    rera_number: string | null;
    site_address: string | null;
    public_slug: string | null;
    key_amenities: Record<string, unknown> | null;
  };
  stats: {
    totalLeads: number;
    outboundCalls: number;
    waMessages: number;
    emailsSent: number;
    statusCounts: Map<string, number>;
  };
  recentLeads: Array<{
    id: string;
    full_name: string;
    status: string;
    score: number;
    last_contacted_at: string | null;
    created_at: string;
  }>;
  appUrl: string;
}

function fmt(p: number) {
  return p >= 10_000_000 ? `₹${(p / 10_000_000).toFixed(1)} Cr` : `₹${(p / 100_000).toFixed(0)} L`;
}
function fmtRange(min: number | null, max: number | null) {
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return '—';
}

const CARD_STYLE = { backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' } as const;
const INNER_STYLE = { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' } as const;

export default function ProjectDetailSections({ project, stats, recentLeads, appUrl }: ProjectDetailProps) {
  const { totalLeads, outboundCalls, waMessages, emailsSent, statusCounts } = stats;
  const amenities: string[] = project.key_amenities
    ? (Object.values(project.key_amenities) as unknown[]).flat().slice(0, 6) as string[]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* LEFT column */}
      <div className="space-y-6 lg:col-span-1">
        {/* Project info */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Project Details</h2>
          <dl className="space-y-4">
            <div className="flex justify-between gap-2">
              <dt className="text-[13px] text-gray-600">Price</dt>
              <dd className="font-mono text-[14px] font-semibold" style={{ color: '#D4AF37' }}>{fmtRange(project.price_min_paise, project.price_max_paise)}</dd>
            </div>
            {project.unit_type && (
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[13px] text-gray-600"><Home className="h-3.5 w-3.5" />Units</dt>
                <dd className="text-[13px] text-gray-300">{project.unit_type}</dd>
              </div>
            )}
            {project.available_units != null && (
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[13px] text-gray-600"><Users className="h-3.5 w-3.5" />Available</dt>
                <dd className="text-[13px] text-gray-300">{project.available_units} units</dd>
              </div>
            )}
            {project.possession_date && (
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[13px] text-gray-600"><Calendar className="h-3.5 w-3.5" />Possession</dt>
                <dd className="text-[13px] text-gray-300">
                  {new Date(project.possession_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </dd>
              </div>
            )}
            {project.rera_number && (
              <div className="flex justify-between gap-2">
                <dt className="text-[13px] text-gray-600">RERA</dt>
                <dd className="font-mono text-[12px] text-gray-500">{project.rera_number}</dd>
              </div>
            )}
            {project.site_address && (
              <div className="flex flex-col gap-1.5">
                <dt className="text-[13px] text-gray-600">Site Address</dt>
                <dd className="text-[13px] text-gray-300 leading-relaxed">{project.site_address}</dd>
              </div>
            )}
          </dl>
          {amenities.length > 0 && (
            <>
              <div className="my-5 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-md border px-2.5 py-1 text-[11px] text-gray-300"
                    style={INNER_STYLE}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Automation activity */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Automation Activity</h2>
          <div className="space-y-2">
            {([
              [Phone, 'Calls placed', outboundCalls, '#60a5fa'],
              [MessageSquare, 'WhatsApp sent', waMessages, '#34d399'],
              [Mail, 'Emails sent', emailsSent, '#fbbf24'],
            ] as [typeof Phone, string, number, string][]).map(([Icon, label, value, color]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
                style={INNER_STYLE}
              >
                <span className="flex items-center gap-2 text-[13px] text-gray-400">
                  <Icon className="h-4 w-4" style={{ color }} />
                  {label}
                </span>
                <span className="font-mono text-[14px] font-semibold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          {[
            [`/leads?project=${project.id}`, 'View Leads'],
            [`/projects/${project.id}/creatives`, 'Ad Creatives'],
            [`/social?project=${project.id}`, 'Social Posts'],
            ['/analytics', 'Analytics'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border px-3 py-2.5 text-center text-[12px] font-medium text-gray-400 transition-colors hover:text-white"
              style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Lead funnel */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Lead Funnel</h2>
          {totalLeads === 0 ? (
            <p className="py-6 text-center text-[13px] text-gray-600">No leads yet — activate the pipeline and connect your ad sources.</p>
          ) : (
            <div className="space-y-3.5">
              {STATUS_ORDER.map((s) => {
                const count = statusCounts.get(s) ?? 0;
                const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                return (
                  <div key={s}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[12px] capitalize text-gray-400">{s.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-[12px] text-gray-300">{count}</span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[s] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent leads */}
        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Recent Leads</h2>
            <Link
              href={`/leads?project=${project.id}`}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:text-[#D4AF37]"
            >
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-gray-600">No leads yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {recentLeads.map((lead) => {
                const badge = STATUS_BADGE[lead.status] ?? STATUS_BADGE.unresponsive;
                return (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    style={{ borderTopColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-white">
                        {lead.full_name.split(' ')[0]}{' '}
                        {lead.full_name.split(' ').slice(1).map((w) => w[0] + '***').join(' ')}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-600">
                        {new Date(lead.last_contacted_at ?? lead.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="font-mono text-[12px] font-semibold"
                        style={{
                          color: lead.score >= 70 ? '#34d399' : lead.score >= 40 ? '#fbbf24' : '#6b7280',
                        }}
                      >
                        {lead.score}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-6" style={CARD_STYLE}>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Webhook & Public URLs</h2>
          <WebhookUrls projectId={project.id} publicSlug={project.public_slug} appUrl={appUrl} />
        </div>
      </div>
    </div>
  );
}
