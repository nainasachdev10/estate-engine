import Link from 'next/link';
import {
  Phone, MessageSquare, Target, Megaphone, LayoutDashboard,
  LineChart, ArrowRight, Brain, Check, Share2, Mail,
  Instagram, Facebook, Linkedin, Twitter,
} from 'lucide-react';

export const dynamic = 'force-static';

/* ─── Design tokens ─────────────────────────────────────────── */
const G = '#D4AF37';
const G10 = 'rgba(212,175,55,0.10)';
const G18 = 'rgba(212,175,55,0.18)';
const G28 = 'rgba(212,175,55,0.28)';
const W06 = 'rgba(255,255,255,0.06)';
const W08 = 'rgba(255,255,255,0.08)';

/* ─── Data ──────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Lead arrives', body: 'Meta, Google, 99acres, or your site — every form fill enters the pipeline in real time, no manual entry.' },
  { n: '02', title: 'AI calls in under 60 seconds', body: 'A Hinglish voice agent dials the lead immediately. Budget, timeline, and intent captured — before your team even sees the notification.' },
  { n: '03', title: 'Claude scores the conversation', body: 'Every transcript is read by Claude Sonnet and scored 0–100. Above 70 goes to sales. Below 70 enters the nurture sequence automatically.' },
  { n: '04', title: 'Drip starts without anyone lifting a finger', body: 'Brochure, project video, price sheet, and testimonials — sequenced across WhatsApp and email on proven buyer psychology timing.' },
  { n: '05', title: 'Site visit booked via WhatsApp', body: 'A calendar link is sent at the right moment. Your sales team receives the lead with the full call transcript and score attached.' },
  { n: '06', title: 'Claude writes your ad creatives', body: '10 ad variants per project for Meta, Google, and 99acres. Headlines, descriptions, and hooks — reviewed once, pushed to Ads Manager in a single click.' },
  { n: '07', title: '30 days of social, generated and queued', body: 'Instagram, Facebook, LinkedIn, and Twitter content generated per project. Approve in bulk. Ayrshare handles publishing on schedule.' },
];

const PRIMARY_FEATURES = [
  {
    icon: Phone, tag: 'Voice AI',
    title: 'Hinglish Voice Agent',
    body: 'Your AI calls every lead within 60 seconds — in natural Hinglish. It qualifies intent, captures budget and timeline, and routes the lead automatically. No BPO. No call centre. No delay.',
  },
  {
    icon: Megaphone, tag: 'Ad Creative',
    title: 'AI Ad Generator',
    body: 'Claude writes 10 ad variants per project for Meta, Google, and 99acres — headlines, descriptions, and hooks tailored to the property. Push directly to Ads Manager. No agency needed.',
  },
  {
    icon: Share2, tag: 'Social Media',
    title: 'Social Scheduler',
    body: '30 days of Instagram, Facebook, LinkedIn, and Twitter content generated per project. Approve in bulk. Ayrshare handles publishing. Your brand stays consistent even when your team is offline.',
  },
];

const SECONDARY_FEATURES = [
  { icon: MessageSquare, tag: 'WhatsApp', title: 'WhatsApp Sequences', body: 'Template-first, then free-form — on the channel Indian buyers actually respond to. Timed to the conversation window.' },
  { icon: Mail, tag: 'Email', title: 'Brevo Email Drip', body: 'Claude-written emails tailored per project. Sent on buyer psychology timing with open and click tracking.' },
  { icon: Brain, tag: 'AI Scoring', title: 'Lead Intelligence', body: 'Every call scored 0–100. Your sales floor only touches leads worth their time.' },
  { icon: LayoutDashboard, tag: 'CRM', title: 'Live Pipeline', body: 'Kanban across 7 stages. Table view. One-click call trigger. Auto-refreshes every 30 seconds.' },
  { icon: Target, tag: 'Analytics', title: 'Funnel Analytics', body: 'Stage conversion rates, source attribution, voice stats, and messaging engagement — one view.' },
  { icon: LineChart, tag: 'Portal', title: 'Client Portal', body: 'Branded read-only dashboard per developer. They see their pipeline and numbers — no admin access.' },
];

const PLANS = [
  {
    name: 'Starter', price: '₹49,999', billing: '/mo',
    tagline: 'One project. Full AI acquisition loop.',
    items: ['1 developer project', '500 AI voice calls / month', 'WhatsApp + email drip', 'AI lead scoring via Claude', 'Analytics dashboard', 'Client portal'],
    cta: 'Get started', hero: false,
  },
  {
    name: 'Growth', price: '₹99,999', billing: '/mo',
    tagline: 'Multi-project. Ads and social included.',
    items: ['Up to 5 projects', '2,000 AI voice calls / month', 'AI ad creative generation', '30-day social media scheduler', 'Full analytics + attribution', 'Meta campaign launch', 'Dedicated onboarding call'],
    cta: 'Book a demo', hero: true,
  },
];

/* ─── Micro mockups ─────────────────────────────────────────── */

