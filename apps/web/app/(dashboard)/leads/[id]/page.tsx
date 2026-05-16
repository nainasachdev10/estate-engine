import { getSupabaseServer } from '@realty-engine/core';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, MessageSquare } from 'lucide-react';
import ActionPanel, { type ActionPanelLead, type LeadStatus } from './action-panel';

export const dynamic = 'force-dynamic';

interface LeadRow {
  id: string;
  full_name: string;
  phone_e164: string;
  email: string | null;
  source: string;
  status: LeadStatus;
  score: number;
  language_pref: string;
  location_city: string | null;
  notes: string | null;
  sequence_paused: boolean;
  sequence_name: string | null;
  sequence_step: number | null;
  created_at: string;
  projects: {
    id: string;
    name: string;
    clients?: { name: string; brand_name: string | null } | null;
  } | null;
}

interface CallRow {
  id: string;
  outcome: string | null;
  sentiment: string | null;
  summary: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  created_at: string;
  score_delta?: number | null;
}

interface MessageRow {
  id: string;
  channel: 'whatsapp' | 'email' | 'sms';
  direction: 'in' | 'out';
  template_name: string | null;
  body: string;
  status: string;
  created_at: string;
}

interface EventRow {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

async function getLead(id: string): Promise<LeadRow | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('*, projects(id, name, clients(name, brand_name))')
    .eq('id', id)
    .single();
  if (!data) return null;
  // Supabase relation may come back as array — normalise
  const projects = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  return { ...data, projects } as LeadRow;
}

async function getTimeline(leadId: string) {
  const supabase = getSupabaseServer();
  const [calls, messages, events] = await Promise.all([
    supabase
      .from('call_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true }),
    supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true }),
    supabase
      .from('events')
      .select('id, kind, payload, created_at')
      .eq('lead_id', leadId)
      .in('kind', ['lead_created', 'lead_status_updated', 'voice_trigger_api'])
      .order('created_at', { ascending: true }),
  ]);
  return {
    calls: (calls.data ?? []) as CallRow[],
    messages: (messages.data ?? []) as MessageRow[],
    events: (events.data ?? []) as EventRow[],
  };
}

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-900/60 text-blue-300',
  contacted: 'bg-yellow-900/60 text-yellow-300',
  qualified: 'bg-green-900/60 text-green-300',
  site_visit_booked: 'bg-purple-900/60 text-purple-300',
  visited: 'bg-indigo-900/60 text-indigo-300',
  negotiating: 'bg-orange-900/60 text-orange-300',
  closed_won: 'bg-emerald-900/60 text-emerald-300',
  closed_lost: 'bg-red-900/60 text-red-300',
  unresponsive: 'bg-gray-800/80 text-gray-400',
};

function fmtIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sentimentEmoji(s: string | null): string {
  if (!s) return '';
  if (s === 'positive') return '🟢';
  if (s === 'negative') return '🔴';
  return '🟡';
}

