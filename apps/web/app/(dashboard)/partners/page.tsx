import { getSupabaseServer, formatINR } from '@realty-engine/core';
import PartnerForm from './partner-form';
import PartnerRow from './partner-row';
import { PageHeader, StatCard, Card, EmptyState } from '../../components/ui';

export const dynamic = 'force-dynamic';

interface CP {
  id: string; name: string; firm_name: string | null; cp_code: string;
  status: 'active' | 'inactive'; clients: { name: string; brand_name: string | null } | { name: string; brand_name: string | null }[] | null;
}

export default async function PartnersPage() {
  const supabase = getSupabaseServer();

  const [{ data: partners }, { data: cpLeads }, { data: cpBookings }, { data: clients }, { data: firstProject }] =
    await Promise.all([
      supabase.from('channel_partners')
        .select('id, name, firm_name, cp_code, status, clients(name, brand_name)')
        .order('created_at', { ascending: false }),
      supabase.from('leads')
        .select('channel_partner_id, status')
        .not('channel_partner_id', 'is', null),
      supabase.from('bookings')
        .select('channel_partner_id, agreement_value_rupees')
        .eq('status', 'active')
        .not('channel_partner_id', 'is', null),
      supabase.from('clients').select('id, name, brand_name').eq('status', 'active'),
      supabase.from('projects').select('public_slug').not('public_slug', 'is', null).limit(1).maybeSingle(),
    ]);

  // Leaderboard: leads, site visits, bookings + value per CP — computed from
  // the locked attribution, so there is exactly one answer per booking.
  const stats = new Map<string, { leads: number; visits: number; bookings: number; value: number }>();
  const visitStatuses = new Set(['site_visit_booked', 'visited', 'negotiating', 'closed_won']);
  for (const l of (cpLeads ?? []) as Array<{ channel_partner_id: string; status: string }>) {
    const s = stats.get(l.channel_partner_id) ?? { leads: 0, visits: 0, bookings: 0, value: 0 };
    s.leads++;
    if (visitStatuses.has(l.status)) s.visits++;
    stats.set(l.channel_partner_id, s);
  }
  for (const b of (cpBookings ?? []) as Array<{ channel_partner_id: string; agreement_value_rupees: number }>) {
    const s = stats.get(b.channel_partner_id) ?? { leads: 0, visits: 0, bookings: 0, value: 0 };
    s.bookings++;
    s.value += b.agreement_value_rupees;
    stats.set(b.channel_partner_id, s);
  }

  const list = ((partners ?? []) as CP[]).map((p) => ({
    ...p,
    stats: stats.get(p.id) ?? { leads: 0, visits: 0, bookings: 0, value: 0 },
  })).sort((a, b) => b.stats.bookings - a.stats.bookings || b.stats.visits - a.stats.visits || b.stats.leads - a.stats.leads);

  const totalCpLeads = (cpLeads ?? []).length;
  const totalCpBookings = (cpBookings ?? []).length;
  const totalCpValue = ((cpBookings ?? []) as Array<{ agreement_value_rupees: number }>).reduce((s, b) => s + b.agreement_value_rupees, 0);
  const landingSlug = (firstProject as { public_slug: string } | null)?.public_slug ?? null;

  return (
    <div className="p-6 md:p-8">
      <PageHeader eyebrow="Sell · Partners" title="Attribution Ledger & Leaderboard"
        subtitle='Every lead is timestamped to its source the second it arrives — CP locked permanently. One answer to "whose lead was this?" Partners can also message any unit on WhatsApp for an instant cost sheet.' />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Partners" value={String(list.length)} />
        <StatCard label="CP-Attributed Leads" value={String(totalCpLeads)} accent />
        <StatCard label="CP Bookings" value={String(totalCpBookings)} />
        <StatCard label="CP Booking Value" value={totalCpValue > 0 ? formatINR(totalCpValue) : '—'} accent />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <PartnerForm clients={(clients ?? []) as any} />

        <Card title="Leaderboard" hint="Best partners get recognised; passengers become visible.">
          {list.length === 0 ? (
            <EmptyState title="No partners yet"
              body="Register the first channel partner on the left — they get a permanent share code, and every lead through their link is theirs forever." />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
                    <th className="pb-2 pr-3">#</th><th className="pb-2 pr-3">Partner</th>
                    <th className="pb-2 pr-3">Share Link / Code</th>
                    <th className="pb-2 pr-3 text-right">Leads</th><th className="pb-2 pr-3 text-right">Visits</th>
                    <th className="pb-2 pr-3 text-right">Bookings</th><th className="pb-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p, i) => (
                    <PartnerRow key={p.id} rank={i + 1} partner={p as any} stats={p.stats} landingSlug={landingSlug} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
