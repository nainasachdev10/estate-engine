/**
 * scoring.ts — Predictive Buying Score.
 *
 * Replaces the single opaque 0–100 with a transparent weighted blend the
 * operator (and client) can interrogate. Every component ships with its
 * points, max, and a one-line note; the blend also carries a confidence %
 * reflecting how much verified evidence backs it (a 70 on complete data is
 * more actionable than an 85 on thin data).
 *
 * Pure computation lives in computeLeadScore(); rescoreLead() fetches the
 * lead bundle and persists score, breakdown, confidence and horizon.
 */

import { getSupabaseServer } from './db';
import { logEvent } from './logger';

export interface ScoreComponent {
  component: string;
  points: number;
  max: number;
  note: string;
}

export interface ScoreResult {
  score: number;            // 0–100
  confidence: number;       // 0–100 — data completeness
  horizon: 'hot' | 'warm' | 'cool';
  breakdown: ScoreComponent[];
}

export interface LeadScoringBundle {
  status: string;
  createdAt: Date;
  calls: Array<{
    outcome: string | null;
    sentiment: string | null;
    transcript: string | null;
    createdAt: Date;
  }>;
  messages: Array<{
    channel: string;
    direction: string;
    status: string;
    createdAt: Date;
  }>;
  triggers: Array<{ confidence: number | null; createdAt: Date }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(d: Date, now: Date): number {
  return (now.getTime() - d.getTime()) / DAY_MS;
}

export function computeLeadScore(bundle: LeadScoringBundle, now = new Date()): ScoreResult {
  const breakdown: ScoreComponent[] = [];

  // ── Call outcome & sentiment (max 30) ─────────────────────────────────────
  const bestCall = bundle.calls.reduce<{ points: number; note: string }>(
    (best, c) => {
      let pts = 0;
      switch (c.outcome) {
        case 'qualified': pts = 26; break;
        case 'callback': pts = 16; break;
        case 'no_answer': pts = 3; break;
        case 'not_qualified':
        case 'wrong_number': pts = 0; break;
        default: pts = c.transcript ? 6 : 0;
      }
      if (pts > 0 && c.sentiment === 'positive') pts += 4;
      return pts > best.points ? { points: pts, note: `${c.outcome ?? 'call held'}${c.sentiment === 'positive' ? ', positive' : ''}` } : best;
    },
    { points: 0, note: bundle.calls.length ? 'no strong call outcome' : 'no call yet' },
  );
  breakdown.push({ component: 'Call outcome', points: Math.min(bestCall.points, 30), max: 30, note: bestCall.note });

  // ── Site-visit intent (max 20) ────────────────────────────────────────────
  let visitPts = 0;
  let visitNote = 'no visit intent yet';
  if (['site_visit_booked', 'visited', 'negotiating'].includes(bundle.status)) {
    visitPts = 20;
    visitNote = bundle.status.replace(/_/g, ' ');
  } else if (bundle.status === 'qualified') {
    visitPts = 8;
    visitNote = 'qualified, visit not booked';
  }
  breakdown.push({ component: 'Site-visit intent', points: visitPts, max: 20, note: visitNote });

  // ── WhatsApp engagement (max 15) ──────────────────────────────────────────
  const waReplies = bundle.messages.filter((m) => m.channel === 'whatsapp' && m.direction === 'in').length;
  const waPts = waReplies >= 2 ? 15 : waReplies === 1 ? 10 : 0;
  breakdown.push({ component: 'WhatsApp engagement', points: waPts, max: 15, note: waReplies ? `${waReplies} repl${waReplies > 1 ? 'ies' : 'y'}` : 'no replies' });

  // ── Email engagement (max 10) ─────────────────────────────────────────────
  const emailOut = bundle.messages.filter((m) => m.channel === 'email' && m.direction === 'out');
  const opened = emailOut.some((m) => m.status === 'read' || m.status === 'replied');
  const delivered = emailOut.some((m) => m.status === 'delivered');
  const emailPts = opened ? 10 : delivered ? 3 : 0;
  breakdown.push({ component: 'Email engagement', points: emailPts, max: 10, note: opened ? 'opened/clicked' : delivered ? 'delivered' : 'no engagement' });

  // ── Why-now trigger strength (max 15) ─────────────────────────────────────
  const bestTrigger = bundle.triggers.reduce((best, t) => Math.max(best, t.confidence ?? 0), 0);
  const trigPts = bestTrigger >= 70 ? 15 : bestTrigger >= 40 ? 10 : bundle.triggers.length > 0 ? 5 : 0;
  breakdown.push({ component: 'Why-now trigger', points: trigPts, max: 15, note: bundle.triggers.length ? `strongest trigger ${bestTrigger}%` : 'no trigger detected' });

  // ── Recency (max 10) — scores must fall when a lead goes quiet ────────────
  const activityDates = [
    ...bundle.calls.map((c) => c.createdAt),
    ...bundle.messages.filter((m) => m.direction === 'in').map((m) => m.createdAt),
    ...bundle.triggers.map((t) => t.createdAt),
    bundle.createdAt,
  ];
  const freshestDays = Math.min(...activityDates.map((d) => daysAgo(d, now)));
  const recencyPts = freshestDays <= 3 ? 10 : freshestDays <= 7 ? 7 : freshestDays <= 14 ? 4 : freshestDays <= 30 ? 2 : 0;
  breakdown.push({ component: 'Recency', points: recencyPts, max: 10, note: `last activity ${Math.round(freshestDays)}d ago` });

  const score = Math.min(100, breakdown.reduce((s, c) => s + c.points, 0));

  // ── Confidence: how much evidence backs the score ─────────────────────────
  let confidence = 0;
  if (bundle.calls.some((c) => c.transcript)) confidence += 30;
  if (bundle.messages.some((m) => m.direction === 'in')) confidence += 20;
  if (emailOut.length > 0) confidence += 15;
  if (bundle.triggers.length > 0) confidence += 20;
  if (bundle.status !== 'new') confidence += 15;

  // ── Horizon band ──────────────────────────────────────────────────────────
  let horizon: ScoreResult['horizon'];
  if ((score >= 70 && freshestDays <= 14) || ['site_visit_booked', 'visited', 'negotiating'].includes(bundle.status)) {
    horizon = 'hot';
  } else if (score >= 40) {
    horizon = 'warm';
  } else {
    horizon = 'cool';
  }

  return { score, confidence, horizon, breakdown };
}

/** Statuses whose score no longer matters — the nightly loop skips them. */
export const CLOSED_STATUSES = ['closed_won', 'closed_lost', 'unresponsive'];

/**
 * Fetches everything the score needs, computes it, persists it.
 * Returns the result plus the previous score so callers can detect movers.
 */
export async function rescoreLead(leadId: string): Promise<(ScoreResult & { previousScore: number }) | null> {
  const supabase = getSupabaseServer();

  const [{ data: lead }, { data: calls }, { data: messages }, { data: triggers }] = await Promise.all([
    supabase.from('leads').select('id, status, score, created_at').eq('id', leadId).single(),
    supabase.from('call_logs').select('outcome, sentiment, transcript, created_at').eq('lead_id', leadId),
    supabase.from('messages').select('channel, direction, status, created_at').eq('lead_id', leadId),
    supabase.from('lead_triggers').select('confidence, created_at').eq('lead_id', leadId),
  ]);

  if (!lead) return null;

  const result = computeLeadScore({
    status: lead.status,
    createdAt: new Date(lead.created_at),
    calls: (calls ?? []).map((c: any) => ({ ...c, createdAt: new Date(c.created_at) })),
    messages: (messages ?? []).map((m: any) => ({ ...m, createdAt: new Date(m.created_at) })),
    triggers: (triggers ?? []).map((t: any) => ({ confidence: t.confidence, createdAt: new Date(t.created_at) })),
  });

  const { error } = await supabase
    .from('leads')
    .update({
      score: result.score,
      score_breakdown: result.breakdown,
      score_confidence: result.confidence,
      horizon: result.horizon,
    })
    .eq('id', leadId);

  if (error) {
    await logEvent('rescore_failed', { leadId, error: error.message }, { leadId });
    return null;
  }

  return { ...result, previousScore: lead.score ?? 0 };
}

/** Adds a "why now" trigger record; ignores empty triggers. */
export async function addLeadTrigger(params: {
  leadId: string;
  trigger: string | null | undefined;
  evidence?: string | null;
  confidence?: number | null;
  source: 'call' | 'whatsapp' | 'email' | 'visit_form' | 'lead_form' | 'manual' | 'system';
}): Promise<void> {
  if (!params.trigger || !params.trigger.trim()) return;
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('lead_triggers').insert([{
    lead_id: params.leadId,
    trigger: params.trigger.trim().slice(0, 300),
    evidence: params.evidence?.trim().slice(0, 500) || null,
    confidence: params.confidence != null ? Math.max(0, Math.min(100, Math.round(params.confidence))) : null,
    source: params.source,
  }]);
  if (error) {
    await logEvent('lead_trigger_insert_failed', { leadId: params.leadId, error: error.message }, { leadId: params.leadId });
  }
}
