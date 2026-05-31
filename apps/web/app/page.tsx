import Link from 'next/link';
import {
  Phone,
  MessageSquare,
  Target,
  Megaphone,
  LayoutDashboard,
  LineChart,
  ArrowRight,
  Brain,
  CalendarCheck,
  Check,
  Share2,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
} from 'lucide-react';

export const dynamic = 'force-static';

/* ─── Data ─────────────────────────────────────────────────── */

const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'Lead arrives',
    body: 'Meta, Google, 99acres, or your landing page — every form fill enters the pipeline instantly.',
    dot: 'bg-blue-400',
  },
  {
    num: '02',
    title: 'AI calls in < 60 seconds',
    body: 'Bolna dials the lead in Hinglish. Intent, budget, and timeline — qualified automatically.',
    dot: 'bg-amber-400',
  },
  {
    num: '03',
    title: 'Claude scores 0–100',
    body: 'Every transcript read by Claude Sonnet. High scores go to sales. Low scores go to nurture.',
    dot: 'bg-green-400',
  },
  {
    num: '04',
    title: 'WhatsApp + email drip starts',
    body: 'Brochure, site video, price sheet — sent over WhatsApp and email on buyer psychology timing.',
    dot: 'bg-purple-400',
  },
  {
    num: '05',
    title: 'Site visit booked',
    body: 'Calendar link via WhatsApp. Sales team gets the lead with full transcript and context attached.',
    dot: 'bg-emerald-400',
  },
  {
    num: '06',
    title: 'Claude writes the ads',
    body: '10 Meta, Google, and 99acres variants per project. Launch directly to Ads Manager — one click.',
    dot: 'bg-orange-400',
  },
  {
    num: '07',
    title: '30 days of social, generated',
    body: 'Instagram, Facebook, LinkedIn, Twitter — approve in bulk, Ayrshare publishes on schedule.',
    dot: 'bg-pink-400',
  },
];

const FEATURES = [
  { icon: Phone, tag: 'Voice AI', title: 'Hinglish Voice Agent', body: 'Calls every lead within 60 seconds. Natural Hinglish — qualifies intent, budget, and timeline.', highlight: true },
  { icon: Megaphone, tag: 'Ads', title: 'AI Ad Generator', body: 'Claude writes 10 variants per project for Meta, Google, and 99acres. Launch to Meta Ads Manager in one click.', highlight: true },
  { icon: Share2, tag: 'Social', title: 'Social Media Scheduler', body: '30 days of posts per project. Approve once, Ayrshare publishes across Instagram, Facebook, LinkedIn, Twitter.', highlight: true },
  { icon: MessageSquare, tag: 'WhatsApp', title: 'WhatsApp Sequences', body: 'Approved templates followed by free-form drip — on the channel Indian buyers actually read.', highlight: false },
  { icon: Mail, tag: 'Email', title: 'Brevo Email Drip', body: 'Claude-written sequences. Subject lines and body tailored per project. Delivery and read tracking included.', highlight: false },
  { icon: Brain, tag: 'AI Brain', title: 'Lead Scoring', body: 'Every call and interaction scored 0–100 by Claude Sonnet. Your sales floor only touches leads worth touching.', highlight: false },
  { icon: LayoutDashboard, tag: 'CRM', title: 'Live Pipeline', body: 'Kanban across 7 stages. Table view. One-click call trigger. 30-second auto-refresh. You own the data.', highlight: false },
  { icon: Target, tag: 'Analytics', title: 'Funnel Analytics', body: 'Stage conversion rates, source attribution, voice stats, messaging engagement — all in one view.', highlight: false },
  { icon: LineChart, tag: 'Portal', title: 'Client Portal', body: 'Branded read-only dashboard per developer. They see their pipeline and lead counts — no admin access.', highlight: false },
];

