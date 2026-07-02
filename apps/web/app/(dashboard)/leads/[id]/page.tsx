import { getSupabaseServer } from '@realty-engine/core';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, MessageSquare } from 'lucide-react';
import ActionPanel, { type ActionPanelLead, type LeadStatus } from './action-panel';
import SyncCallButton from '../../../components/sync-call-button';

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
  recording_url: string | null;
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

const STATUS_STYLE: Record<string, { backgroundColor: string; color: string }> = {
  new: { backgroundColor: 'rgba(96,165,250,0.10)', color: '#93c5fd' },
  contacted: { backgroundColor: 'rgba(251,191,36,0.10)', color: '#fbbf24' },
  qualified: { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' },
  site_visit_booked: { backgroundColor: 'rgba(167,139,250,0.10)', color: '#c4b5fd' },
  visited: { backgroundColor: 'rgba(129,140,248,0.10)', color: '#a5b4fc' },
  negotiating: { backgroundColor: 'rgba(251,146,60,0.10)', color: '#fb923c' },
  closed_won: { backgroundColor: 'rgba(74,222,128,0.10)', color: '#4ade80' },
  closed_lost: { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' },
  unresponsive: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' },
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

function sentimentDot(s: string | null): string {
  if (!s) return '#6B7280';
  if (s === 'positive') return '#4ade80';
  if (s === 'negative') return '#f87171';
  return '#fbbf24';
}

function CallCard({ call }: { call: CallRow }) {
  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]"
      style={{
        backgroundColor: '#090909',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em]"
          style={{ backgroundColor: 'rgba(96,165,250,0.10)', color: '#93c5fd' }}
        >
          <Phone className="h-3 w-3" /> Call
        </span>
        {call.outcome && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
            style={
              call.outcome === 'qualified'
                ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
                : call.outcome === 'no_answer'
                  ? { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' }
                  : { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' }
            }
          >
            {call.outcome.replace(/_/g, ' ')}
          </span>
        )}
        {call.sentiment && (
          <span className="inline-flex items-center gap-1.5 text-[12px] capitalize text-gray-400">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: sentimentDot(call.sentiment) }}
            />
            {call.sentiment}
          </span>
        )}
        {typeof call.score_delta === 'number' && call.score_delta !== 0 && (
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
            style={
              call.score_delta > 0
                ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#4ade80' }
                : { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' }
            }
          >
            {call.score_delta > 0 ? '+' : ''}
            {call.score_delta}
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-gray-600">
          {call.started_at ? fmtIST(call.started_at) : fmtIST(call.created_at)}
          {call.duration_seconds
            ? ` · ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
            : ''}
        </span>
      </div>
      {call.summary && (
        <p className="mb-2 text-[14px] text-gray-300 leading-relaxed">{call.summary}</p>
      )}
      {call.recording_url && (
        <audio
          controls
          preload="none"
          src={call.recording_url}
          className="mt-3 h-9 w-full"
        />
      )}
      {call.transcript && (
        <details className="group mt-3">
          <summary
            className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em] text-gray-600 transition-colors hover:text-[#D4AF37]"
          >
            Show transcript
          </summary>
          <pre
            className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-[12px] text-gray-400 leading-relaxed"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
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
        className="max-w-md rounded-2xl border px-4 py-3"
        style={
          incoming
            ? {
                backgroundColor: '#0c0c0c',
                borderColor: 'rgba(255,255,255,0.07)',
                borderTopLeftRadius: '6px',
              }
            : {
                backgroundColor: 'rgba(212,175,55,0.05)',
                borderColor: 'rgba(212,175,55,0.18)',
                borderTopRightRadius: '6px',
              }
        }
      >
        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
          <Icon className="h-3 w-3" />
          <span>{msg.channel}</span>
          {msg.template_name && (
            <span style={{ color: 'rgba(212,175,55,0.7)' }}>· {msg.template_name}</span>
          )}
          <span
            className="ml-auto capitalize"
            style={{
              color:
                msg.status === 'read'
                  ? '#4ade80'
                  : msg.status === 'delivered'
                    ? '#93c5fd'
                    : msg.status === 'failed'
                      ? '#f87171'
                      : '#6B7280',
            }}
          >
            {msg.status}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-[14px] text-gray-100 leading-relaxed">
          {msg.body}
        </p>
        <p className="mt-1.5 text-right font-mono text-[10px] text-gray-700">
          {fmtIST(msg.created_at)}
        </p>
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
    <div className="flex items-center gap-3 text-[11px] text-gray-600">
      <span
        className="h-px flex-1"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      />
      <span
        className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        {label} · {fmtIST(event.created_at)}
      </span>
      <span
        className="h-px flex-1"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      />
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
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/leads"
          className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:text-[#D4AF37]"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to leads
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            Lead
          </p>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
            style={
              STATUS_STYLE[lead.status] ?? {
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#6B7280',
              }
            }
          >
            {lead.status.replace(/_/g, ' ')}
          </span>
        </div>
        <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">
          {lead.full_name}
        </h1>
        <p className="mt-1 text-[14px] text-gray-500">
          {project?.name ?? '—'}
          {clientName && (
            <>
              {' · '}
              <span className="text-gray-600">{clientName}</span>
            </>
          )}
          {lead.location_city && <> · {lead.location_city}</>}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: timeline (2/3) */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
              Conversation Timeline
            </h2>
            <SyncCallButton leadId={lead.id} />
          </div>

          {timeline.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl border py-20 text-center"
              style={{
                backgroundColor: 'rgba(255,255,255,0.01)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <p className="text-[15px] font-bold text-white">No activity yet.</p>
              <p className="max-w-sm text-[14px] text-gray-500 leading-relaxed">
                Calls, messages and status changes will appear here as the agent works this lead.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map((item, i) => {
                if (item.type === 'call')
                  return <CallCard key={`c-${item.data.id}-${i}`} call={item.data} />;
                if (item.type === 'message')
                  return <MessageBubble key={`m-${item.data.id}-${i}`} msg={item.data} />;
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
