import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';
import LeadForm from './components/lead-form';
import LandingPageView from './components/landing-page-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Variant = 'luxury' | 'premium' | 'plot';

interface ProjectRow {
  id: string;
  client_id: string;
  name: string;
  location: string | null;
  segment: string | null;
  unit_type: string | null;
  price_min_paise: number | null;
  price_max_paise: number | null;
  public_slug: string | null;
  hero_image_url: string | null;
  gallery_urls: string[] | null;
  floor_plan_urls: string[] | null;
  usp_bullets: string[] | null;
  developer_about: string | null;
  rera_number: string | null;
  key_amenities: Record<string, unknown> | null;
  brochure_url: string | null;
  clients: { name: string; brand_name: string | null; gold_color_hex: string | null } | null;
}

async function getProject(slug: string): Promise<ProjectRow | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('*, clients(name, brand_name, gold_color_hex)')
    .eq('public_slug', slug)
    .single();
  return (data as ProjectRow) ?? null;
}

function variantFor(project: ProjectRow): Variant {
  const seg = project.segment;
  if (seg === 'luxury') return 'luxury';
  if (project.price_min_paise && project.price_min_paise >= 100_000_000) return 'luxury';
  if (seg === 'premium') return 'premium';
  if (seg === 'plot' || seg === 'affordable' || seg === 'mid') return 'plot';
  return 'premium';
}

function fmtINR(paise: number): string {
  if (paise >= 10_000_000) return `₹${(paise / 10_000_000).toFixed(paise % 10_000_000 === 0 ? 0 : 2)} Cr`;
  return `₹${(paise / 100_000).toFixed(0)} L`;
}

function priceRange(min: number | null, max: number | null): string {
  if (min && max) return `${fmtINR(min)}–${fmtINR(max)}`;
  if (min) return `Starting ${fmtINR(min)}`;
  if (max) return `Up to ${fmtINR(max)}`;
  return 'On request';
}

function flattenAmenities(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [];
  const items: string[] = [];
  for (const v of Object.values(raw)) {
    if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') items.push(x);
  }
  return items;
}

function approxEmi(priceMinPaise: number | null): string {
  if (!priceMinPaise) return '';
  // very rough placeholder: 80% LTV, 9% interest, 20 years
  // EMI ≈ P*r*(1+r)^n / ((1+r)^n - 1)
  const principalPaise = priceMinPaise * 0.8;
  const r = 0.09 / 12;
  const n = 20 * 12;
  const factor = Math.pow(1 + r, n);
  const emiPaise = (principalPaise * r * factor) / (factor - 1);
  const emiRupees = Math.round(emiPaise / 100);
  if (emiRupees >= 100_000) return `~₹${(emiRupees / 100_000).toFixed(1)} L/mo`;
  return `~₹${Math.round(emiRupees / 1000)}K/mo`;
}

// ─── Variant: LUXURY ──────────────────────────────────────────────────────────

