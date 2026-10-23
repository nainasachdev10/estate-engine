/**
 * costsheet.ts — deterministic cost-sheet engine (the Sales Desk's "signature
 * skill"). Pure integer rupee arithmetic; no LLM anywhere near money math.
 *
 * Layout mirrors the builder-proposal format:
 *   Base cost            sqft × base rate
 *   Development & infra  sqft × dev charge
 *   Floor-rise (Nth)     sqft × (floors above start × per-floor rate)
 *   ─ TOTAL CONSIDERATION
 *   Payable at possession (separate): maintenance deposit + advance maintenance
 *   Parking / statutory notes.
 */

export interface CostSheetUnit {
  unit_number: string;
  tower: string;
  floor: number;
  config: string;
  saleable_sqft: number;
}

export interface CostSheetRateCard {
  base_rate_rupees: number;
  dev_charges_rupees: number;
  floor_rise_per_floor_rupees: number;
  floor_rise_from_floor: number;
  maintenance_deposit_rupees: number;
  advance_maintenance_rupees: number;
  advance_maintenance_years: number;
  parking_slots_included: number;
  is_demo_rate?: boolean | null;
}

export interface CostSheetLine {
  label: string;
  calc: string; // human-readable working, e.g. "3,490 × ₹9,500"
  amount_rupees: number;
}

export interface CostSheet {
  unit: CostSheetUnit;
  lines: CostSheetLine[];
  total_consideration_rupees: number;
  possession_lines: CostSheetLine[];
  parking_note: string;
  statutory_note: string;
  demo_rate: boolean;
}

/** Indian-grouped integer rupees: 33155000 → "₹ 3,31,55,000". */
export function formatINR(rupees: number): string {
  return `₹ ${Math.round(rupees).toLocaleString('en-IN')}`;
}