function CallCard({ call }: { call: CallRow }) {
  return (
    <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/60 px-2 py-0.5 text-xs text-blue-300">
          <Phone className="h-3 w-3" /> Call
        </span>
        {call.outcome && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${
              call.outcome === 'qualified'
                ? 'bg-green-900/60 text-green-300'
                : call.outcome === 'no_answer'
                  ? 'bg-gray-800/80 text-gray-400'
                  : 'bg-red-900/60 text-red-300'
            }`}
          >
            {call.outcome.replace(/_/g, ' ')}
          </span>
        )}
        {call.sentiment && (
          <span className="text-xs text-gray-400">
            {sentimentEmoji(call.sentiment)} {call.sentiment}
          </span>
        )}
        {typeof call.score_delta === 'number' && call.score_delta !== 0 && (
          <span
            className={`font-mono text-[11px] ${
              call.score_delta > 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {call.score_delta > 0 ? '+' : ''}
            {call.score_delta}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500">
          {call.started_at ? fmtIST(call.started_at) : fmtIST(call.created_at)}
          {call.duration_seconds
            ? ` · ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
            : ''}
        </span>
      </div>
      {call.summary && <p className="mb-2 text-sm text-gray-300">{call.summary}</p>}
      {call.transcript && (
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs text-gray-500 transition-colors hover:text-gold">
            Show transcript
          </summary>
          <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md border border-dark-tertiary bg-dark-bg p-3 font-mono text-xs text-gray-400">
            {call.transcript}
          </pre>
        </details>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: MessageRow }) {
  const incoming = msg.direction === 'in';
  const Icon = msg.channel === 'email' ? Mail : MessageSquare;
  return (
    <div className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-md rounded-2xl px-4 py-2.5 ${
          incoming
            ? 'rounded-tl-sm border border-dark-tertiary bg-dark-secondary'
            : 'rounded-tr-sm bg-dark-tertiary'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500">
          <Icon className="h-3 w-3" />
          <span>{msg.channel}</span>
          {msg.template_name && <span className="text-gold/70">· {msg.template_name}</span>}
          <span
            className={`ml-auto capitalize ${
              msg.status === 'read'
                ? 'text-green-400'
                : msg.status === 'delivered'
                  ? 'text-blue-400'
                  : msg.status === 'failed'
                    ? 'text-red-400'
                    : 'text-gray-400'
            }`}
          >
            {msg.status}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-gray-100">{msg.body}</p>
        <p className="mt-1 text-right text-[10px] text-gray-600">{fmtIST(msg.created_at)}</p>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const label =
    event.kind === 'lead_created'
      ? 'Lead created'
      : event.kind === 'lead_status_updated'
        ? `Status changed to ${(event.payload?.status as string) ?? '—'}`
        : event.kind === 'voice_trigger_api'
          ? 'Call manually triggered'
          : event.kind;
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span className="h-px flex-1 bg-dark-tertiary" />
      <span className="rounded-full border border-dark-tertiary bg-dark-secondary px-2.5 py-0.5">
        {label} · {fmtIST(event.created_at)}
      </span>
      <span className="h-px flex-1 bg-dark-tertiary" />
    </div>
  );
}

export default async function LeadPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const { calls, messages, events } = await getTimeline(params.id);
  const project = lead.projects;
  const clientName = project?.clients?.brand_name ?? project?.clients?.name ?? null;

  type TimelineItem =
    | { type: 'call'; data: CallRow; ts: string }
    | { type: 'message'; data: MessageRow; ts: string }
    | { type: 'event'; data: EventRow; ts: string };

  const timeline: TimelineItem[] = [
    ...calls.map((c) => ({
      type: 'call' as const,
      data: c,
      ts: c.started_at ?? c.created_at,
    })),
    ...messages.map((m) => ({ type: 'message' as const, data: m, ts: m.created_at })),
    ...events.map((e) => ({ type: 'event' as const, data: e, ts: e.created_at })),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const panelLead: ActionPanelLead = {
    id: lead.id,
    full_name: lead.full_name,
    phone_e164: lead.phone_e164,
    email: lead.email,
    source: lead.source,
    language_pref: lead.language_pref,
    score: lead.score,
    created_at: lead.created_at,
    status: lead.status,
    notes: lead.notes,
    sequence_paused: lead.sequence_paused,
    sequence_name: lead.sequence_name,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/leads"
          className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to leads
        </Link>
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="font-serif text-3xl font-bold text-white">{lead.full_name}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[lead.status] ?? 'bg-gray-800 text-gray-400'}`}
          >
            {lead.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {project?.name ?? '—'}
          {clientName && <> · <span className="text-gray-500">{clientName}</span></>}
          {lead.location_city && <> · {lead.location_city}</>}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: timeline (2/3) */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">
            Conversation Timeline
          </h2>

          {timeline.length === 0 ? (
            <div className="rounded-lg border border-dashed border-dark-tertiary bg-dark-secondary/40 p-12 text-center">
              <p className="text-gray-300">No activity yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Calls, messages and status changes will appear here as the agent works this lead.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map((item, i) => {
                if (item.type === 'call') return <CallCard key={`c-${item.data.id}-${i}`} call={item.data} />;
                if (item.type === 'message') return <MessageBubble key={`m-${item.data.id}-${i}`} msg={item.data} />;
                return <EventCard key={`e-${item.data.id}-${i}`} event={item.data} />;
              })}
            </div>
          )}
        </div>

        {/* RIGHT: action panel (1/3) */}
        <div className="lg:col-span-1">
          <ActionPanel lead={panelLead} />
        </div>
      </div>
    </div>
  );
}
