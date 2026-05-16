import { getSupabaseServer } from '@realty-engine/core';
import { notFound } from 'next/navigation';
import SequenceControls from './sequence-controls';

export const dynamic = 'force-dynamic';

async function getLead(id: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('*, projects(*, clients(*))')
    .eq('id', id)
    .single();
  return data;
}

async function getTimeline(leadId: string) {
  const supabase = getSupabaseServer();
  const [{ data: calls }, { data: messages }] = await Promise.all([
    supabase.from('call_logs').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
    supabase.from('messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
  ]);
  return { calls: calls ?? [], messages: messages ?? [] };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-900 text-blue-300',
    contacted: 'bg-yellow-900 text-yellow-300',
    qualified: 'bg-green-900 text-green-300',
    site_visit_booked: 'bg-purple-900 text-purple-300',
    visited: 'bg-indigo-900 text-indigo-300',
    negotiating: 'bg-orange-900 text-orange-300',
    closed_won: 'bg-emerald-900 text-emerald-300',
    closed_lost: 'bg-red-900 text-red-300',
    unresponsive: 'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default async function LeadPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const { calls, messages } = await getTimeline(params.id);
  const project = lead.projects;
  const client = project?.clients;

  type TimelineItem =
    | { type: 'call'; data: any; ts: string }
    | { type: 'message'; data: any; ts: string };

  const timeline: TimelineItem[] = [
    ...calls.map((c: any) => ({ type: 'call' as const, data: c, ts: c.started_at ?? c.created_at })),
    ...messages.map((m: any) => ({ type: 'message' as const, data: m, ts: m.created_at })),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-serif text-3xl font-bold text-gold">{lead.full_name}</h1>
          <StatusBadge status={lead.status} />
          <span className={`text-sm font-mono ${lead.score >= 70 ? 'text-green-400' : lead.score >= 40 ? 'text-yellow-400' : 'text-gray-400'}`}>
            Score: {lead.score}
          </span>
        </div>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>{project?.name}</span>
          <span>·</span>
          <span>{lead.source}</span>
          {lead.language_pref && <><span>·</span><span>{lead.language_pref}</span></>}
          {lead.location_city && <><span>·</span><span>{lead.location_city}</span></>}
        </div>
      </div>

      {/* Sequence status */}
      {lead.sequence_name && (
        <div className="mb-6 rounded-lg border border-dark-tertiary bg-dark-secondary p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-400">Active sequence: </span>
            <span className="text-gold font-medium">{lead.sequence_name}</span>
            <span className="text-gray-400 text-sm ml-2">step {lead.sequence_step}</span>
            {lead.sequence_paused && (
              <span className="ml-2 rounded-full bg-yellow-900 text-yellow-300 px-2 py-0.5 text-xs">Paused</span>
            )}
          </div>
          <SequenceControls leadId={lead.id} paused={lead.sequence_paused} />
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Conversation Timeline</h2>

        {timeline.length === 0 && (
          <div className="rounded-lg border border-dark-tertiary p-8 text-center text-gray-400">
            No activity yet.
          </div>
        )}

        {timeline.map((item, i) => {
          if (item.type === 'call') {
            const call = item.data;
            return (
              <div key={i} className="rounded-lg border border-dark-tertiary bg-dark-secondary p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-900 text-blue-300 rounded-full px-2 py-0.5">📞 Call</span>
                    {call.outcome && (
                      <span className={`text-xs rounded-full px-2 py-0.5 ${
                        call.outcome === 'qualified' ? 'bg-green-900 text-green-300' :
                        call.outcome === 'no_answer' ? 'bg-gray-800 text-gray-400' :
                        'bg-red-900 text-red-300'
                      }`}>{call.outcome}</span>
                    )}
                    {call.sentiment && (
                      <span className="text-xs text-gray-400">{call.sentiment}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {call.started_at ? new Date(call.started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    {call.duration_seconds ? ` · ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : ''}
                  </span>
                </div>
                {call.summary && (
                  <p className="text-sm text-gray-300 mb-2">{call.summary}</p>
                )}
                {call.transcript && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gold">Show transcript</summary>
                    <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap font-mono bg-dark-bg rounded p-3 max-h-48 overflow-y-auto">
                      {call.transcript}
                    </pre>
                  </details>
                )}
              </div>
            );
          }

          const msg = item.data;
          const isIncoming = msg.direction === 'in';
          return (
            <div key={i} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-md rounded-lg p-3 ${
                isIncoming
                  ? 'bg-dark-secondary border border-dark-tertiary'
                  : 'bg-dark-tertiary'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">
                    {msg.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                    {msg.template_name ? ` · ${msg.template_name}` : ''}
                  </span>
                  <span className={`text-xs rounded-full px-1.5 ${
                    msg.status === 'read' ? 'text-green-400' :
                    msg.status === 'delivered' ? 'text-blue-400' :
                    msg.status === 'failed' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>{msg.status}</span>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.body}</p>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