function LuxuryPage({ project }: { project: ProjectRow }) {
  const amenities = flattenAmenities(project.key_amenities);
  const usps = project.usp_bullets ?? [];
  const gallery = project.gallery_urls ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(212,175,55,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(212,175,55,0.15), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-32 md:pb-40">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-[#d4af37]">
            {project.clients?.brand_name ?? project.clients?.name} · {project.location}
          </p>
          <h1
            className="font-serif text-5xl font-bold leading-[1.05] text-[#d4af37] md:text-7xl"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {project.name}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70 md:text-xl">
            {project.unit_type ?? 'Private residences'} · {priceRange(project.price_min_paise, project.price_max_paise)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#enquire"
              className="rounded-full bg-[#d4af37] px-7 py-3 text-sm font-semibold text-black transition hover:bg-[#c9a137]"
            >
              Schedule Private Viewing
            </a>
            {project.brochure_url && (
              <a
                href={project.brochure_url}
                className="rounded-full border border-[#d4af37]/40 px-7 py-3 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Download Brochure
              </a>
            )}
          </div>
        </div>
      </section>

      {/* USPs */}
      {usps.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 md:grid-cols-3">
            {usps.slice(0, 6).map((u, i) => (
              <div key={i} className="border-t border-[#d4af37]/30 pt-6">
                <div className="mb-3 text-2xl text-[#d4af37]">0{i + 1}</div>
                <p className="text-white/85 leading-relaxed">{u}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GALLERY */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2
          className="mb-8 text-3xl text-[#d4af37]"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          The Address
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(gallery.length > 0 ? gallery : new Array(6).fill(null)).slice(0, 6).map((url, i) => (
            <div
              key={i}
              className="aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]"
            >
              {url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={url} alt={`${project.name} ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/30">
                  Gallery image {i + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* AMENITIES */}
      {amenities.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2
            className="mb-8 text-3xl text-[#d4af37]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Amenities
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {amenities.slice(0, 12).map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-white/80">
                <span className="h-1 w-1 rounded-full bg-[#d4af37]" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DEVELOPER */}
      {project.developer_about && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-lg leading-relaxed text-white/70">{project.developer_about}</p>
        </section>
      )}

      {/* FORM */}
      <section id="enquire" className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#d4af37]">By Invitation</p>
          <h2 className="text-3xl text-white" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            Schedule a Private Viewing
          </h2>
          <p className="mt-3 text-sm text-white/60">
            Our concierge will reach out within 2 minutes.
          </p>
        </div>
        <LeadForm
          projectId={project.id}
          slug={project.public_slug ?? ''}
          variant="luxury"
          ctaLabel="Schedule Private Viewing"
        />
      </section>

      {/* RERA */}
      {project.rera_number && (
        <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/40">
          RERA Registration: <span className="text-[#d4af37]">{project.rera_number}</span>
        </footer>
      )}
    </div>
  );
}

// ─── Variant: PREMIUM ─────────────────────────────────────────────────────────

function PremiumPage({ project }: { project: ProjectRow }) {
  const amenities = flattenAmenities(project.key_amenities);
  const usps = project.usp_bullets ?? [];
  const emi = approxEmi(project.price_min_paise);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO — split */}
      <section className="grid min-h-[80vh] md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-16 md:px-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-500">
            {project.clients?.brand_name ?? project.clients?.name} · {project.location}
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{project.name}</h1>
          <p className="mt-4 text-lg text-slate-600">
            {project.unit_type ?? 'Premium homes'}
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-900">
            {priceRange(project.price_min_paise, project.price_max_paise)}
          </p>
          {emi && (
            <p className="mt-1 text-sm text-slate-500">
              EMIs from <span className="font-medium text-slate-700">{emi}*</span>
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#enquire"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Book Site Visit
            </a>
            {project.brochure_url && (
              <a
                href={project.brochure_url}
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Brochure
              </a>
            )}
          </div>
        </div>
        <div className="relative min-h-[40vh] bg-gradient-to-br from-slate-200 to-slate-100 md:min-h-full">
          {project.hero_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={project.hero_image_url}
              alt={project.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Hero image
            </div>
          )}
        </div>
      </section>

      {/* USPs */}
      {usps.length > 0 && (
        <section className="bg-slate-50 px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {usps.slice(0, 6).map((u, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 text-sm font-bold text-slate-400">0{i + 1}</div>
                <p className="text-slate-700">{u}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AMENITIES — 3x2 */}
      {amenities.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 text-3xl font-bold text-slate-900">Amenities</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {amenities.slice(0, 6).map((a, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-5">
                <div className="text-sm font-semibold text-slate-900">{a}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DEVELOPER */}
      {project.developer_about && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="mb-4 text-2xl font-semibold">About the Developer</h2>
          <p className="text-slate-600 leading-relaxed">{project.developer_about}</p>
        </section>
      )}

      {/* FORM */}
      <section id="enquire" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-xl">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900">Book Your Site Visit</h2>
            <p className="mt-2 text-sm text-slate-600">Our team will call you within 2 minutes.</p>
          </div>
          <LeadForm
            projectId={project.id}
            slug={project.public_slug ?? ''}
            variant="premium"
            ctaLabel="Book Site Visit"
          />
        </div>
      </section>

      {project.rera_number && (
        <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-500">
          RERA Registration: <span className="text-slate-900">{project.rera_number}</span>
          {emi && <span className="ml-2">· *Illustrative EMI at 9% / 20 years / 80% LTV.</span>}
        </footer>
      )}
    </div>
  );
}

// ─── Variant: PLOT / AFFORDABLE / MID ─────────────────────────────────────────

function PlotPage({ project }: { project: ProjectRow }) {
  const usps = project.usp_bullets ?? [];
  const minPaise = project.price_min_paise;
  const priceCallout = minPaise
    ? minPaise >= 10_000_000
      ? `Starting ₹${(minPaise / 10_000_000).toFixed(1)} Cr`
      : `Starting ₹${(minPaise / 100_000).toFixed(0)} Lac`
    : 'Best Price Guaranteed';

  const waPhone = project.clients?.name ? '+919999999999' : '+919999999999'; // TODO: pull client.contact_phone
  const waText = encodeURIComponent(
    `Hi, I'd like to know more about ${project.name} in ${project.location ?? ''}.`
  );
  const waUrl = `https://wa.me/${waPhone.replace(/\D/g, '')}?text=${waText}`;

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      {/* HERO */}
      <section className="px-6 pt-12 pb-10 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-700">
            {project.clients?.brand_name ?? project.clients?.name} · {project.location}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            {project.name}
          </h1>
          <p className="mt-3 text-lg text-slate-600">{project.unit_type ?? 'Investment Plots'}</p>

          <div className="mt-8 inline-block rounded-2xl bg-emerald-600 px-8 py-5 text-white shadow-lg">
            <div className="text-4xl font-extrabold md:text-5xl">{priceCallout}</div>
            <div className="mt-1 text-sm opacity-90">Limited inventory · RERA approved</div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
            >
              <span>💬</span> Get Quote on WhatsApp
            </a>
            <a
              href="#enquire"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Request Site Plan
            </a>
          </div>
        </div>
      </section>

      {/* VALUE BULLETS */}
      {usps.length > 0 && (
        <section className="px-6 py-12">
          <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2">
            {usps.slice(0, 6).map((u, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  ✓
                </span>
                <span className="text-slate-700">{u}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* WHY THIS LOCATION */}
      {project.developer_about && (
        <section className="px-6 py-12">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-3 text-2xl font-bold">About the Project</h2>
            <p className="text-slate-700 leading-relaxed">{project.developer_about}</p>
          </div>
        </section>
      )}

      {/* FORM */}
      <section id="enquire" className="px-6 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Request Site Plan + Price List</h2>
            <p className="mt-2 text-sm text-slate-600">Get a call back in 2 minutes.</p>
          </div>
          <LeadForm
            projectId={project.id}
            slug={project.public_slug ?? ''}
            variant="plot"
            ctaLabel="Send Me Details"
          />
        </div>
      </section>

      {project.rera_number && (
        <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-500">
          RERA Registration: <span className="font-medium text-slate-700">{project.rera_number}</span>
        </footer>
      )}
    </div>
  );
}

// ─── Route entry ─────────────────────────────────────────────────────────────

export default async function LandingPage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug);
  if (!project) notFound();

  const variant = variantFor(project);

  return (
    <>
      <LandingPageView slug={params.slug} projectName={project.name} variant={variant} />
      {variant === 'luxury' && <LuxuryPage project={project} />}
      {variant === 'premium' && <PremiumPage project={project} />}
      {variant === 'plot' && <PlotPage project={project} />}
    </>
  );
}
