'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  name: string;
  brand_name: string | null;
  slug: string | null;
  contact_email: string | null;
}

function makeSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

const INPUT = 'w-full rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-gold/40 focus:outline-none';
const LABEL = 'mb-1 block text-xs font-medium text-gray-400';
const SECTION = 'rounded-lg border border-dark-tertiary bg-dark-secondary p-6';
const SECTION_TITLE = 'mb-4 text-xs font-semibold uppercase tracking-widest text-gold';

export default function CreateProjectClient({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [segment, setSegment] = useState<string>('luxury');
  const [unitType, setUnitType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [rera, setRera] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [brochureUrl, setBrochureUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [usp1, setUsp1] = useState('');
  const [usp2, setUsp2] = useState('');
  const [usp3, setUsp3] = useState('');
  const [about, setAbout] = useState('');
  const [amenities, setAmenities] = useState('');
  const [status, setStatus] = useState<'active' | 'draft'>('active');

  useEffect(() => {
    if (!slugEdited) setSlug(makeSlug(name));
  }, [name, slugEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          name,
          location: location || undefined,
          segment: segment || undefined,
          unit_type: unitType || undefined,
          price_min_lakhs: priceMin ? parseFloat(priceMin) : undefined,
          price_max_lakhs: priceMax ? parseFloat(priceMax) : undefined,
          rera_number: rera || undefined,
          public_slug: slug || undefined,
          brochure_url: brochureUrl || undefined,
          hero_image_url: heroUrl || undefined,
          usp_bullets: [usp1, usp2, usp3].filter(Boolean),
          developer_about: about || undefined,
          amenities: amenities
            ? amenities.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to create project');
        return;
      }
      router.push('/projects');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-gray-500 hover:text-white"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">New Project</h1>
          <p className="mt-0.5 text-sm text-gray-400">Fill in the details to set up the full pipeline.</p>
        </div>
      </div>

      {/* ── Client & Basics ── */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Client &amp; Basic Info</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={LABEL}>Client *</label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={INPUT}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand_name ?? c.name}{c.slug ? ` — portal: /portal/${c.slug}` : ''}
                </option>
              ))}
            </select>
            {clientId && (() => {
              const sel = clients.find((c) => c.id === clientId);
              return sel?.slug ? (
                <p className="mt-1 text-[10px] text-gold">
                  Portal: <a href={`/portal/${sel.slug}`} target="_blank" rel="noreferrer" className="underline">/portal/{sel.slug}</a>
                  {sel.contact_email ? ` · ${sel.contact_email}` : ''}
                </p>
              ) : null;
            })()}
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Project Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emerald Heights Phase II" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Whitefield, Bengaluru" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Segment</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)} className={INPUT}>
              <option value="luxury">Luxury</option>
              <option value="premium">Premium</option>
              <option value="mid">Mid</option>
              <option value="affordable">Affordable</option>
              <option value="plot">Plot / Land</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Unit Type</label>
            <input value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="e.g. 3 &amp; 4 BHK Apartments" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'draft')} className={INPUT}>
              <option value="active">Active (live)</option>
              <option value="draft">Draft (hidden)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Pricing &amp; RERA</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={LABEL}>Min Price (₹ Lakhs)</label>
            <input type="number" min="0" step="0.5" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="e.g. 85" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Max Price (₹ Lakhs)</label>
            <input type="number" min="0" step="0.5" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="e.g. 150" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>RERA Number</label>
            <input value={rera} onChange={(e) => setRera(e.target.value)} placeholder="PRM/KA/RERA/…" className={INPUT} />
          </div>
        </div>
      </div>

      {/* ── Landing Page ── */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Landing Page</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Public URL slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{appUrl}/p/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(makeSlug(e.target.value)); setSlugEdited(true); }}
                placeholder="emerald-heights"
                className={`${INPUT} flex-1`}
              />
            </div>
            {slug && (
              <p className="mt-1 font-mono text-[10px] text-gold">{appUrl}/p/{slug}</p>
            )}
          </div>
          <div>
            <label className={LABEL}>Hero Image URL</label>
            <input value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)} placeholder="https://…" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Brochure PDF URL</label>
            <input value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} placeholder="https://…/brochure.pdf" className={INPUT} />
          </div>
          <div className="grid gap-3">
            <label className={LABEL}>Key Selling Points (USPs)</label>
            <input value={usp1} onChange={(e) => setUsp1(e.target.value)} placeholder="USP 1 — e.g. 2-acre rooftop sky garden" className={INPUT} />
            <input value={usp2} onChange={(e) => setUsp2(e.target.value)} placeholder="USP 2 — e.g. 500m from metro station" className={INPUT} />
            <input value={usp3} onChange={(e) => setUsp3(e.target.value)} placeholder="USP 3 — e.g. IGBC Gold certified green building" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>About the Developer / Project</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              placeholder="A short paragraph describing the developer and project vision…"
              className={`${INPUT} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* ── Amenities ── */}
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Amenities</p>
        <label className={LABEL}>List amenities, comma-separated</label>
        <textarea
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          rows={3}
          placeholder="Infinity Pool, Clubhouse, Gym, Co-working Lounge, Children's Play Area, EV Charging"
          className={`${INPUT} resize-none`}
        />
        <p className="mt-1.5 text-[10px] text-gray-600">These appear on the landing page and are used by the voice agent script.</p>
      </div>

      {error && (
        <p className="rounded border border-red-500/30 bg-red-900/20 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-dark-tertiary px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name || !clientId}
          className="rounded-md bg-gold px-6 py-2 text-sm font-semibold text-black transition hover:bg-[#c9a137] disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}
