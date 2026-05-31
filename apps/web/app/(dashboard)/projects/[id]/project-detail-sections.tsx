import Link from 'next/link';
import { Home, Users, Calendar, Phone, MessageSquare, Mail } from 'lucide-react';
import WebhookUrls from '../webhook-urls';

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won', 'closed_lost'] as const;
const STATUS_COLOR: Record<string, string> = {
  new: 'bg-blue-500', contacted: 'bg-amber-500', qualified: 'bg-green-500',
  site_visit_booked: 'bg-purple-500', visited: 'bg-indigo-500', negotiating: 'bg-orange-500',
  closed_won: 'bg-emerald-500', closed_lost: 'bg-red-500',
};
const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-900/60 text-blue-300', contacted: 'bg-yellow-900/60 text-yellow-300',
  qualified: 'bg-green-900/60 text-green-300', site_visit_booked: 'bg-purple-900/60 text-purple-300',
  visited: 'bg-indigo-900/60 text-indigo-300', negotiating: 'bg-orange-900/60 text-orange-300',
  closed_won: 'bg-emerald-900/60 text-emerald-300', closed_lost: 'bg-red-900/60 text-red-300',
  unresponsive: 'bg-gray-800 text-gray-400',
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
        <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
          <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">Project Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between gap-2">
              <dt className="text-xs text-gray-500">Price</dt>
              <dd className="font-mono text-sm text-gold">{fmtRange(project.price_min_paise, project.price_max_paise)}</dd>
            </div>
            {project.unit_type && (
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-xs text-gray-500"><Home className="h-3 w-3" />Units</dt>
                <dd className="text-sm text-gray-200">{project.unit_type}</dd>
              </div>
            )}
            {project.available_units != null && (
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-xs text-gray-500"><Users className="h-3 w-3" />Available</dt>
                <dd className="text-sm text-gray-200">{project.available_units} units</dd>
              </div>
            )}
            {project.possession_date && (
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-xs text-gray-500"><Calendar className="h-3 w-3" />Possession</dt>
                <dd className="text-sm text-gray-200">
                  {new Date(project.possession_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </dd>
              </div>
            )}
            {project.rera_number && (
              <div className="flex justify-between gap-2">
                <dt className="text-xs text-gray-500">RERA</dt>
                <dd className="font-mono text-xs text-gray-400">{project.rera_number}</dd>
              </div>
            )}
            {project.site_address && (
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-gray-500">Site Address</dt>
                <dd className="text-sm text-gray-300">{project.site_address}</dd>
              </div>
            )}
          </dl>
          {amenities.length > 0 && (
            <div className="mt-4 border-t border-dark-tertiary pt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Amenities</p>
              <div className="flex flex-wrap gap-1">
                {amenities.map((a) => (
                  <span key={a} className="rounded border border-dark-tertiary bg-dark-bg px-2 py-0.5 text-[11px] text-gray-300">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Automation activity */}
        <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
          <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">Automation Activity</h2>
          <div className="space-y-2">
            {([
              [Phone, 'Calls placed', outboundCalls, 'text-blue-400'],
              [MessageSquare, 'WhatsApp sent', waMessages, 'text-green-400'],
              [Mail, 'Emails sent', emailsSent, 'text-amber-400'],
            ] as [typeof Phone, string, number, string][]).map(([Icon, label, value, color]) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-dark-bg px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-gray-400"><Icon className={`h-3.5 w-3.5 ${color}`} />{label}</span>
                <span className={`font-mono text-sm font-semibold ${color}`}>{value}</span>
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
            <Link key={href} href={href}
              className="rounded border border-dark-tertiary bg-dark-secondary px-3 py-2.5 text-center text-xs text-gray-200 transition-colors hover:border-gold/30 hover:text-gold">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Lead funnel */}
        <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
          <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">Lead Funnel</h2>
          {totalLeads === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No leads yet — activate the pipeline and connect your ad sources.</p>
          ) : (
            <div className="space-y-2.5">
              {STATUS_ORDER.map((s) => {
                const count = statusCounts.get(s) ?? 0;
                const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                return (
                  <div key={s}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs capitalize text-gray-400">{s.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-xs text-gray-300">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-dark-tertiary">
                      <div className={`h-full rounded-full ${STATUS_COLOR[s]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent leads */}
        <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">Recent Leads</h2>
            <Link href={`/leads?project=${project.id}`} className="text-[11px] text-gray-500 transition-colors hover:text-gold">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No leads yet.</p>
          ) : (
            <div className="divide-y divide-dark-tertiary">
              {recentLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-3 transition-colors hover:bg-dark-bg/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {lead.full_name.split(' ')[0]}{' '}
                      {lead.full_name.split(' ').slice(1).map((w) => w[0] + '***').join(' ')}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {new Date(lead.last_contacted_at ?? lead.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${STATUS_BADGE[lead.status] ?? 'bg-gray-800 text-gray-400'}`}>
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`font-mono text-xs ${lead.score >= 70 ? 'text-green-400' : lead.score >= 40 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {lead.score}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <WebhookUrls projectId={project.id} publicSlug={project.public_slug} appUrl={appUrl} />
      </div>
    </div>
  );
}