function VoiceMockup() {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border" style={{ borderColor: G18, backgroundColor: '#070707' }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: W06 }}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" style={{ animation: 'ping-slow 1.6s ease-in-out infinite' }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Live Call · 00:43</span>
        </div>
        <span className="rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold" style={{ backgroundColor: G10, color: G }}>Score 82</span>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold text-white">Rahul S. — Prestige Hills enquiry</p>
        <p className="mt-0.5 text-[10px] text-gray-600">Called 43 seconds after form fill</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[{ l: 'Budget', v: '₹1.2–1.5Cr', hi: false }, { l: 'Timeline', v: '3 months', hi: false }, { l: 'Status', v: 'Qualified', hi: true }].map(({ l, v, hi }) => (
            <div key={l} className="rounded-lg border p-2.5" style={{ borderColor: W06, backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <p className="text-[8px] font-medium uppercase tracking-wider text-gray-600">{l}</p>
              <p className="mt-0.5 text-[11px] font-bold" style={{ color: hi ? '#4ade80' : 'white' }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: '82%', backgroundColor: G }} />
          </div>
          <span className="font-mono text-[9px] text-gray-600">82 / 100</span>
        </div>
      </div>
    </div>
  );
}

function AdsMockup() {
  const items = [
    { label: 'Meta · Story', metric: 'CTR 2.4%', grad: `linear-gradient(135deg, ${G10}, transparent)` },
    { label: 'Meta · Feed', metric: 'CTR 1.8%', grad: 'linear-gradient(135deg, rgba(99,102,241,0.14), transparent)' },
    { label: 'Google · Search', metric: 'CTR 3.1%', grad: 'linear-gradient(135deg, rgba(52,211,153,0.12), transparent)' },
    { label: '99acres', metric: '14 leads', grad: 'linear-gradient(135deg, rgba(248,113,113,0.12), transparent)' },
  ];
  return (
    <div className="mt-7 grid grid-cols-2 gap-2">
      {items.map(({ label, metric, grad }) => (
        <div key={label} className="overflow-hidden rounded-xl border transition-colors" style={{ borderColor: W08, backgroundColor: '#080808' }}>
          <div className="h-12" style={{ background: grad }} />
          <div className="px-3 pb-3 pt-2">
            <p className="text-[9px] font-semibold text-gray-500">{label}</p>
            <p className="mt-0.5 text-[10px] font-bold" style={{ color: G }}>{metric}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialMockup() {
  const week = [
    { d: 'M', has: true }, { d: 'T', has: true }, { d: 'W', has: false },
    { d: 'T', has: true }, { d: 'F', has: true }, { d: 'S', has: true }, { d: 'S', has: false },
  ];
  return (
    <div className="mt-7 overflow-hidden rounded-xl border" style={{ borderColor: W08, backgroundColor: '#080808' }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: W06 }}>
        <span className="text-[10px] font-semibold text-gray-500">Week 3 · December</span>
        <span className="text-[10px] font-bold" style={{ color: G }}>5 / 7 scheduled</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {week.map(({ d, has }, i) => (
            <div key={i} className="text-center">
              <p className="mb-2 text-[8px] font-medium text-gray-700">{d}</p>
              <div className="mx-auto flex h-9 w-full items-center justify-center rounded-lg border"
                style={{ borderColor: has ? G28 : W06, backgroundColor: has ? G10 : 'rgba(255,255,255,0.02)' }}>
                {has && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: G }} />}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {[{ l: 'IG', c: '#E1306C' }, { l: 'FB', c: '#1877F2' }, { l: 'LI', c: '#0A66C2' }, { l: 'X', c: '#888' }].map(({ l, c }) => (
            <span key={l} className="rounded px-2 py-0.5 text-[9px] font-bold" style={{ color: c, backgroundColor: 'rgba(255,255,255,0.04)' }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard preview ─────────────────────────────────────── */

function DashboardPreview() {
  const cols = [
    {
      label: 'New', color: '#60a5fa', count: 5,
      leads: [{ n: 'R*** S***', p: 'Prestige Hills', s: 82, t: '2m' }, { n: 'K*** P***', p: 'DLF Camellias', s: 73, t: '11m' }],
    },
    {
      label: 'Contacted', color: '#fbbf24', count: 8,
      leads: [{ n: 'A*** K***', p: 'Sobha Greens', s: 65, t: '1h' }],
    },
    {
      label: 'Qualified', color: '#34d399', count: 3,
      leads: [{ n: 'M*** P***', p: 'Prestige Hills', s: 91, t: '3h' }],
    },
  ];

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-[0_40px_100px_rgba(0,0,0,0.9)]" style={{ backgroundColor: '#090909', borderColor: G28 }}>
      {/* chrome */}
      <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: W06 }}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-4 font-mono text-[9px] uppercase tracking-[0.25em] text-gray-600">Realty Engine · Live</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: 'ping-slow 2s ease-in-out infinite' }} />
          <span className="font-mono text-[9px] text-gray-600">Today</span>
        </span>
      </div>
      {/* stat row */}
      <div className="grid grid-cols-4 divide-x border-b" style={{ borderColor: W06, '--tw-divide-opacity': 1 } as React.CSSProperties}>
        {[{ v: '14', l: 'Leads today' }, { v: '6', l: 'Qualified' }, { v: '81', l: 'Avg score' }, { v: '₹2.4Cr', l: 'Pipeline' }].map(({ v, l }) => (
          <div key={l} className="px-3 py-2.5 text-center">
            <p className="text-base font-black" style={{ color: G }}>{v}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-wider text-gray-600">{l}</p>
          </div>
        ))}
      </div>
      {/* kanban */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {cols.map((col) => (
          <div key={col.label} className="overflow-hidden rounded-xl border" style={{ borderColor: W06, backgroundColor: 'rgba(255,255,255,0.015)' }}>
            <div className="flex items-center justify-between border-b px-2.5 py-2" style={{ borderColor: W06 }}>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{col.label}</span>
              </div>
              <span className="rounded-sm px-1.5 py-0.5 text-[8px] font-bold text-gray-600" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>{col.count}</span>
            </div>
            <div className="space-y-1.5 p-1.5">
              {col.leads.map((l) => (
                <div key={l.n} className="rounded-lg border p-2" style={{ backgroundColor: '#050505', borderColor: W06 }}>
                  <p className="text-[10px] font-semibold text-white">{l.n}</p>
                  <p className="mt-0.5 truncate text-[8px] text-gray-600">{l.p}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-gray-700">{l.t} ago</span>
                    <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-black"
                      style={{ backgroundColor: l.s >= 80 ? 'rgba(52,211,153,0.10)' : l.s >= 65 ? G10 : 'rgba(255,255,255,0.05)', color: l.s >= 80 ? '#4ade80' : l.s >= 65 ? G : '#9ca3af' }}>
                      {l.s}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* footer */}
      <div className="flex items-center gap-3 border-t px-3 py-2" style={{ borderColor: W06 }}>
        <span className="text-[8px] uppercase tracking-wider text-gray-700">Modules active</span>
        {[{ label: 'Voice AI', c: '#34d399' }, { label: 'Ad Engine', c: '#f97316' }, { label: 'Social', c: '#ec4899' }, { label: 'Analytics', c: G }].map(({ label, c }) => (
          <span key={label} className="rounded px-2 py-0.5 text-[8px] font-semibold" style={{ color: c, backgroundColor: 'rgba(255,255,255,0.03)' }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Navbar ────────────────────────────────────────────────── */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(0,0,0,0.88)', borderColor: G18 }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border text-base font-black" style={{ borderColor: G28, color: G, backgroundColor: G10 }}>⬡</span>
          <span className="font-serif text-xl font-bold" style={{ color: G }}>Realty Engine</span>
        </Link>
        <nav className="flex items-center gap-8">
          <a href="#how-it-works" className="hidden text-[13px] text-gray-500 transition-colors hover:text-white md:inline">Pipeline</a>
          <a href="#modules" className="hidden text-[13px] text-gray-500 transition-colors hover:text-white md:inline">Features</a>
          <a href="#plans" className="hidden text-[13px] text-gray-500 transition-colors hover:text-white md:inline">Pricing</a>
          <Link href="/login" className="rounded-lg px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-85" style={{ backgroundColor: G, color: '#000' }}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden" style={{ backgroundColor: '#000' }}>
      {/* Dot grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.09) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 65% 55% at 20% -5%, rgba(212,175,55,0.13), transparent 65%)', animation: 'glow-pulse 5s ease-in-out infinite' }} />
      {/* Bottom fade */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pt-28 lg:pt-36">
        <div className="grid items-center gap-16 md:grid-cols-2 lg:gap-20">

          {/* Left — copy */}
          <div className="flex flex-col">
            {/* Live badge */}
            <div className="mb-8 inline-flex w-fit items-center gap-2.5 rounded-full border px-3.5 py-1.5" style={{ borderColor: G18, backgroundColor: G10 }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" style={{ animation: 'ping-slow 1.8s ease-in-out infinite' }} />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: G }}>India&apos;s AI Acquisition Engine</span>
            </div>

            <h1 className="font-sans font-black leading-[0.93] tracking-tight text-white" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.25rem)' }}>
              Turn Property Leads<br />
              Into Site Visits —<br />
              <span style={{ color: G }}>Fully Automated.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-400" style={{ maxWidth: '44ch' }}>
              Voice calling, AI scoring, WhatsApp drips, ad creatives, and social scheduling — one platform runs your entire acquisition funnel, around the clock.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/request-access"
                className="group inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-[15px] font-bold transition-all hover:scale-[1.01] hover:shadow-[0_0_28px_rgba(212,175,55,0.25)]"
                style={{ backgroundColor: G, color: '#000' }}>
                Request Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-[15px] font-medium text-gray-300 transition-all hover:border-gray-600 hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
                See how it works
              </a>
            </div>

            {/* Proof chips */}
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2.5">
              {['< 60s first call', 'Claude-written ads', '30-day social calendar', '3× more site visits'].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Check className="h-3.5 w-3.5" style={{ color: G }} strokeWidth={2.5} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — dashboard */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-8 rounded-3xl opacity-40"
              style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08), transparent 65%)' }} />
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats strip ───────────────────────────────────────────── */

function Stats() {
  return (
    <div className="border-y" style={{ backgroundColor: '#050505', borderColor: G18 }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0" style={{ '--tw-divide-color': W06 } as React.CSSProperties}>
          {[
            { value: '< 60s', label: 'First AI call after form fill', desc: '21× higher conversion' },
            { value: '3×', label: 'More site visits booked', desc: 'vs industry average' },
            { value: '10', label: 'AI modules, live instantly', desc: 'nothing to configure' },
            { value: '24 / 7', label: 'Pipeline never sleeps', desc: 'calls respect quiet hours' },
          ].map(({ value, label, desc }) => (
            <div key={label} className="flex flex-col gap-1 px-8 py-8">
              <span className="font-sans text-3xl font-black tracking-tight md:text-4xl" style={{ color: G }}>{value}</span>
              <span className="mt-1 text-[13px] font-medium text-white">{label}</span>
              <span className="text-xs text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Pipeline ──────────────────────────────────────────────── */

function Pipeline() {
  return (
    <section id="how-it-works" className="relative" style={{ backgroundColor: '#000' }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
        <div className="mb-16 grid gap-6 md:grid-cols-2 md:items-end">
          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: G }}>The Pipeline</p>
            <h2 className="font-sans text-4xl font-black leading-[0.94] tracking-tight text-white md:text-5xl">
              Every Step.<br />
              <span style={{ color: G }}>End to End.</span>
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-gray-500 md:text-right">
            From the first impression to a closed deal — and back to the top with fresh ads and social content.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <div key={step.n}
              className={`group relative overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:border-[rgba(212,175,55,0.32)] ${i === 0 ? 'md:col-span-2' : ''}`}
              style={{ backgroundColor: '#080808', borderColor: W08 }}>
              {/* Hover glow */}
              <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(212,175,55,0.05), transparent 55%)' }} />
              <div className="relative flex gap-5">
                <span className="mt-0.5 flex-none font-mono text-[11px] font-black tracking-[0.2em]" style={{ color: G }}>{step.n}</span>
                <div>
                  <h3 className="text-[15px] font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-gray-500">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────── */

function Modules() {
  return (
    <section id="modules" style={{ backgroundColor: '#040404' }}>
      <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">

        {/* Section header */}
        <div className="mb-16 grid gap-6 md:grid-cols-2 md:items-end">
          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: G }}>The Modules</p>
            <h2 className="font-sans text-4xl font-black leading-[0.94] tracking-tight text-white md:text-5xl">
              Every Tool<br />
              <span style={{ color: G }}>You Need.</span>
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-gray-500 md:text-right">
            Voice · Ads · Social · WhatsApp · Email · CRM · Analytics · Portal<br />
            All wired together. Nothing to configure.
          </p>
        </div>

        {/* Primary 3 — tall cards with mockup inside */}
        <div className="grid gap-4 md:grid-cols-3">
          {PRIMARY_FEATURES.map((f, i) => {
            const Icon = f.icon;
            const Mockup = [VoiceMockup, AdsMockup, SocialMockup][i];
            return (
              <div key={f.title}
                className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:border-[rgba(212,175,55,0.40)]"
                style={{ backgroundColor: '#090909', borderColor: G18 }}>
                {/* Top gold hairline */}
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${G}, transparent)`, opacity: 0.45 }} />
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(ellipse at top, rgba(212,175,55,0.06), transparent 55%)' }} />

                <div className="relative flex flex-col p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: G28, backgroundColor: G10 }}>
                      <Icon className="h-5 w-5" style={{ color: G }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.20em]" style={{ color: G }}>{f.tag}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-gray-500">{f.body}</p>
                  <Mockup />
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary 6 — compact rows */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECONDARY_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title}
                className="group flex gap-4 rounded-2xl border p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.13)]"
                style={{ backgroundColor: '#080808', borderColor: W08 }}>
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border" style={{ borderColor: W08, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <Icon className="h-4.5 w-4.5 text-gray-500" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{f.tag}</p>
                  <h3 className="mt-0.5 text-[15px] font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{f.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Social platforms strip */}
        <div className="mt-4 flex flex-wrap items-center gap-6 rounded-2xl border px-7 py-5" style={{ backgroundColor: '#080808', borderColor: W08 }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700">Publishing to</p>
          {[
            { Icon: Instagram, label: 'Instagram', color: '#E1306C' },
            { Icon: Facebook, label: 'Facebook', color: '#1877F2' },
            { Icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
            { Icon: Twitter, label: 'Twitter / X', color: '#ccc' },
          ].map(({ Icon, label, color }) => (
            <span key={label} className="flex items-center gap-2 text-[13px] text-gray-400">
              <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
              {label}
            </span>
          ))}
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-700">via Ayrshare</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────── */

function Pricing() {
  return (
    <section id="plans" style={{ backgroundColor: '#000' }}>
      <div className="mx-auto max-w-5xl px-6 py-28 md:py-36">
        <div className="mb-16">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: G }}>Pricing</p>
          <h2 className="font-sans text-4xl font-black leading-[0.94] tracking-tight text-white md:text-5xl">
            Simple Pricing.<br />
            <span style={{ color: G }}>No Hidden Fees.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-500">
            Pay for projects, not headcount. No call centre overhead. Cancel anytime. All plans include onboarding support.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className="group relative overflow-hidden rounded-2xl border p-8 transition-all duration-300"
              style={{ backgroundColor: plan.hero ? '#0a0a0a' : '#070707', borderColor: plan.hero ? G28 : W08 }}>
              {/* Highlighted top line */}
              {plan.hero && (
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${G}, transparent)` }} />
              )}
              {/* Hover glow */}
              <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                style={{ background: plan.hero ? 'radial-gradient(ellipse at top, rgba(212,175,55,0.05), transparent 60%)' : 'none' }} />

              {plan.hero && (
                <div className="absolute right-7 top-7">
                  <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: G, color: '#000' }}>Most popular</span>
                </div>
              )}

              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: plan.hero ? G : 'rgba(255,255,255,0.25)' }}>{plan.name}</p>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="font-sans text-5xl font-black tracking-tight text-white">{plan.price}</span>
                  <span className="mb-1.5 text-[13px] text-gray-600">{plan.billing}</span>
                </div>
                <p className="mt-2 text-[14px] text-gray-500">{plan.tagline}</p>

                <div className="my-8 h-px" style={{ backgroundColor: W06 }} />

                <ul className="space-y-3.5">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-gray-300">
                      <Check className="mt-0.5 h-4 w-4 flex-none" style={{ color: G }} strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/request-access"
                  className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-[14px] font-bold transition-all hover:opacity-90"
                  style={plan.hero
                    ? { backgroundColor: G, color: '#000' }
                    : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#d1d5db', border: `1px solid ${W08}` }}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[13px] text-gray-600">
          Need more than 5 projects?{' '}
          <Link href="/request-access" className="underline underline-offset-2 transition-colors hover:text-gray-400" style={{ color: G }}>
            Talk to us about enterprise pricing.
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="px-6 pb-28 md:pb-36" style={{ backgroundColor: '#000' }}>
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border px-8 py-24 text-center md:px-16"
          style={{ backgroundColor: '#070707', borderColor: G28 }}>
          {/* Top + bottom hairlines */}
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${G}, transparent)` }} />
          <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(to right, transparent, rgba(212,175,55,0.30), transparent)` }} />
          {/* Background glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(212,175,55,0.08), transparent 55%)' }} />

          <div className="relative">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.30em]" style={{ color: G }}>Voice · Ads · Social · CRM</p>
            <h2 className="font-sans text-4xl font-black leading-[0.94] tracking-tight text-white md:text-6xl">
              The Full Engine.<br />
              <span style={{ color: G }}>Live in a Day.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-gray-500">
              Add your API keys and the acquisition engine starts running — calls, drips, ad creatives, and social posts on autopilot.
            </p>
            <Link href="/request-access"
              className="group mt-9 inline-flex items-center gap-2.5 rounded-xl px-9 py-4 text-[15px] font-bold transition-all hover:scale-[1.01] hover:shadow-[0_0_32px_rgba(212,175,55,0.22)]"
              style={{ backgroundColor: G, color: '#000' }}>
              Request Early Access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t" style={{ backgroundColor: '#000', borderColor: G18 }}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border text-sm font-black" style={{ borderColor: G28, color: G, backgroundColor: G10 }}>⬡</span>
          <span className="font-serif font-bold tracking-wide" style={{ color: G }}>Realty Engine</span>
        </div>
        <div className="flex items-center gap-8 text-[13px]">
          <Link href="/login" className="text-gray-600 transition-colors hover:text-gray-400">Sign in</Link>
          <Link href="/request-access" className="transition-colors hover:text-gray-400" style={{ color: G }}>Request access</Link>
          <span className="text-gray-700">© {new Date().getFullYear()} Realty Engine</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#000' }}>
      <Navbar />
      <Hero />
      <Stats />
      <Pipeline />
      <Modules />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  );
}
