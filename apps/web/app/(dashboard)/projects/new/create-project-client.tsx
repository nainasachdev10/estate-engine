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

const INPUT = 'w-full rounded-xl border px-4 py-2.5 text-[14px] text-white placeholder:text-gray-700 focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors';
const INPUT_STYLE = { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' } as const;
const LABEL = 'mb-1.5 block text-[12px] font-semibold text-gray-400';

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
  const [totalUnits, setTotalUnits] = useState('');
  const [availableUnits, setAvailableUnits] = useState('');
  const [possessionDate, setPossessionDate] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteContactName, setSiteContactName] = useState('');
  const [siteContactPhone, setSiteContactPhone] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [buyerProfile, setBuyerProfile] = useState('');

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
          total_units: totalUnits ? parseInt(totalUnits) : undefined,
          available_units: availableUnits ? parseInt(availableUnits) : undefined,
          possession_date: possessionDate || undefined,
          site_address: siteAddress || undefined,
          site_contact_name: siteContactName || undefined,
          site_contact_phone: siteContactPhone || undefined,
          video_url: videoUrl || undefined,
          buyer_profile: buyerProfile || undefined,
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

  const sectionStyle = { backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' } as const;

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:text-[#D4AF37]"
            >
              ← Back
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>New Project</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">Create a Project</h1>
            <p className="mt-1 text-[14px] text-gray-500">Fill in the details to set up the full pipeline.</p>
          </div>
        </div>

        {/* ── Client & Basics ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Client &amp; Basic Info
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={LABEL}>Client *</label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={INPUT}
                style={INPUT_STYLE}
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
                  <p className="mt-2 text-[11px]" style={{ color: '#D4AF37' }}>
                    Portal: <a href={`/portal/${sel.slug}`} target="_blank" rel="noreferrer" className="underline">/portal/{sel.slug}</a>
                    {sel.contact_email ? ` · ${sel.contact_email}` : ''}
                  </p>
                ) : null;
              })()}
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Project Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emerald Heights Phase II" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Whitefield, Bengaluru" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Segment</label>
              <select value={segment} onChange={(e) => setSegment(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                <option value="luxury">Luxury</option>
                <option value="premium">Premium</option>
                <option value="mid">Mid</option>
                <option value="affordable">Affordable</option>
                <option value="plot">Plot / Land</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Unit Type</label>
              <input value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="e.g. 3 &amp; 4 BHK Apartments" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'draft')} className={INPUT} style={INPUT_STYLE}>
                <option value="active">Active (live)</option>
                <option value="draft">Draft (hidden)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Pricing &amp; RERA
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={LABEL}>Min Price (₹ Lakhs)</label>
              <input type="number" min="0" step="0.5" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="e.g. 85" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Max Price (₹ Lakhs)</label>
              <input type="number" min="0" step="0.5" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="e.g. 150" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>RERA Number</label>
              <input value={rera} onChange={(e) => setRera(e.target.value)} placeholder="PRM/KA/RERA/…" className={INPUT} style={INPUT_STYLE} />
            </div>
          </div>
        </div>

        {/* ── Inventory & Timeline ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Inventory &amp; Timeline
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={LABEL}>Total Units</label>
              <input type="number" min="1" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="e.g. 240" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Available Units</label>
              <input type="number" min="0" value={availableUnits} onChange={(e) => setAvailableUnits(e.target.value)}
                placeholder="e.g. 68" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Possession Date</label>
              <input type="date" value={possessionDate} onChange={(e) => setPossessionDate(e.target.value)}
                className={INPUT} style={INPUT_STYLE} />
            </div>
          </div>
        </div>

        {/* ── Site Visit Setup ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Site Visit Setup
          </p>
          <div className="space-y-5">
            <div>
              <label className={LABEL}>Site Address (for visit reminders)</label>
              <textarea value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} rows={2}
                placeholder="Full site address with landmark — used in WhatsApp reminders to leads"
                className={`${INPUT} resize-none`} style={INPUT_STYLE} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={LABEL}>Sales Contact Name</label>
                <input value={siteContactName} onChange={(e) => setSiteContactName(e.target.value)}
                  placeholder="Person leads should ask for at site" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div>
                <label className={LABEL}>Sales Contact Phone</label>
                <input value={siteContactPhone} onChange={(e) => setSiteContactPhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Landing Page ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Landing Page
          </p>
          <div className="space-y-5">
            <div>
              <label className={LABEL}>Public URL slug</label>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-600">{appUrl}/p/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(makeSlug(e.target.value)); setSlugEdited(true); }}
                  placeholder="emerald-heights"
                  className={`${INPUT} flex-1`}
                  style={INPUT_STYLE}
                />
              </div>
              {slug && (
                <p className="mt-2 font-mono text-[11px]" style={{ color: '#D4AF37' }}>{appUrl}/p/{slug}</p>
              )}
            </div>
            <div>
              <label className={LABEL}>Hero Image URL</label>
              <input value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)} placeholder="https://…" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Brochure PDF URL</label>
              <input value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} placeholder="https://…/brochure.pdf" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div className="space-y-3">
              <label className={LABEL}>Key Selling Points (USPs)</label>
              <input value={usp1} onChange={(e) => setUsp1(e.target.value)} placeholder="USP 1 — e.g. 2-acre rooftop sky garden" className={INPUT} style={INPUT_STYLE} />
              <input value={usp2} onChange={(e) => setUsp2(e.target.value)} placeholder="USP 2 — e.g. 500m from metro station" className={INPUT} style={INPUT_STYLE} />
              <input value={usp3} onChange={(e) => setUsp3(e.target.value)} placeholder="USP 3 — e.g. IGBC Gold certified green building" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className={LABEL}>About the Developer / Project</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={3}
                placeholder="A short paragraph describing the developer and project vision…"
                className={`${INPUT} resize-none`}
                style={INPUT_STYLE}
              />
            </div>
          </div>
        </div>

        {/* ── Amenities ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Amenities
          </p>
          <label className={LABEL}>List amenities, comma-separated</label>
          <textarea
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
            rows={3}
            placeholder="Infinity Pool, Clubhouse, Gym, Co-working Lounge, Children's Play Area, EV Charging"
            className={`${INPUT} resize-none`}
            style={INPUT_STYLE}
          />
          <p className="mt-2 text-[12px] text-gray-600">These appear on the landing page and are used by the voice agent script.</p>
        </div>

        {/* ── Additional Content ── */}
        <div className="rounded-2xl border p-6" style={sectionStyle}>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
            Additional Content
          </p>
          <div className="space-y-5">
            <div>
              <label className={LABEL}>Video URL (YouTube / Vimeo)</label>
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..." className={INPUT} style={INPUT_STYLE} />
              <p className="mt-1.5 text-[12px] text-gray-600">Used in WhatsApp drip sequences.</p>
            </div>
            <div>
              <label className={LABEL}>Ideal Buyer Profile</label>
              <textarea value={buyerProfile} onChange={(e) => setBuyerProfile(e.target.value)} rows={2}
                placeholder="e.g. IT professionals aged 30-45, end-users, budget 80-120L, prioritize good schools nearby"
                className={`${INPUT} resize-none`} style={INPUT_STYLE} />
            </div>
          </div>
        </div>

        {error && (
          <p
            className="rounded-xl border px-4 py-3 text-[13px] text-red-400"
            style={{ borderColor: 'rgba(239,68,68,0.20)', backgroundColor: 'rgba(239,68,68,0.05)' }}
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border px-5 py-2.5 text-[13px] font-medium text-gray-400 transition-colors hover:text-white"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name || !clientId}
            className="rounded-xl px-6 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
