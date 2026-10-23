/**
 * smoke-tests.ts — framework-free unit checks for the pure logic that guards
 * money, compliance, and scoring. Run with:  npx tsx scripts/smoke-tests.ts
 * Exits non-zero on any failure (safe to wire into CI later).
 */

import { computeLeadScore } from '../packages/core/src/scoring';
import { normalizePhoneNumber, maskPhoneNumber } from '../packages/core/src/phone';
import { maskPII } from '../packages/core/src/logger';
import { isQuietHoursIST, formatPriceRange, makeSlug } from '../packages/core/src/shared';
import { computeCostSheet, formatINR, renderCostSheetText, parseUnitQuery } from '../packages/core/src/costsheet';
import { detectEscalation } from '../packages/core/src/escalation';
import { stampRera } from '../packages/content/src/rera';
import { isOptOutMessage } from '../packages/messaging/src/aisensy';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── Phone normalization ───────────────────────────────────────────────────────
console.log('normalizePhoneNumber');
check('10-digit', normalizePhoneNumber('9876543210') === '+919876543210');
check('leading 0', normalizePhoneNumber('09876543210') === '+919876543210');
check('91-prefixed', normalizePhoneNumber('919876543210') === '+919876543210');
check('+91 spaced', normalizePhoneNumber('+91 98765 43210') === '+919876543210');
check('0091 form', normalizePhoneNumber('0091 9876543210') === '+919876543210');
check('91 + trunk 0', normalizePhoneNumber('91 09876543210') === '+919876543210');
check('rejects landline-ish', (() => { try { normalizePhoneNumber('1234567890'); return false; } catch { return true; } })());
check('rejects short', (() => { try { normalizePhoneNumber('12345'); return false; } catch { return true; } })());
check('mask format', maskPhoneNumber('+919876543210') === '+91****3210');

// ── Opt-out detection (compliance-critical) ──────────────────────────────────
console.log('isOptOutMessage');
for (const msg of ['STOP', 'stop.', 'please stop messaging', 'Unsubscribe', 'opt out', "don't call me", 'band karo yaar', 'mat bhejo', 'message mat karo', 'remove me from this list', 'stop calling me please']) {
  check(`detects "${msg}"`, isOptOutMessage(msg));
}
for (const msg of ['tell me the price', 'can we stop by the site on Sunday?', 'we can stop at the office first', 'interested, send brochure', 'kya band flat available hai']) {
  check(`allows "${msg}"`, !isOptOutMessage(msg));
}

// ── Policy-skip classification (sequence resilience) ─────────────────────────
console.log('policy-skip errors');
const policySkip = (m: string) => /quiet hours|rate limit|outside 24hr|messaging (is )?disabled|opted out/i.test(m);
for (const m of ['Quiet hours', 'Daily rate limit reached', 'Outside 24hr window', 'Messaging is disabled', 'Messaging disabled', 'Lead opted out']) {
  check(`skips on "${m}"`, policySkip(m));
}
check('retries real failures', !policySkip('AiSensy error: 500 internal'));

// ── Buying score ──────────────────────────────────────────────────────────────
console.log('computeLeadScore');
const now = new Date();
const d = (days: number) => new Date(now.getTime() - days * 864e5);
const hot = computeLeadScore({
  status: 'qualified', createdAt: d(2),
  calls: [{ outcome: 'qualified', sentiment: 'positive', transcript: 'y', createdAt: d(1) }],
  messages: [{ channel: 'whatsapp', direction: 'in', status: 'replied', createdAt: d(0.5) }],
  triggers: [{ confidence: 80, createdAt: d(1) }],
}, now);
check('engaged qualified lead is hot', hot.horizon === 'hot' && hot.score >= 70, `got ${hot.score}/${hot.horizon}`);
const stale = computeLeadScore({
  status: 'qualified', createdAt: d(45),
  calls: [{ outcome: 'qualified', sentiment: 'positive', transcript: 'y', createdAt: d(40) }],
  messages: [], triggers: [],
}, now);
check('stale lead decays below fresh', stale.score < hot.score, `${stale.score} vs ${hot.score}`);
check('stale lead not hot', stale.horizon !== 'hot');
const fresh = computeLeadScore({ status: 'new', createdAt: d(0.1), calls: [], messages: [], triggers: [] }, now);
check('new lead is cool + zero confidence', fresh.horizon === 'cool' && fresh.confidence === 0);
const visit = computeLeadScore({ status: 'site_visit_booked', createdAt: d(3), calls: [], messages: [], triggers: [] }, now);
check('visit booked forces hot', visit.horizon === 'hot');
check('score capped at 100', hot.score <= 100 && hot.breakdown.every((b) => b.points <= b.max));

// ── PII masking ───────────────────────────────────────────────────────────────
console.log('maskPII');
const masked = maskPII({
  to: 'buyer@example.com',
  hotLeads: [{ phone_e164: '+919876543210', full_name: 'A' }],
  nested: { email: 'x@y.com' },
  keep: 'value',
});
check('masks email in "to"', masked.to === 'bu***@***');
check('masks nested phone', masked.hotLeads[0].phone_e164 === '+91****3210');
check('masks nested email', masked.nested.email === 'x***@***');
check('leaves non-PII intact', masked.keep === 'value');