export function computeCostSheet(unit: CostSheetUnit, rate: CostSheetRateCard): CostSheet {
  const sqft = unit.saleable_sqft;
  const num = (v: number) => v.toLocaleString('en-IN');

  const lines: CostSheetLine[] = [
    {
      label: 'Base cost',
      calc: `${num(sqft)} × ₹${num(rate.base_rate_rupees)}${rate.is_demo_rate ? '*' : ''}`,
      amount_rupees: sqft * rate.base_rate_rupees,
    },
  ];

  if (rate.dev_charges_rupees > 0) {
    lines.push({
      label: 'Development & infra charges',
      calc: `${num(sqft)} × ₹${num(rate.dev_charges_rupees)}`,
      amount_rupees: sqft * rate.dev_charges_rupees,
    });
  }

  const floorsAbove = Math.max(0, unit.floor - rate.floor_rise_from_floor);
  const floorRiseRate = floorsAbove * rate.floor_rise_per_floor_rupees;
  if (floorRiseRate > 0) {
    lines.push({
      label: `Floor-rise (${ordinal(unit.floor)})`,
      calc: `${num(sqft)} × ₹${num(floorRiseRate)}`,
      amount_rupees: sqft * floorRiseRate,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.amount_rupees, 0);

  const possession_lines: CostSheetLine[] = [];
  if (rate.maintenance_deposit_rupees > 0) {
    possession_lines.push({
      label: 'Maintenance deposit',
      calc: `${num(sqft)} × ₹${num(rate.maintenance_deposit_rupees)}`,
      amount_rupees: sqft * rate.maintenance_deposit_rupees,
    });
  }
  if (rate.advance_maintenance_rupees > 0) {
    possession_lines.push({
      label: `${rate.advance_maintenance_years}-yr running maintenance`,
      calc: `${num(sqft)} × ₹${num(rate.advance_maintenance_rupees)}`,
      amount_rupees: sqft * rate.advance_maintenance_rupees,
    });
  }

  return {
    unit,
    lines,
    total_consideration_rupees: total,
    possession_lines,
    parking_note:
      rate.parking_slots_included > 0
        ? `Parking: ${rate.parking_slots_included} covered car park${rate.parking_slots_included > 1 ? 's' : ''} included.`
        : 'Parking as per allotment.',
    statutory_note: 'Stamp duty, registration, TDS (1%), GST at actuals.',
    demo_rate: Boolean(rate.is_demo_rate),
  };
}

/** Plain-text rendering — WhatsApp/CP-desk friendly, matches the proposal layout. */
export function renderCostSheetText(sheet: CostSheet): string {
  const width = 44;
  const row = (label: string, calc: string, amount: number) =>
    `${(label + ' ').padEnd(26, ' ')}${calc.padEnd(18, ' ')}${formatINR(amount)}`;

  const out: string[] = [
    `COST SHEET · ${sheet.unit.tower ? `TOWER ${sheet.unit.tower} · ` : ''}${ordinal(sheet.unit.floor).toUpperCase()} FLOOR · ${sheet.unit.config} (${sheet.unit.saleable_sqft.toLocaleString('en-IN')} SQ FT) · UNIT ${sheet.unit.unit_number}`,
    '',
    ...sheet.lines.map((l) => row(l.label, l.calc, l.amount_rupees)),
    '─'.repeat(width + 18),
    `${'TOTAL CONSIDERATION'.padEnd(44, ' ')}${formatINR(sheet.total_consideration_rupees)}`,
  ];
  if (sheet.possession_lines.length > 0) {
    out.push('', 'Payable at possession (separate):');
    out.push(...sheet.possession_lines.map((l) => row(l.label, l.calc, l.amount_rupees)));
  }
  out.push(sheet.parking_note, sheet.statutory_note);
  if (sheet.demo_rate) out.push('*Demonstration rate — final as per official rate card.');
  return out.join('\n');
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

// ─── Unit-query parsing (the WhatsApp cost-sheet desk) ───────────────────────
//
// Buyers and channel partners message things like:
//   "Block E, 25th floor, 4BHK"  ·  "E-2501 cost sheet"  ·  "price of 3bhk 12 floor tower B"
// Deterministic regex, like every other money-adjacent rail. A query counts
// only when it has enough structure (a unit number, or two of tower/floor/
// config) — a bare "3BHK?" stays a normal conversation for the LLM.

export interface UnitQuery {
  unitNumber?: string; // normalised "E-2501"
  tower?: string;      // single letter
  floor?: number;
  config?: string;     // "4BHK" (optional variant letter kept: "4BHK B")
}

export function parseUnitQuery(text: string): UnitQuery | null {
  const q: UnitQuery = {};

  // "E-2501" / "E 2501" / "unit E2501" — letter + 3-4 digits. The lookahead
  // keeps "4BHK B 3490 sqft" (a size, not a unit) from matching.
  const unitMatch = text.match(/\b([A-Za-z])[\s-]?(\d{3,4})\b(?!\s*(?:sq|sf))/i);
  if (unitMatch) {
    q.unitNumber = `${unitMatch[1].toUpperCase()}-${unitMatch[2]}`;
  }

  const towerMatch = text.match(/\b(?:block|tower|wing)\s*[-.]?\s*([A-Za-z])\b/i);
  if (towerMatch) q.tower = towerMatch[1].toUpperCase();

  const floorMatch = text.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:floor|flr|maal|manzil)\b/i);
  if (floorMatch) q.floor = parseInt(floorMatch[1], 10);

  const configMatch = text.match(/\b(\d)\s*BHK\s*([A-D])?\b/i);
  if (configMatch) {
    q.config = `${configMatch[1]}BHK${configMatch[2] ? ` ${configMatch[2].toUpperCase()}` : ''}`;
  }

  if (q.unitNumber) return q;
  const parts = [q.tower, q.floor !== undefined, q.config].filter(Boolean).length;
  return parts >= 2 ? q : null;
}
