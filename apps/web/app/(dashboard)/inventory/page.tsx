import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';
import RateCardForm from './rate-card-form';
import UnitsPanel from './units-panel';
import BookingsPanel from './bookings-panel';
import { PageHeader, StatCard, EmptyState } from '../../components/ui';

export const dynamic = 'force-dynamic';

interface ProjectLite { id: string; name: string }

export default async function InventoryPage({ searchParams }: {
  searchParams: { project?: string; book_lead?: string; book_buyer?: string };
}) {
  const supabase = getSupabaseServer();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false });
  const projectList = (projects ?? []) as ProjectLite[];
  const projectId = searchParams.project ?? projectList[0]?.id ?? null;

  const [{ data: units }, { data: rateCard }, { data: bookings }] = projectId
    ? await Promise.all([
        supabase.from('project_units')
          .select('id, tower, floor, unit_number, config, saleable_sqft, is_penthouse, status')
          .eq('project_id', projectId)
          .order('tower').order('floor', { ascending: false }),
        supabase.from('rate_cards').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('bookings')
          .select('id, buyer_name, agreement_value_rupees, booking_date, project_units(unit_number), channel_partners(name)')
          .eq('project_id', projectId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50),
      ])
    : [{ data: [] }, { data: null }, { data: [] }];

  // Deep-linked from a closed-won lead → auto-open the booking form.
  const bookingPrefill = searchParams.book_lead
    ? { leadId: searchParams.book_lead, buyerName: searchParams.book_buyer ?? '' }
    : null;

  const unitList = units ?? [];
  const available = unitList.filter((u: any) => u.status === 'available').length;
  const booked = unitList.filter((u: any) => u.status === 'booked' || u.status === 'registered').length;

  return (
    <div className="p-6 md:p-8">
      <PageHeader eyebrow="Sell · Inventory" title="Inventory & Cost Sheets"
        subtitle="Unit matrix, rate card, and the 10-second cost-sheet engine — exact math, zero errors. Buyers and channel partners can also request any unit's sheet directly on WhatsApp." />

      {/* Project tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3"
        style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Project</span>
        {projectList.map((p) => {
          const isActive = p.id === projectId;
          return (
            <Link key={p.id} href={`/inventory?project=${p.id}`}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors ${isActive ? '' : 'text-gray-400 hover:text-white'}`}
              style={isActive
                ? { backgroundColor: '#D4AF37', color: '#000' }
                : { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {p.name}
            </Link>
          );
        })}
      </div>

      {!projectId ? (
        <EmptyState title="No projects yet"
          body="Create a project first, then load its unit matrix and rate card here — that's what powers instant cost sheets."
          ctaHref="/projects/new" ctaLabel="Create a project" />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Units" value={String(unitList.length)} accent />
            <StatCard label="Available" value={String(available)} />
            <StatCard label="Booked / Registered" value={String(booked)} accent />
            <StatCard label="Rate Card" value={rateCard ? (rateCard.is_demo_rate ? 'Demo rate' : 'Official') : 'Missing'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <RateCardForm projectId={projectId} rateCard={rateCard} />
            <UnitsPanel projectId={projectId} units={unitList as any} hasRateCard={Boolean(rateCard)} />
          </div>

          <div className="mt-6">
            <BookingsPanel projectId={projectId} bookings={(bookings ?? []) as any} prefill={bookingPrefill} />
          </div>
        </>
      )}
    </div>
  );
}
