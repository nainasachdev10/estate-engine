'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const GOLD = '#d4af37';

const INPUT = `w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30
  focus:border-[${GOLD}]/40 focus:outline-none focus:ring-1 focus:ring-[${GOLD}]/20 transition`;

const LABEL = 'mb-1.5 block text-[11px] uppercase tracking-[0.15em] text-white/50';

const SECTION_TITLE = `mb-1 font-serif text-lg text-[${GOLD}]`;
const SECTION_DESC = 'mb-5 text-xs text-white/40';

const SERIF = { fontFamily: 'Playfair Display, Georgia, serif' };

const DAYS = ['Monday–Friday', 'Saturday', 'Sunday'];

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

  // Section 1 — Project Basics
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [segment, setSegment] = useState('luxury');
  const [unitType, setUnitType] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [availableUnits, setAvailableUnits] = useState('');
  const [possessionDate, setPossessionDate] = useState('');

  // Section 2 — Pricing & Legal
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [rera, setRera] = useState('');

  // Section 3 — Site Visit Setup
  const [siteAddress, setSiteAddress] = useState('');
  const [siteContactName, setSiteContactName] = useState('');
  const [siteContactPhone, setSiteContactPhone] = useState('');
  const [visitDays, setVisitDays] = useState<string[]>([]);

  // Section 4 — Marketing Assets
  const [brochureUrl, setBrochureUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Section 5 — Content & Messaging
  const [usp1, setUsp1] = useState('');
  const [usp2, setUsp2] = useState('');
  const [usp3, setUsp3] = useState('');
  const [amenities, setAmenities] = useState('');
  const [about, setAbout] = useState('');
  const [buyerProfile, setBuyerProfile] = useState('');

  // Section 6 — FAQs
  const [faqs, setFaqs] = useState([{ q: '', a: '' }, { q: '', a: '' }, { q: '', a: '' }]);

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

  function toggleDay(day: string) {
    setVisitDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  function updateFaq(index: number, field: 'q' | 'a', value: string) {
    setFaqs((prev) => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }

  function addFaq() {
    if (faqs.length < 6) setFaqs((prev) => [...prev, { q: '', a: '' }]);
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
          location,
          segment: segment || undefined,
          unit_type: unitType || undefined,
          total_units: totalUnits ? parseInt(totalUnits) : undefined,
          available_units: availableUnits ? parseInt(availableUnits) : undefined,
          possession_date: possessionDate || undefined,
          price_min_lakhs: priceMin ? parseFloat(priceMin) : undefined,
          price_max_lakhs: priceMax ? parseFloat(priceMax) : undefined,
          rera_number: rera || undefined,
          site_address: siteAddress || undefined,
          site_contact_name: siteContactName || undefined,
          site_contact_phone: siteContactPhone || undefined,
          visit_days: visitDays.length ? visitDays : undefined,
          brochure_url: brochureUrl || undefined,
          hero_image_url: heroUrl || undefined,
          video_url: videoUrl || undefined,
          usp_bullets: [usp1, usp2, usp3].filter(Boolean),
          amenities: amenities ? amenities.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          developer_about: about || undefined,
          buyer_profile: buyerProfile || undefined,
          faq: faqs.filter((f) => f.q.trim() && f.a.trim()),
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
        <h2 className="mb-3 font-serif text-3xl text-[#d4af37]" style={SERIF}>
          Project submitted
        </h2>
        <p className="mb-8 text-white/60">
          Your project details have been sent to your account manager. We&apos;ll review and activate your
          listing — you&apos;ll receive an email once it&apos;s live.
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

      {/* Section 1 — Project Basics */}
      <section>
        <p className={SECTION_TITLE} style={SERIF}>Project Basics</p>
        <p className={SECTION_DESC}>Core details about the project — used across all automations.</p>
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
              <label className={LABEL}>Project Type / Segment</label>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Total Units</label>
              <input type="number" min="0" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="e.g. 240" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Available / Unsold</label>
              <input type="number" min="0" value={availableUnits} onChange={(e) => setAvailableUnits(e.target.value)}
                placeholder="e.g. 68" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Possession Date</label>
              <input type="date" value={possessionDate} onChange={(e) => setPossessionDate(e.target.value)}
                className={INPUT + ' [color-scheme:dark]'} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Pricing & Legal */}
      <section>
        <p className={SECTION_TITLE} style={SERIF}>Pricing &amp; Legal</p>
        <p className={SECTION_DESC}>Used for lead qualification and landing page pricing display.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Min Price (&#8377; Lakhs)</label>
            <input type="number" min="0" step="0.5" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
              placeholder="e.g. 85" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Max Price (&#8377; Lakhs)</label>
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

      {/* Section 3 — Site Visit Setup */}
      <section>
        <p className={SECTION_TITLE} style={SERIF}>Site Visit Setup</p>
        <p className={SECTION_DESC}>Powers visit confirmation and reminder WhatsApp messages sent to leads.</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Site / Project Address *</label>
            <textarea required value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} rows={2}
              placeholder="e.g. Plot 45, Sarjapur Main Road, near Wipro Gate, Bengaluru 560102"
              className={INPUT + ' resize-none'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Sales Contact Name</label>
              <input value={siteContactName} onChange={(e) => setSiteContactName(e.target.value)}
                placeholder="Name of person at site leads should ask for" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Sales Contact Phone</label>
              <input value={siteContactPhone} onChange={(e) => setSiteContactPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Available Visit Days</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {DAYS.map((day) => {
                const checked = visitDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-lg border px-4 py-2 text-xs transition ${
                      checked
                        ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-[#d4af37]'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    {checked && <span className="mr-1.5">✓</span>}
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Marketing Assets */}
      <section>
        <p className={SECTION_TITLE} style={SERIF}>Marketing Assets</p>
        <p className={SECTION_DESC}>Used to generate landing pages, ads, and social posts automatically.</p>
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
          <div>
            <label className={LABEL}>Walkthrough Video URL</label>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="YouTube or Vimeo link — used in WhatsApp follow-ups" className={INPUT} />
          </div>
        </div>
      </section>

      {/* Section 5 — Content & Messaging */}
      <section>
        <p className={SECTION_TITLE} style={SERIF}>Content &amp; Messaging</p>
        <p className={SECTION_DESC}>Powers AI-generated messages, the voice agent script, and ad copy.</p>
        <div className="space-y-4">
          <div className="space-y-3">
            <label className={LABEL}>Key Selling Points / USPs (up to 3)</label>
            <input value={usp1} onChange={(e) => setUsp1(e.target.value)}
              placeholder="e.g. 2-acre rooftop sky garden" className={INPUT} />
            <input value={usp2} onChange={(e) => setUsp2(e.target.value)}
              placeholder="e.g. 500m from upcoming metro station" className={INPUT} />
            <input value={usp3} onChange={(e) => setUsp3(e.target.value)}
              placeholder="e.g. IGBC Gold green-certified building" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Amenities (comma-separated)</label>
            <textarea value={amenities} onChange={(e) => setAmenities(e.target.value)} rows={2}
              placeholder="Infinity Pool, Clubhouse, Gym, Co-working Lounge, EV Charging, Children's Play Area"
              className={INPUT + ' resize-none'} />
          </div>
          <div>
            <label className={LABEL}>About the Project / Developer</label>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4}
              placeholder="Background, credibility, vision — used in voice scripts and landing page copy."
              className={INPUT + ' resize-none'} />
          </div>
          <div>
            <label className={LABEL}>Ideal Buyer Profile</label>
            <textarea value={buyerProfile} onChange={(e) => setBuyerProfile(e.target.value)} rows={2}
              placeholder="e.g. IT professionals aged 30-45, looking for first home, budget 80-120L, prioritize green spaces and schools nearby. Mostly end-users, some NRI investors."
              className={INPUT + ' resize-none'} />
          </div>
        </div>
      </section>

      {/* Section 6 — FAQs */}
      <section>
        <p className={SECTION_TITLE} style={SERIF}>Frequently Asked Questions</p>
        <p className={SECTION_DESC}>These answers power the AI voice agent and WhatsApp auto-replies.</p>
        <div className="space-y-5">
          {faqs.map((faq, i) => (
            <div key={i}>
              {i > 0 && <div className="mb-5 border-t border-white/[0.06]" />}
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Question {i + 1}</label>
                  <input value={faq.q} onChange={(e) => updateFaq(i, 'q', e.target.value)}
                    placeholder="e.g. What is the possession date?" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Answer {i + 1}</label>
                  <input value={faq.a} onChange={(e) => updateFaq(i, 'a', e.target.value)}
                    placeholder="e.g. Q3 2027, RERA approved" className={INPUT} />
                </div>
              </div>
            </div>
          ))}
          {faqs.length < 6 && (
            <button
              type="button"
              onClick={addFaq}
              className="rounded-lg border border-[#d4af37]/30 px-4 py-2 text-xs text-[#d4af37]/70 transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
            >
              + Add another FAQ
            </button>
          )}
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
        <button
          type="submit"
          disabled={submitting || !name || !location || !siteAddress}
          className="rounded-full bg-[#d4af37] px-8 py-3 text-sm font-semibold text-black transition hover:bg-[#c9a137] disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Project'}
        </button>
      </div>
    </form>
  );
}
