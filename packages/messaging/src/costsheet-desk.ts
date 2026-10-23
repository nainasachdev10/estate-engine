/**
 * costsheet-desk.ts — the WhatsApp cost-sheet desk (the Sales Desk's
 * signature skill, on the buyer's channel where the proposal put it).
 *
 * A buyer messages "Block E, 25th floor, 4BHK" → the exact sheet lands in
 * chat in seconds. A registered channel partner messages the same from a site
 * visit → same sheet, no calling the office. Deterministic parse, deterministic
 * math; the only rule that outranks it is penthouse = human-only.
 */

import {
  getSupabaseServer,
  logEvent,
  computeCostSheet,
  renderCostSheetText,
  createEscalation,
  type UnitQuery,
} from '@realty-engine/core';

interface UnitRow {
  id: string;
  project_id: string;
  tower: string;
  floor: number;
  unit_number: string;
  config: string;
  saleable_sqft: number;
  is_penthouse: boolean;
  status: string;
}

export interface CostSheetDeskResult {
  handled: boolean;
  reply?: string;
  penthouse?: boolean;
  unitId?: string;
  projectId?: string;
}

/** Prefer available units, then held, so the sheet quotes something sellable. */
const STATUS_RANK: Record<string, number> = { available: 0, held: 1, booked: 2, registered: 3 };

async function findUnit(projectIds: string[], q: UnitQuery): Promise<UnitRow | null> {
  if (projectIds.length === 0) return null;
  const supabase = getSupabaseServer();

  let query = supabase
    .from('project_units')
    .select('id, project_id, tower, floor, unit_number, config, saleable_sqft, is_penthouse, status')
    .in('project_id', projectIds)
    .limit(25);

  if (q.unitNumber) {
    query = query.ilike('unit_number', `%${q.unitNumber}%`);
  } else {
    if (q.tower) query = query.eq('tower', q.tower);
    if (q.floor !== undefined) query = query.eq('floor', q.floor);
    if (q.config) query = query.ilike('config', `${q.config}%`);
  }

  const { data } = await query;
  const rows = (data ?? []) as UnitRow[];
  if (rows.length === 0) return null;
  rows.sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9));
  return rows[0];
}

/**
 * Try to answer a parsed unit query with a cost sheet.
 * `leadId` attaches the escalation when a penthouse trips; CP requests pass null.
 */
export async function buildCostSheetReply(params: {
  projectIds: string[];
  query: UnitQuery;
  leadId?: string | null;
  requesterLabel: string; // 'buyer' | CP name — for the audit log only
}): Promise<CostSheetDeskResult> {
  const supabase = getSupabaseServer();
  const unit = await findUnit(params.projectIds, params.query);

  if (!unit) {
    return {
      handled: true,
      reply:
        'I could not find that exact unit. Please send it like: "Block E, 25th floor, 4BHK" or the unit number (e.g. E-2501) — I\'ll reply with the full cost sheet right away.',
    };
  }

  // Hard rule: penthouse pricing never comes from the AI. White-glove handover.
  if (unit.is_penthouse) {
    if (params.leadId) {
      await createEscalation({
        leadId: params.leadId,
        kind: 'penthouse',
        detail: `Asked for penthouse unit ${unit.unit_number} on WhatsApp`,
        brief: {
          who: params.requesterLabel,
          what_they_want: `Pricing for penthouse ${unit.unit_number}`,
          say_first: 'Senior closer only — invite for a private walkthrough; no pricing over chat.',
        },
      });
    }
    await logEvent('costsheet_desk_penthouse_held', { unitNumber: unit.unit_number }, { projectId: unit.project_id, leadId: params.leadId ?? undefined });
    return {
      handled: true,
      penthouse: true,
      reply:
        'Our penthouse collection is presented personally — our senior team will call you shortly to arrange a private walkthrough and share the details directly. 🙏',
    };
  }

  const { data: rate } = await supabase
    .from('rate_cards')
    .select('*')
    .eq('project_id', unit.project_id)
    .maybeSingle();
  if (!rate) {
    await logEvent('costsheet_desk_no_rate_card', { unitNumber: unit.unit_number }, { projectId: unit.project_id });
    return {
      handled: true,
      reply: 'Pricing for this unit is being finalised — our team will send you the exact cost sheet personally, right away.',
    };
  }

  const { data: project } = await supabase
    .from('projects').select('name').eq('id', unit.project_id).maybeSingle();

  const sheet = computeCostSheet(unit, rate);
  const text = `${project?.name ?? ''}\n${renderCostSheetText(sheet)}`.trim();

  await logEvent('costsheet_desk_sheet_sent', {
    unitNumber: unit.unit_number,
    total: sheet.total_consideration_rupees,
    requester: params.requesterLabel,
    demoRate: sheet.demo_rate,
  }, { projectId: unit.project_id, leadId: params.leadId ?? undefined });

  return { handled: true, reply: text, unitId: unit.id, projectId: unit.project_id };
}