const PRICING = [
  {
    name: 'Starter',
    price: '₹49,999',
    per: '/month',
    desc: 'One project. Full AI acquisition loop.',
    features: ['1 developer project', '500 AI voice calls/mo', 'WhatsApp + email drip', 'AI lead scoring', 'Analytics dashboard', 'Client portal'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '₹99,999',
    per: '/month',
    desc: 'Multi-project. Ads and social included.',
    features: ['Up to 5 projects', '2,000 AI voice calls/mo', 'AI ad creative generation', 'Social media scheduler', 'Full analytics + attribution', 'Meta campaign launch', 'Dedicated onboarding'],
    cta: 'Book a demo',
    highlighted: true,
  },
];

/* ─── Mini kanban preview ───────────────────────────────────── */

function DashboardPreview() {
  const cols = [
    { label: 'New', dot: 'bg-blue-400', leads: [{ n: 'R*** S***', p: 'Prestige Hills', s: 82 }] },
    { label: 'Contacted', dot: 'bg-amber-400', leads: [{ n: 'A*** K***', p: 'Sobha Greens', s: 65 }, { n: 'V*** M***', p: 'DLF Camellias', s: 58 }] },
    { label: 'Qualified', dot: 'bg-green-400', leads: [{ n: 'M*** P***', p: 'Prestige Hills', s: 91 }] },
  ];

  return (
    <div
      className="w-full overflow-hidden rounded-xl border shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
      style={{ backgroundColor: '#111', borderColor: 'rgba(212,175,55,0.18)' }}
    >
      {/* chrome */}
      <div className="flex items-center gap-1.5 border-b px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">Realty Engine · Live</span>
      </div>
      {/* stat strip */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        {[{ v: '12', l: "Today" }, { v: '4', l: 'Qualified' }, { v: '74', l: 'Avg Score' }].map((s) => (
          <div key={s.l} className="px-4 py-2.5 text-center">
            <p className="font-bold text-lg" style={{ color: '#d4af37' }}>{s.v}</p>
            <p className="text-[9px] uppercase tracking-wider text-gray-600">{s.l}</p>
          </div>
        ))}
      </div>
      {/* kanban */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {cols.map((col) => (
          <div key={col.label} className="rounded-lg border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 border-b px-2.5 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">{col.label}</span>
            </div>
            <div className="space-y-1.5 p-1.5">
              {col.leads.map((l) => (
                <div key={l.n} className="rounded border p-2" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[11px] font-medium text-white">{l.n}</p>
                  <p className="mt-0.5 truncate text-[9px] text-gray-600">{l.p}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[9px] text-gray-700">2m ago</span>
                    <span className="rounded-full px-1.5 py-px font-mono text-[9px] font-bold"
                      style={{ backgroundColor: l.s >= 70 ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', color: l.s >= 70 ? '#86efac' : '#fde047' }}>
                      {l.s}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* modules */}
      <div className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-[9px] uppercase tracking-wider text-gray-700">Active:</span>
        {[{ label: 'Ad Engine', color: '#f97316' }, { label: 'Social', color: '#ec4899' }, { label: 'Analytics', color: '#d4af37' }].map((m) => (
          <span key={m.label} className="rounded-full border border-white/8 px-2 py-0.5 text-[9px]" style={{ color: m.color }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Layout components ─────────────────────────────────────── */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur" style={{ backgroundColor: 'rgba(10,10,10,0.9)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded border text-sm font-bold"
            style={{ borderColor: 'rgba(212,175,55,0.3)', color: '#d4af37', backgroundColor: 'rgba(212,175,55,0.07)' }}>
            ⬡
          </span>
          <span className="font-serif text-lg font-bold" style={{ color: '#d4af37' }}>Realty Engine</span>
        </Link>
        <nav className="flex items-center gap-7">
          <a href="#how-it-works" className="hidden text-sm text-gray-500 transition-colors hover:text-white md:inline">Pipeline</a>
          <a href="#modules" className="hidden text-sm text-gray-500 transition-colors hover:text-white md:inline">Features</a>
          <a href="#plans" className="hidden text-sm text-gray-500 transition-colors hover:text-white md:inline">Pricing</a>
          <Link href="/login" className="rounded px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 16px)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 30% 0%, rgba(212,175,55,0.10), transparent 70%)' }} />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-16 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Left */}
          <div>
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: '#d4af37' }}>
              Built for Indian real estate
            </p>
            <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
              The complete AI
              <br />
              <span style={{ color: '#d4af37' }}>acquisition engine.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-400">
              Voice calling, ad creatives, 30-day social scheduling, WhatsApp drips — all wired together. One platform runs the entire funnel.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/request-access"
                className="group inline-flex items-center justify-center gap-2 rounded px-7 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
                Request access <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded border border-white/12 px-7 py-3.5 text-sm font-medium text-gray-300 transition-colors hover:border-white/25 hover:text-white">
                See the pipeline
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
              {['< 60s first call', 'Claude-written ads', '30-day social calendar', '3× site visits'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-gold opacity-70" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 rounded-2xl opacity-30"
              style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.12), transparent 70%)' }} />
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <div className="border-y" style={{ borderColor: 'rgba(212,175,55,0.10)' }}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-6 py-5 md:justify-between">
        {[
          { value: '< 60s', label: 'First AI call after form fill' },
          { value: '3×', label: 'More site visits vs industry avg' },
          { value: '10', label: 'Modules live out of the box' },
          { value: '24/7', label: 'Pipeline never sleeps' },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold md:text-3xl" style={{ color: '#d4af37' }}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pipeline() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-14 max-w-lg">
        <h2 className="font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">
          Every step. End to end.
        </h2>
        <p className="mt-4 text-gray-500">
          From the first impression to a closed deal — and back to the top with fresh ads and social content.
        </p>
      </div>

      <div className="relative">
        {/* connector line */}
        <div aria-hidden className="absolute left-[17px] top-6 hidden h-[calc(100%-3rem)] w-px md:block"
          style={{ background: 'linear-gradient(to bottom, rgba(212,175,55,0.35), rgba(212,175,55,0.04))' }} />

        <div className="space-y-3">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.num} className="relative grid grid-cols-[36px_1fr] gap-4 md:gap-6">
              <div className="relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full border"
                style={{ borderColor: 'rgba(212,175,55,0.25)', backgroundColor: '#161616' }}>
                <span className={`h-2 w-2 rounded-full ${step.dot}`} />
              </div>
              <div className="rounded-xl border px-5 py-4 transition-colors hover:border-white/10"
                style={{ backgroundColor: '#141414', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-[10px] text-gray-600">{step.num}</span>
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const highlighted = FEATURES.filter((f) => f.highlight);
  const rest = FEATURES.filter((f) => !f.highlight);

  return (
    <section id="modules" style={{ backgroundColor: '#0d0d0d' }}>
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mb-14 max-w-lg">
          <h2 className="font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">
            All 10 modules. Wired together.
          </h2>
          <p className="mt-4 text-gray-500">
            Voice · Ads · Social · WhatsApp · Email · CRM · Analytics · Portal
          </p>
        </div>

        {/* Highlighted 3 — bigger cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {highlighted.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border p-6"
                style={{ backgroundColor: 'rgba(212,175,55,0.04)', borderColor: 'rgba(212,175,55,0.22)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border"
                    style={{ borderColor: 'rgba(212,175,55,0.2)', backgroundColor: 'rgba(212,175,55,0.07)' }}>
                    <Icon className="h-5 w-5" style={{ color: '#d4af37' }} />
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.body}</p>
              </div>
            );
          })}
        </div>

        {/* Remaining 6 — compact */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-4 rounded-xl border p-5 transition-colors hover:border-white/10"
                style={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-600">{f.tag}</p>
                  <h3 className="mt-0.5 text-sm font-medium text-white">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{f.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Social strip */}
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-[#1a1a1a] px-6 py-4">
          <p className="text-xs text-gray-600">Publishing to</p>
          {[
            { Icon: Instagram, label: 'Instagram', color: '#E1306C' },
            { Icon: Facebook, label: 'Facebook', color: '#1877F2' },
            { Icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
            { Icon: Twitter, label: 'Twitter / X', color: '#e5e7eb' },
          ].map(({ Icon, label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <Icon className="h-3.5 w-3.5" style={{ color }} />
              {label}
            </span>
          ))}
          <span className="ml-auto text-xs text-gray-600">via Ayrshare</span>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="plans">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="mb-14 max-w-lg">
          <h2 className="font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">
            Simple pricing.
          </h2>
          <p className="mt-4 text-gray-500">No per-seat fees. No call center overhead. Pay for projects.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {PRICING.map((plan) => (
            <div key={plan.name} className="relative rounded-2xl border p-8"
              style={{
                backgroundColor: plan.highlighted ? 'rgba(212,175,55,0.04)' : '#1a1a1a',
                borderColor: plan.highlighted ? 'rgba(212,175,55,0.30)' : 'rgba(255,255,255,0.06)',
              }}>
              {plan.highlighted && (
                <span className="absolute right-6 top-6 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
                  Popular
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{plan.name}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-serif text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-gray-600">{plan.per}</span>
              </div>
              <p className="mt-1.5 text-sm text-gray-500">{plan.desc}</p>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check className="h-4 w-4 flex-none" style={{ color: '#d4af37' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/request-access"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded py-3 text-sm font-semibold transition-opacity hover:opacity-85"
                style={plan.highlighted
                  ? { backgroundColor: '#d4af37', color: '#0a0a0a' }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#e5e7eb' }}>
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">Enterprise pricing for 10+ projects. All plans include onboarding support.</p>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="px-6 pb-24 md:pb-28">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border px-8 py-16 text-center md:px-16"
          style={{ backgroundColor: '#141414', borderColor: 'rgba(212,175,55,0.18)' }}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-30" style={{ backgroundColor: '#d4af37' }} />
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: '#d4af37' }}>
            Voice · Ads · Social · CRM
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            The full engine, live today.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-500 md:text-base">
            Add your API keys and the acquisition engine starts running — calls, drips, ads, and social posts on autopilot.
          </p>
          <Link href="/request-access"
            className="group mt-8 inline-flex items-center gap-2 rounded px-8 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
            Request access <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-7 text-xs text-gray-600 md:flex-row">
        <span className="font-serif font-bold" style={{ color: '#d4af37' }}>Realty Engine</span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="transition-colors hover:text-gray-400">Sign in</Link>
          <span>© {new Date().getFullYear()} Realty Engine</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Navbar />
      <Hero />
      <StatsStrip />
      <Pipeline />
      <Features />
      <Pricing />
      <Cta />
      <Footer />
    </main>
  );
}
