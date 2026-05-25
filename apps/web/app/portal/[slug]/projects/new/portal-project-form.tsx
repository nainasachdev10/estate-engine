'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const GOLD = '#d4af37';

const INPUT = `w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30
  focus:border-[${GOLD}]/40 focus:outline-none focus:ring-1 focus:ring-[${GOLD}]/20 transition`;

const LABEL = 'mb-1.5 block text-[11px] uppercase tracking-[0.15em] text-white/50';

const SECTION_TITLE = `mb-1 font-serif text-lg text-[${GOLD}]`;
const SECTION_DESC = 'mb-5 text-xs text-white/40';

async function uploadFile(file: File, type: 'brochure' | 'hero'): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', type);
  const res = await fetch('/api/portal/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
  return data.url as string;
}

export default function PortalProjectForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [segment, setSegment] = useState('luxury');
  const [unitType, setUnitType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [rera, setRera] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [usp1, setUsp1] = useState('');
  const [usp2, setUsp2] = useState('');
  const [usp3, setUsp3] = useState('');
  const [about, setAbout] = useState('');
  const [amenities, setAmenities] = useState('');

  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  async function handleBrochureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBrochure(true);
    setError(null);
    try {
      const url = await uploadFile(file, 'brochure');
      setBrochureUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brochure upload failed');
    } finally {
      setUploadingBrochure(false);
      if (brochureInputRef.current) brochureInputRef.current.value = '';
    }
  }

  async function handleHeroFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    setError(null);
    try {
      const url = await uploadFile(file, 'hero');
      setHeroUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location: location || undefined,
          segment: segment || undefined,
          unit_type: unitType || undefined,
          price_min_lakhs: priceMin ? parseFloat(priceMin) : undefined,
          price_max_lakhs: priceMax ? parseFloat(priceMax) : undefined,
          rera_number: rera || undefined,
          brochure_url: brochureUrl || undefined,
          hero_image_url: heroUrl || undefined,
          usp_bullets: [usp1, usp2, usp3].filter(Boolean),
          developer_about: about || undefined,
          amenities: amenities ? amenities.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Submission failed. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <div className="mb-6 text-5xl">✓</div>
        <h2 className="mb-3 font-serif text-3xl text-[#d4af37]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          Project submitted
        </h2>
        <p className="mb-8 text-white/60">
          Your project details have been sent to your account manager. We'll review and activate your
          listing — you'll receive an email once it's live.
        </p>
        <button
          onClick={() => router.push(`/portal/${slug}/projects`)}
          className="rounded-full border border-[#d4af37]/40 px-6 py-3 text-sm text-[#d4af37] transition hover:bg-[#d4af37]/10"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-10 py-10">

      {/* Basic info */}
      <section>
        <p className={SECTION_TITLE} style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Project Details</p>
        <p className={SECTION_DESC}>Tell us about the project so we can set up your lead pipeline.</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Project Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emerald Heights Phase II" className={INPUT} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Location / City *</label>
              <input required value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Whitefield, Bengaluru" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Project Type</label>
              <select value={segment} onChange={(e) => setSegment(e.target.value)}
                className={INPUT + ' appearance-none'}>
                <option value="luxury">Luxury</option>
                <option value="premium">Premium</option>
                <option value="mid">Mid-segment</option>
                <option value="affordable">Affordable</option>
                <option value="plot">Plot / Land</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Unit Configuration</label>
            <input value={unitType} onChange={(e) => setUnitType(e.target.value)}
              placeholder="e.g. 3 & 4 BHK Apartments" className={INPUT} />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section>
        <p className={SECTION_TITLE} style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Pricing &amp; RERA</p>
        <p className={SECTION_DESC}>Used for lead qualification and landing page pricing display.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Min Price (₹ Lakhs)</label>
            <input type="number" min="0" step="0.5" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
              placeholder="e.g. 85" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Max Price (₹ Lakhs)</label>
            <input type="number" min="0" step="0.5" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
              placeholder="e.g. 150" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>RERA Number</label>
            <input value={rera} onChange={(e) => setRera(e.target.value)}
              placeholder="PRM/KA/RERA/…" className={INPUT} />
          </div>
        </div>
      </section>

      {/* Content */}
      <section>
        <p className={SECTION_TITLE} style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Marketing Content</p>
        <p className={SECTION_DESC}>Used to generate your landing page, ads, and social posts automatically.</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Brochure / PDF</label>
            <div className="flex gap-2">
              <input value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)}
                placeholder="Paste link or upload →" className={INPUT} />
              <input ref={brochureInputRef} type="file" accept=".pdf" className="hidden"
                onChange={handleBrochureFile} />
              <button type="button" disabled={uploadingBrochure}
                onClick={() => brochureInputRef.current?.click()}
                className="flex-none rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white transition disabled:opacity-50 whitespace-nowrap">
                {uploadingBrochure ? 'Uploading…' : '↑ Upload PDF'}
              </button>
            </div>
            {brochureUrl && brochureUrl.startsWith('http') && (
              <p className="mt-1.5 text-[11px] text-green-400/70">✓ PDF uploaded</p>
            )}
          </div>
          <div>
            <label className={LABEL}>Hero Image</label>
            <div className="flex gap-2">
              <input value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)}
                placeholder="Paste link or upload →" className={INPUT} />
              <input ref={heroInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={handleHeroFile} />
              <button type="button" disabled={uploadingHero}
                onClick={() => heroInputRef.current?.click()}
                className="flex-none rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white transition disabled:opacity-50 whitespace-nowrap">
                {uploadingHero ? 'Uploading…' : '↑ Upload Image'}
              </button>
            </div>
            {heroUrl && heroUrl.startsWith('http') && (
              <p className="mt-1.5 text-[11px] text-green-400/70">✓ Image ready</p>
            )}
          </div>
          <div className="space-y-3">
            <label className={LABEL}>Key Selling Points (up to 3)</label>
            <input value={usp1} onChange={(e) => setUsp1(e.target.value)}
              placeholder="e.g. 2-acre rooftop sky garden" className={INPUT} />
            <input value={usp2} onChange={(e) => setUsp2(e.target.value)}
              placeholder="e.g. 500m from upcoming metro station" className={INPUT} />
            <input value={usp3} onChange={(e) => setUsp3(e.target.value)}
              placeholder="e.g. IGBC Gold green-certified building" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Amenities (comma separated)</label>
            <textarea value={amenities} onChange={(e) => setAmenities(e.target.value)} rows={2}
              placeholder="Infinity Pool, Clubhouse, Gym, Co-working Lounge, EV Charging, Children's Play Area"
              className={INPUT + ' resize-none'} />
          </div>
          <div>
            <label className={LABEL}>About the Project</label>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4}
              placeholder="A short description of the project, developer background, and vision…"
              className={INPUT + ' resize-none'} />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <button type="button" onClick={() => router.back()}
          className="text-sm text-white/40 transition hover:text-white">
          ← Cancel
        </button>
        <button type="submit" disabled={submitting || !name || !location}
          className="rounded-full bg-[#d4af37] px-8 py-3 text-sm font-semibold text-black transition hover:bg-[#c9a137] disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit Project'}
        </button>
      </div>
    </form>
  );
}
