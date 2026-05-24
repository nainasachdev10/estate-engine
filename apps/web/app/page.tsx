import Link from 'next/link';
import {
  Phone,
  MessageSquare,
  Target,
  Megaphone,
  LayoutDashboard,
  LineChart,
  ArrowRight,
  Zap,
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

const STATS = [
  { value: '< 60s', label: 'First AI call', sub: 'From form fill' },
  { value: '3×', label: 'More site visits', sub: 'vs industry avg' },
  { value: '10', label: 'Modules live', sub: 'Full stack built' },
  { value: '24/7', label: 'Always active', sub: 'Pipeline never sleeps' },
];

// Complete end-to-end pipeline steps — all 10 layers visible
const PIPELINE_STEPS = [
  {
    num: '01',
    tag: 'Lead Generation',
    title: 'Lead arrives from any source',
    body: 'Meta, Google, Magicbricks, 99acres, or your own landing page. Every form fill lands in the pipeline instantly.',
    color: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  {
    num: '02',
    tag: 'AI Voice',
    title: 'AI calls in under 60 seconds',
    body: 'Bolna dials the lead in Hinglish. Qualifies intent, budget, and timeline. Transcript and score saved automatically.',
    color: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  {
    num: '03',
    tag: 'Scoring',
    title: 'Claude scores the lead 0–100',
    body: 'Every call transcript is read by Claude. Low scores go to nurture. High scores escalate to your sales team immediately.',
    color: 'text-green-300',
    dot: 'bg-green-400',
  },
  {
    num: '04',
    tag: 'WhatsApp + Email',
    title: 'Personalised drip sequence starts',
    body: 'Brochure, site video, price sheet, and testimonials sent over WhatsApp and email — timed to buyer psychology.',
    color: 'text-purple-300',
    dot: 'bg-purple-400',
  },
  {
    num: '05',
    tag: 'Site Visit',
    title: 'Site visit booked automatically',
    body: 'Calendar link goes out in WhatsApp. Slot confirmed. Sales team gets the lead with full transcript and context attached.',
    color: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  {
    num: '06',
    tag: 'AI Ads',
    title: 'Claude writes your ad creatives',
    body: '10 Meta, Google, and 99acres ad variants per project — headline, primary text, CTA. Launch directly to Meta Ads Manager in one click.',
    color: 'text-orange-300',
    dot: 'bg-orange-400',
  },
  {
    num: '07',
    tag: 'Social Media',
    title: '30 days of posts, generated instantly',
    body: 'Claude writes Instagram, Facebook, LinkedIn, and Twitter content for each project. Approve once, Ayrshare publishes on schedule.',
    color: 'text-pink-300',
    dot: 'bg-pink-400',
  },
];

const FEATURES = [
  {
    icon: Phone,
    tag: 'Voice AI',
    title: 'Hinglish Voice Agent',
    description: 'Bolna-powered agent calls every new lead within 60 seconds. Natural Hinglish conversation — qualifies intent, budget, and timeline automatically.',
    highlight: true,
  },
  {
    icon: MessageSquare,
    tag: 'WhatsApp',
    title: 'WhatsApp Sequences',
    description: 'Meta-approved template messages followed by free-form drip — brochures, site videos, price sheets — on the channel Indian buyers actually read.',
    highlight: false,
  },
  {
    icon: Mail,
    tag: 'Email',
    title: 'Email Drip (Brevo)',
    description: 'Personalised email sequences written by Claude. Subject lines and body copy tailored per project and lead profile. Delivery and read tracking built in.',
    highlight: false,
  },
  {
    icon: Brain,
    tag: 'AI Brain',
    title: 'Claude Lead Scoring',
    description: 'Every call and message analysed by Claude Sonnet. Each lead gets a 0–100 score. Your sales floor only touches leads worth touching.',
    highlight: false,
  },
  {
    icon: Megaphone,
    tag: 'Ads',
    title: 'AI Ad Generator',
    description: 'Claude writes 10 ad creative variants per project — Meta, Google, and 99acres. Launch directly to Meta Ads Manager with one click. No agency needed.',
    highlight: true,
  },
  {
    icon: Share2,
    tag: 'Social',
    title: 'Social Media Scheduler',
    description: 'Claude generates 30 days of Instagram, Facebook, LinkedIn, and Twitter posts per project. Approve in bulk, Ayrshare publishes on schedule.',
    highlight: true,
  },
  {
    icon: LayoutDashboard,
    tag: 'CRM',
    title: 'Real-Time Pipeline',
    description: 'Kanban board across 7 stages. Kanban + table view. One-click manual call trigger. 30-second auto-refresh. Supabase — you own the data.',
    highlight: false,
  },
  {
    icon: Target,
    tag: 'Analytics',
    title: 'Pipeline Analytics',
    description: 'Funnel bars, stage conversion rates, source attribution (which campaign brings the best leads), voice stats, and messaging engagement — all in one view.',
    highlight: false,
  },
  {
    icon: LineChart,
    tag: 'Portal',
    title: 'Client Portal',
    description: 'Branded read-only dashboard for each developer client. They see their pipeline, call summaries, and lead counts — no admin access, no extra seats.',
    highlight: false,
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '₹49,999',
    per: '/month',
    description: 'One project. Full AI acquisition loop.',
    features: [
      '1 developer project',
      '500 AI voice calls/mo',
      'WhatsApp + email drip',
      'AI lead scoring',
      'Basic analytics dashboard',
      'Client portal (read-only)',
    ],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '₹99,999',
    per: '/month',
    description: 'Multi-project. Ads + Social included.',
    features: [
      'Up to 5 developer projects',
      '2,000 AI voice calls/mo',
      'AI ad creative generation',
      'Social media scheduler (30 days)',
      'Full analytics + source attribution',
      'Meta campaign launch (1-click)',
      'Dedicated onboarding support',
    ],
    cta: 'Book a demo',
    highlighted: true,
  },
];

/* ─── Mini dashboard preview in hero ───────────────────────── */

function DashboardPreview() {
  const cols = [
    { label: 'New', dot: 'bg-blue-400', leads: [{ n: 'R*** S***', p: 'Prestige Hills', s: 82 }] },
    { label: 'Contacted', dot: 'bg-amber-400', leads: [{ n: 'A*** K***', p: 'Sobha Greens', s: 65 }, { n: 'V*** M***', p: 'DLF Camellias', s: 58 }] },
    { label: 'Qualified', dot: 'bg-green-400', leads: [{ n: 'M*** P***', p: 'Prestige Hills', s: 91 }] },
    { label: 'Site Visit', dot: 'bg-purple-400', leads: [{ n: 'S*** V***', p: 'Sobha Greens', s: 78 }] },
  ];

  return (
    <div
      className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
      style={{ backgroundColor: '#111', borderColor: 'rgba(212,175,55,0.22)' }}
    >
      {/* chrome bar */}
      <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-amber-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-3 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Live · Realty Engine Dashboard</span>
        </span>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-4 divide-x divide-white/5 border-b border-white/5">
        {[{ v: '12', l: "Today's Leads" }, { v: '4', l: 'Qualified' }, { v: '9', l: 'Calls Made' }, { v: '74', l: 'Avg Score' }].map((s) => (
          <div key={s.l} className="px-5 py-3 text-center">
            <p className="font-bold" style={{ color: '#d4af37', fontSize: '1.25rem' }}>{s.v}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-500">{s.l}</p>
          </div>
        ))}
      </div>

      {/* kanban */}
      <div className="grid grid-cols-4 gap-3 p-4">
        {cols.map((col) => (
          <div key={col.label} className="rounded-lg border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{col.label}</span>
              </div>
              <span className="font-mono text-[10px] text-gray-600">{col.leads.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {col.leads.map((l) => (
                <div key={l.n} className="rounded-md border p-2" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-medium text-white">{l.n}</p>
                  <p className="mt-0.5 truncate text-[10px] text-gray-500">{l.p}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">2m ago</span>
                    <span className="rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold"
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

      {/* bottom strip — shows Ads + Social modules */}
      <div className="flex items-center gap-3 border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] uppercase tracking-wider text-gray-600">Also active:</span>
        {[
          { label: 'Ad Engine', dot: 'bg-orange-400' },
          { label: 'Social Calendar', dot: 'bg-pink-400' },
          { label: 'Analytics', dot: 'bg-gold' },
        ].map((m) => (
          <span key={m.label} className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/3 px-2.5 py-1 text-[10px] text-gray-300">
            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Sections ──────────────────────────────────────────────── */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur" style={{ backgroundColor: 'rgba(10,10,10,0.88)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border text-base font-bold"
            style={{ borderColor: 'rgba(212,175,55,0.35)', color: '#d4af37', backgroundColor: 'rgba(212,175,55,0.08)' }}>
            ⬡
          </span>
          <span className="font-serif text-xl font-bold tracking-tight" style={{ color: '#d4af37' }}>Realty Engine</span>
        </Link>
        <nav className="flex items-center gap-6">
          {['#pipeline', '#features', '#pricing'].map((href) => (
            <a key={href} href={href} className="hidden text-sm text-gray-400 transition-colors hover:text-white md:inline capitalize">
              {href.replace('#', '')}
            </a>
          ))}
          <Link href="/login" className="rounded-md px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
            Sign in →
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 14px)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.12), transparent 70%)' }} />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ borderColor: 'rgba(212,175,55,0.30)', color: '#d4af37', backgroundColor: 'rgba(212,175,55,0.07)' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#d4af37', boxShadow: '0 0 10px rgba(212,175,55,0.9)' }} />
          10 modules · Voice · Ads · Social · WhatsApp · Email · CRM
        </span>

        <h1 className="mt-7 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-[5.5rem]">
          The complete AI
          <br />
          <span style={{ color: '#d4af37' }}>real estate engine</span>
          <br />
          for India
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
          AI voice calling · Ad creative generation · 30-day social media scheduling ·
          WhatsApp + email drip · Real-time pipeline. All in one platform.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {['AI calls in < 60s', 'Claude writes your ads', 'Auto social posting', '3× site visits'].map((pill) => (
            <span key={pill} className="rounded-full border px-4 py-1.5 text-xs font-medium"
              style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#e5e7eb', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              {pill}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="group inline-flex w-full items-center justify-center gap-2 rounded-md px-8 py-3.5 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto"
            style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
            Get access
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a href="#pipeline" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5 sm:w-auto">
            See the full pipeline →
          </a>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="border-y" style={{ borderColor: 'rgba(212,175,55,0.12)' }}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/5 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="px-6 py-10 text-center">
            <p className="font-serif text-4xl font-bold md:text-5xl" style={{ color: '#d4af37' }}>{s.value}</p>
            <p className="mt-2 text-sm font-medium text-white">{s.label}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-600">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section id="pipeline" className="relative">
      <div className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#d4af37' }}>Full pipeline</p>
          <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">
            Every module, end to end.
          </h2>
          <p className="mt-4 text-gray-400">
            From the first ad impression to a closed deal — and back to the top of the funnel with fresh content.
          </p>
        </div>

        <div className="relative mt-16">
          {/* vertical connector line */}
          <div aria-hidden className="absolute left-7 top-8 hidden h-[calc(100%-3rem)] w-px md:block"
            style={{ background: 'linear-gradient(to bottom, rgba(212,175,55,0.4), rgba(212,175,55,0.05))' }} />

          <div className="space-y-5">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.num} className="relative flex items-start gap-5 md:gap-6">
                <div className="relative z-10 flex h-14 w-14 flex-none items-center justify-center rounded-full border"
                  style={{ borderColor: 'rgba(212,175,55,0.35)', backgroundColor: i === 0 ? 'rgba(212,175,55,0.1)' : '#1a1a1a' }}>
                  <span className={`flex h-2 w-2 rounded-full ${step.dot}`} />
                </div>
                <div className="flex-1 rounded-xl border p-5 transition-colors hover:border-white/10"
                  style={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${step.color}`}
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      {step.tag}
                    </span>
                    <h3 className="font-medium text-white">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="relative" style={{ backgroundColor: '#0d0d0d' }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundColor: 'rgba(212,175,55,0.12)' }} />
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#d4af37' }}>What you get</p>
          <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">
            The full stack. All 10 modules.
          </h2>
          <p className="mt-4 text-gray-400 md:text-lg">
            Voice · WhatsApp · Email · Ads · Social · CRM · Analytics · Portal — wired together.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title}
                className="group relative rounded-xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  backgroundColor: f.highlight ? 'rgba(212,175,55,0.04)' : '#1a1a1a',
                  borderColor: f.highlight ? 'rgba(212,175,55,0.28)' : 'rgba(255,255,255,0.06)',
                }}>
                {f.highlight && (
                  <span className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#d4af37' }}>
                    {f.tag}
                  </span>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border"
                  style={{ borderColor: 'rgba(212,175,55,0.2)', backgroundColor: 'rgba(212,175,55,0.07)' }}>
                  <Icon className="h-5 w-5" style={{ color: '#d4af37' }} />
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-600">{!f.highlight ? f.tag : ''}</p>
                <h3 className="mt-3 font-medium text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.description}</p>
              </div>
            );
          })}
        </div>

        {/* Social platforms strip */}
        <div className="mt-10 flex items-center justify-center gap-6 rounded-xl border border-white/6 bg-[#1a1a1a] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Social publishing to</p>
          {[
            { Icon: Instagram, label: 'Instagram', color: '#E1306C' },
            { Icon: Facebook, label: 'Facebook', color: '#1877F2' },
            { Icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
            { Icon: Twitter, label: 'Twitter / X', color: '#fff' },
          ].map(({ Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="hidden text-xs text-gray-400 sm:inline">{label}</span>
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-600">via Ayrshare</span>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundColor: 'rgba(212,175,55,0.10)' }} />
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#d4af37' }}>Pricing</p>
          <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">Simple, transparent.</h2>
          <p className="mt-4 text-gray-400">No per-seat fees. No call center overhead. Pay for projects, not headcount.</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {PRICING.map((plan) => (
            <div key={plan.name} className="relative rounded-2xl border p-8"
              style={{
                backgroundColor: plan.highlighted ? 'rgba(212,175,55,0.05)' : '#1a1a1a',
                borderColor: plan.highlighted ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)',
                boxShadow: plan.highlighted ? '0 0 40px rgba(212,175,55,0.08)' : undefined,
              }}>
              {plan.highlighted && (
                <span className="absolute right-6 top-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
                  Most Popular
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{plan.name}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-serif text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-500">{plan.per}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                    <Check className="mt-0.5 h-4 w-4 flex-none" style={{ color: '#d4af37' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold transition-all hover:opacity-90"
                style={plan.highlighted
                  ? { backgroundColor: '#d4af37', color: '#0a0a0a' }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }}>
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-600">
          All plans include onboarding support. Enterprise pricing for 10+ projects.
        </p>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="px-6 pb-24 md:pb-32">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border px-8 py-16 text-center md:px-16 md:py-20"
          style={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(212,175,55,0.20)' }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 18px)' }} />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundColor: '#d4af37', opacity: 0.25 }} />
          <div className="relative">
            <Zap className="mx-auto mb-5 h-10 w-10" style={{ color: '#d4af37' }} />
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
              Voice · Ads · Social · CRM
              <br />
              all live today.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-gray-400 md:text-lg">
              Wire your Supabase, add your API keys, and the entire acquisition engine starts running — calls, drips, ads, and social posts on autopilot.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md px-8 py-3.5 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto"
                style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}>
                Get access <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-gray-500 md:flex-row">
        <p>
          <span style={{ color: '#d4af37' }} className="font-serif font-bold">Realty Engine</span>
          {' '}· Voice · Ads · Social · CRM · India
        </p>
        <div className="flex items-center gap-6">
          <Link href="/login" className="transition-colors hover:text-gray-300">Sign in</Link>
          <p>© {new Date().getFullYear()} Realty Engine</p>
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
      <StatsBar />
      <Pipeline />
      <Features />
      <Pricing />
      <Cta />
      <Footer />
    </main>
  );
}