// ── Shared helpers ────────────────────────────────────────────────────────────
console.log('shared helpers');
check('quiet at 2am IST', isQuietHoursIST(new Date('2026-07-07T20:30:00Z'))); // 02:00 IST
check('open at noon IST', !isQuietHoursIST(new Date('2026-07-07T06:30:00Z'))); // 12:00 IST
check('quiet at 21:00 IST', isQuietHoursIST(new Date('2026-07-07T15:30:00Z')));
check('open at 09:00 IST', !isQuietHoursIST(new Date('2026-07-07T03:30:00Z')));
check('price range Cr', formatPriceRange(15_000_000, 25_000_000) === '₹1.5 Cr to ₹2.5 Cr');
check('price range Lac', formatPriceRange(8_500_000, null) === 'starting ₹85 Lac');
check('price on request', formatPriceRange(null, null) === 'price on request');
check('slug basics', makeSlug('Orchid  Heights — Phase 2!') === 'orchid-heights-phase-2');

// ── Cost-sheet engine (money math — must match the proposal's §04 sample) ────
console.log('computeCostSheet');
// Evara sample: Block E · 25th floor · 4BHK B (3,490 sq ft) @ ₹9,500 demo rate
const sheet = computeCostSheet(
  { unit_number: 'E-2501', tower: 'E', floor: 25, config: '4BHK B', saleable_sqft: 3490 },
  {
    base_rate_rupees: 9500, dev_charges_rupees: 700,
    floor_rise_per_floor_rupees: 14, floor_rise_from_floor: 0,
    maintenance_deposit_rupees: 100, advance_maintenance_rupees: 85,
    advance_maintenance_years: 2, parking_slots_included: 3, is_demo_rate: true,
  },
);
check('base cost 3,31,55,000', sheet.lines[0].amount_rupees === 3_31_55_000 /* 33155000 */, String(sheet.lines[0].amount_rupees));
check('dev charges 24,43,000', sheet.lines[1].amount_rupees === 24_43_000, String(sheet.lines[1].amount_rupees));
check('floor-rise 25×14=350/sqft → 12,21,500', sheet.lines[2].amount_rupees === 12_21_500, String(sheet.lines[2].amount_rupees));
check('total 3,68,19,500', sheet.total_consideration_rupees === 3_68_19_500, String(sheet.total_consideration_rupees));
check('maintenance deposit 3,49,000', sheet.possession_lines[0].amount_rupees === 3_49_000);
check('2-yr maintenance 2,96,650', sheet.possession_lines[1].amount_rupees === 2_96_650);
check('demo-rate disclaimer present', renderCostSheetText(sheet).includes('Demonstration rate'));
check('INR grouping', formatINR(33155000) === '₹ 3,31,55,000');
const groundFloor = computeCostSheet(
  { unit_number: 'A-001', tower: 'A', floor: 0, config: '3BHK', saleable_sqft: 2000 },
  { base_rate_rupees: 9500, dev_charges_rupees: 0, floor_rise_per_floor_rupees: 14, floor_rise_from_floor: 0, maintenance_deposit_rupees: 0, advance_maintenance_rupees: 0, advance_maintenance_years: 2, parking_slots_included: 0 },
);
check('ground floor: no floor-rise line', groundFloor.lines.length === 1);

// ── Unit-query parser (the WhatsApp cost-sheet desk) ─────────────────────────
console.log('parseUnitQuery');
const q1 = parseUnitQuery('Block E, 25th floor, 4BHK');
check('doc demo query parses', q1?.tower === 'E' && q1?.floor === 25 && q1?.config === '4BHK', JSON.stringify(q1));
const q2 = parseUnitQuery('cost sheet for E-2501 please');
check('unit number parses', q2?.unitNumber === 'E-2501', JSON.stringify(q2));
const q3 = parseUnitQuery('price of 3bhk on 12 floor tower B?');
check('lowercase + reordered parses', q3?.tower === 'B' && q3?.floor === 12 && q3?.config === '3BHK', JSON.stringify(q3));
check('bare "3BHK?" is NOT a unit query', parseUnitQuery('3BHK available?') === null);
check('greeting is not a unit query', parseUnitQuery('Hello, interested in your project') === null);
check('sqft size does not fake a unit number', parseUnitQuery('4BHK B 3490 sqft details')?.unitNumber === undefined);
const q4 = parseUnitQuery('unit E 2501');
check('spaced unit number parses', q4?.unitNumber === 'E-2501', JSON.stringify(q4));

// ── Escalation rail (hard rules) ──────────────────────────────────────────────
console.log('detectEscalation');
check('discount (en)', detectEscalation('Can I get a discount on this?') === 'discount');
check('best price', detectEscalation('what is your best price for 3bhk') === 'discount');
check('hinglish kam karo', detectEscalation('bhaiya kuch kam karo price') === 'discount');
check('complaint beats discount', detectEscalation('I want a refund, this is fraud, give discount') === 'complaint');
check('penthouse', detectEscalation('interested in the duplex penthouse') === 'penthouse');
check('normal question passes', detectEscalation('what is the carpet area of 3BHK?') === null);
check('visit request passes', detectEscalation('can we stop by the site on Sunday?') === null);

// ── RERA stamp (every ad carries the registration) ────────────────────────────
console.log('stampRera');
check('appends when missing', stampRera('Luxury 3BHK on SG Highway', 'PR/GJ/2026/1234') === 'Luxury 3BHK on SG Highway\nRERA: PR/GJ/2026/1234');
check('no double stamp', stampRera('Great flats. RERA: PR/GJ/2026/1234', 'PR/GJ/2026/1234') === 'Great flats. RERA: PR/GJ/2026/1234');
check('no rera → unchanged', stampRera('text', null) === 'text');
check('null text stays null', stampRera(null, 'X') === null);

// ── Result ────────────────────────────────────────────────────────────────────
console.log(failures === 0 ? '\nAll smoke tests passed.' : `\n${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);
