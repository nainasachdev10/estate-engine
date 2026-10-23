'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  motion, useScroll, useTransform, useInView, animate,
  type Variants,
} from 'framer-motion';
import {
  Phone, MessageSquare, Target, Megaphone, LayoutDashboard,
  LineChart, ArrowRight, Brain, Check, Share2, Mail,
  Instagram, Facebook, Linkedin, Twitter,
} from 'lucide-react';
import { LogoMark } from '../logo';

/* ─── Brand tokens ──────────────────────────────────────────── */
const G = '#D4AF37';
const G_LIGHT = '#F0D879';
const G_DEEP = '#A9842A';
const GOLD_GRAD = `linear-gradient(135deg, ${G_LIGHT} 0%, ${G} 52%, ${G_DEEP} 100%)`;
const G06 = 'rgba(212,175,55,0.06)';
const G10 = 'rgba(212,175,55,0.10)';
const G18 = 'rgba(212,175,55,0.18)';
const G28 = 'rgba(212,175,55,0.28)';
const W06 = 'rgba(255,255,255,0.06)';
const W08 = 'rgba(255,255,255,0.08)';

/* ─── Motion primitives ─────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

function Reveal({
  children, className, delay = 0, y = 26, as = 'div',
}: {
  children: React.ReactNode; className?: string; delay?: number; y?: number; as?: 'div' | 'section';
}) {
  const Comp = as === 'section' ? motion.section : motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

function Counter({
  to, prefix = '', suffix = '', decimals = 0,
}: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.5, ease: EASE, onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);
  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

/* ─── Scroll helpers ────────────────────────────────────────── */
function useScrolled(threshold = 24) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => scrollY.on('change', (v) => setScrolled(v > threshold)), [scrollY, threshold]);
  return scrolled;
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids]);
  return active;
}

/* ─── Data ──────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'A lead arrives', body: 'Meta, Google, 99acres, or your own site. Every form fill enters the pipeline in real time, with no manual entry.' },
  { n: '02', title: 'AI calls in under 60 seconds', body: 'A Hinglish voice agent dials the lead immediately. Budget, timeline, and intent are captured before your team even sees the notification.' },
  { n: '03', title: 'AI agent scores the conversation', body: 'Every transcript is read by the agent and scored from 0 to 100. Above 70 goes to sales. Below 70 enters nurture automatically.' },
  { n: '04', title: 'The drip runs itself', body: 'Brochure, project video, price sheet, and testimonials, sequenced across WhatsApp and email on proven buyer timing.' },
  { n: '05', title: 'A site visit is booked on WhatsApp', body: 'A calendar link is sent at the right moment. Your sales team receives the lead with the full transcript and score attached.' },
  { n: '06', title: 'AI writes your ad creatives', body: '10 ad variants per project for Meta, Google, and 99acres. Reviewed once, then pushed to Ads Manager in a single click.' },
  { n: '07', title: 'A month of social, queued', body: 'Instagram, Facebook, LinkedIn, and X content generated per project. Approve in bulk, and publishing runs on schedule.' },
];

const PRIMARY_FEATURES = [
  { icon: Phone, tag: 'Voice AI', title: 'Hinglish Voice Agent', body: 'Your AI calls every lead within 60 seconds in natural Hinglish. It qualifies intent, captures budget and timeline, and routes the lead automatically. No BPO, no call centre, no delay.' },
  { icon: Megaphone, tag: 'Ad Creative', title: 'AI Ad Generator', body: 'Claude writes 10 ad variants per project for Meta, Google, and 99acres. Headlines, descriptions, and hooks tailored to the property, then pushed straight to Ads Manager.' },
  { icon: Share2, tag: 'Social Media', title: 'Social Scheduler', body: '30 days of Instagram, Facebook, LinkedIn, and X content per project. Approve in bulk. Your brand stays consistent even when your team is offline.' },
];

const SECONDARY_FEATURES = [
  { icon: MessageSquare, tag: 'WhatsApp', title: 'WhatsApp Sequences', body: 'Template first, then free form, on the channel Indian buyers actually answer. Timed to the conversation window.' },
  { icon: Mail, tag: 'Email', title: 'AI Email Drip', body: 'Claude written emails tailored per project. Sent on buyer timing, with open and click tracking.' },
  { icon: Brain, tag: 'AI Scoring', title: 'Lead Intelligence', body: 'Every call scored from 0 to 100. Your sales floor only touches the leads worth their time.' },
  { icon: LayoutDashboard, tag: 'CRM', title: 'Live Pipeline', body: 'Kanban across every stage, plus a table view, one click call trigger, and auto refresh every 30 seconds.' },
  { icon: Target, tag: 'Analytics', title: 'Funnel Analytics', body: 'Stage conversion, source attribution, voice stats, and messaging engagement in one view.' },
  { icon: LineChart, tag: 'Portal', title: 'Client Portal', body: 'A branded, read only dashboard per developer. They see their pipeline and numbers, with no admin access.' },
];

/* ─── Micro mockups ─────────────────────────────────────────── */
function VoiceMockup() {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border" style={{ borderColor: G18, backgroundColor: '#0E0E10' }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: W06 }}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" style={{ animation: 'ping-slow 1.6s ease-in-out infinite' }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Live call · 00:43</span>
        </div>
        <span className="rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold" style={{ backgroundColor: G10, color: G }}>Score 82</span>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold text-white">Rahul S. enquiry, Prestige Hills</p>
        <p className="mt-0.5 text-[10px] text-gray-600">Called 43 seconds after the form fill</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[{ l: 'Budget', v: '₹1.2 to 1.5Cr', hi: false }, { l: 'Timeline', v: '3 months', hi: false }, { l: 'Status', v: 'Qualified', hi: true }].map(({ l, v, hi }) => (
            <div key={l} className="rounded-lg border p-2.5" style={{ borderColor: W06, backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <p className="text-[8px] font-medium uppercase tracking-wider text-gray-600">{l}</p>
              <p className="mt-0.5 text-[11px] font-bold" style={{ color: hi ? '#4ade80' : 'white' }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" style={{ background: GOLD_GRAD }} initial={{ width: 0 }} whileInView={{ width: '82%' }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
          </div>
          <span className="font-mono text-[9px] text-gray-600">82 / 100</span>
        </div>
      </div>
    </div>
  );
}

function AdsMockup() {
  const items = [
    { label: 'Meta story', metric: 'CTR 2.4%', grad: `linear-gradient(135deg, ${G10}, transparent)` },
    { label: 'Meta feed', metric: 'CTR 1.8%', grad: 'linear-gradient(135deg, rgba(99,102,241,0.14), transparent)' },
    { label: 'Google search', metric: 'CTR 3.1%', grad: 'linear-gradient(135deg, rgba(52,211,153,0.12), transparent)' },
    { label: '99acres', metric: '14 leads', grad: 'linear-gradient(135deg, rgba(248,113,113,0.12), transparent)' },
  ];
  return (
    <div className="mt-7 grid grid-cols-2 gap-2">
      {items.map(({ label, metric, grad }) => (
        <div key={label} className="overflow-hidden rounded-xl border transition-colors" style={{ borderColor: W08, backgroundColor: '#0E0E10' }}>
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
    <div className="mt-7 overflow-hidden rounded-xl border" style={{ borderColor: W08, backgroundColor: '#0E0E10' }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: W06 }}>
        <span className="text-[10px] font-semibold text-gray-500">Week 3, December</span>
        <span className="text-[10px] font-bold" style={{ color: G }}>5 of 7 scheduled</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {week.map(({ d, has }, i) => (
            <div key={i} className="text-center">
              <p className="mb-2 text-[8px] font-medium text-gray-700">{d}</p>
              <div className="mx-auto flex h-9 w-full items-center justify-center rounded-lg border" style={{ borderColor: has ? G28 : W06, backgroundColor: has ? G10 : 'rgba(255,255,255,0.02)' }}>
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

function DashboardPreview() {
  const cols = [
    { label: 'New', color: '#60a5fa', count: 5, leads: [{ n: 'R. Sharma', p: 'Prestige Hills', s: 82, t: '2m' }, { n: 'K. Patel', p: 'DLF Camellias', s: 73, t: '11m' }] },
    { label: 'Contacted', color: '#fbbf24', count: 8, leads: [{ n: 'A. Kapoor', p: 'Sobha Greens', s: 65, t: '1h' }] },
    { label: 'Qualified', color: '#34d399', count: 3, leads: [{ n: 'M. Iyer', p: 'Prestige Hills', s: 91, t: '3h' }] },
  ];
  return (
    <div className="relative w-full overflow-hidden rounded-md border shadow-[0_40px_100px_rgba(0,0,0,0.7)]" style={{ backgroundColor: '#131315', borderColor: '#26262A' }}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${G} 60%, ${G_LIGHT})` }} />
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
      <div className="grid grid-cols-4 divide-x border-b" style={{ borderColor: W06 }}>
        {[{ v: '14', l: 'Leads today' }, { v: '6', l: 'Qualified' }, { v: '81', l: 'Avg score' }, { v: '₹2.4Cr', l: 'Pipeline' }].map(({ v, l }) => (
          <div key={l} className="px-3 py-2.5 text-center">
            <p className="font-display text-base font-semibold" style={{ color: G }}>{v}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-wider text-gray-600">{l}</p>
          </div>
        ))}
      </div>
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
                <div key={l.n} className="rounded-lg border p-2" style={{ backgroundColor: '#0E0E10', borderColor: W06 }}>
                  <p className="text-[10px] font-semibold text-white">{l.n}</p>
                  <p className="mt-0.5 truncate text-[8px] text-gray-600">{l.p}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-gray-700">{l.t} ago</span>
                    <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-black" style={{ backgroundColor: l.s >= 80 ? 'rgba(52,211,153,0.10)' : l.s >= 65 ? G10 : 'rgba(255,255,255,0.05)', color: l.s >= 80 ? '#4ade80' : l.s >= 65 ? G : '#9ca3af' }}>{l.s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t px-3 py-2" style={{ borderColor: W06 }}>
        <span className="text-[8px] uppercase tracking-wider text-gray-700">Modules active</span>
        {[{ label: 'Voice AI', c: '#34d399' }, { label: 'Ad Engine', c: '#f97316' }, { label: 'Social', c: '#ec4899' }, { label: 'Analytics', c: G }].map(({ label, c }) => (
          <span key={label} className="rounded px-2 py-0.5 text-[8px] font-semibold" style={{ color: c, backgroundColor: 'rgba(255,255,255,0.03)' }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Ember background ──────────────────────────────────────── */
// One warm heat source (top right) over a hairline blueprint grid.
function Ember() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hairline-grid absolute inset-0" style={{ maskImage: 'radial-gradient(ellipse 90% 70% at 60% 30%, #000 30%, transparent 85%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 60% 30%, #000 30%, transparent 85%)' }} />
      <motion.div
        className="absolute -right-[15%] -top-[25%] h-[70vw] w-[70vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.13), rgba(169,132,42,0.05) 35%, transparent 62%)' }}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* ─── Shared bits ───────────────────────────────────────────── */
const HAIRLINE = '#26262A';
const INK = '#0B0B0C';
const GRAPHITE = '#131315';

function SpecTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500">
      <span style={{ color: G }}>//</span> {children}
    </p>
  );
}

const BTN_PRIMARY = 'group inline-flex bg-gold items-center gap-2.5 rounded-md px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-[#E6C55A]';
const BTN_SECONDARY = 'inline-flex items-center gap-2 rounded-md border px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-gray-200 transition-colors hover:border-[rgba(212,175,55,0.5)] hover:text-white';

/* ─── Navbar ────────────────────────────────────────────────── */
const NAV = [
  { id: 'how-it-works', label: 'Pipeline' },
  { id: 'modules', label: 'Features' },
];

function Navbar() {
  const scrolled = useScrolled();
  const active = useActiveSection(['how-it-works', 'modules']);
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(11,11,12,0.85)' : 'rgba(11,11,12,0)',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between border-b" style={{ borderColor: HAIRLINE }}>
          <Link href="/" className="group flex items-center gap-2.5">
            <LogoMark size={28} className="transition-transform duration-300 group-hover:rotate-[8deg]" />
            <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-white">Realty Engine</span>
          </Link>
          <nav className="hidden h-full items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`}
                className="relative flex h-full items-center text-[13.5px] font-medium transition-colors hover:text-white"
                style={{ color: active === item.id ? '#fff' : '#8B8B92' }}>
                {item.label}
                {active === item.id && (
                  <motion.span layoutId="nav-active" className="absolute inset-x-0 -bottom-px h-[2px]" style={{ backgroundColor: G }} transition={{ duration: 0.4, ease: EASE }} />
                )}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-400 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link href="/request-access"
              className="group hidden items-center gap-2 rounded-md bg-gold px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-[#E6C55A] sm:inline-flex">
              Request access
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────── */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const previewOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section ref={ref} className="relative min-h-[94vh] overflow-hidden" style={{ backgroundColor: INK }}>
      <Ember />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56" style={{ background: `linear-gradient(to bottom, transparent, ${INK})` }} />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-32 md:pt-40">
        <div className="grid items-center gap-16 md:grid-cols-[1.3fr_1fr] lg:gap-16">
          <motion.div className="flex flex-col" variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="mb-8 inline-flex w-fit items-center gap-2.5 rounded-sm border px-2.5 py-1" style={{ borderColor: 'rgba(212,175,55,0.45)', backgroundColor: G06 }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" style={{ animation: 'ping-slow 1.8s ease-in-out infinite' }} />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: G }}>India&apos;s AI acquisition engine</span>
            </motion.div>

            <h1 className="font-display font-bold leading-[0.95] tracking-[-0.035em] text-white" style={{ fontSize: 'clamp(2.6rem, 5.2vw, 4.6rem)' }}>
              <motion.span variants={fadeUp} className="block">Turn property leads</motion.span>
              <motion.span variants={fadeUp} className="block">into booked visits.</motion.span>
              <motion.span variants={fadeUp} className="block whitespace-nowrap" style={{ color: G }}>Fully automated<span className="cursor-block" aria-hidden /></motion.span>
            </h1>

            <motion.p variants={fadeUp} className="mt-7 text-[17px] leading-relaxed text-gray-400" style={{ maxWidth: '48ch' }}>
              <span className="font-medium text-white">Voice calling, AI scoring, WhatsApp drips,</span> ad creatives, and social scheduling. One platform runs your entire acquisition funnel, around the clock.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
              <Link href="/request-access" className={BTN_PRIMARY}>
                Request early access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className={BTN_SECONDARY} style={{ borderColor: HAIRLINE, backgroundColor: GRAPHITE }}>
                See how it works
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-12 grid grid-cols-2 border-t pt-6 sm:grid-cols-4" style={{ borderColor: HAIRLINE }}>
              {['Under 60s first call', 'Claude written ads', '30 day social calendar', '3x more site visits'].map((t, i) => (
                <span key={t} className={`flex items-start gap-2 py-1 pr-3 text-[12.5px] leading-snug text-gray-500 ${i > 0 ? 'sm:border-l sm:pl-4' : ''}`} style={{ borderColor: HAIRLINE }}>
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none" style={{ color: G }} strokeWidth={2.5} />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div className="relative" style={{ y: previewY, opacity: previewOpacity }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.3 }}>
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats ─────────────────────────────────────────────────── */
function Stats() {
  const stats: { value: React.ReactNode; label: string; desc: string }[] = [
    { value: <><span className="align-top text-2xl">&lt;</span><Counter to={60} /><span className="ml-1 text-lg text-gray-500">s</span></>, label: 'First AI call after a form fill', desc: '21x higher conversion' },
    { value: <><Counter to={3} /><span className="ml-0.5 text-lg text-gray-500">x</span></>, label: 'More site visits booked', desc: 'versus the industry average' },
    { value: <Counter to={10} />, label: 'AI modules, live instantly', desc: 'nothing to configure' },
    { value: '24 / 7', label: 'Pipeline never sleeps', desc: 'calls respect quiet hours' },
  ];
  return (
    <div style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 border-y md:grid-cols-4" style={{ borderColor: HAIRLINE }}>
          {stats.map(({ value, label, desc }, i) => (
            <Reveal key={label} delay={i * 0.08} className={`flex flex-col gap-1 px-6 py-9 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">{String(i + 1).padStart(2, '0')}</span>
              <span className="mt-2 font-display text-4xl font-medium tracking-[-0.03em] text-white md:text-5xl">{value}</span>
              <span className="mt-2 text-[13px] font-medium text-gray-300">{label}</span>
              <span className="font-mono text-[11px]" style={{ color: G }}>{desc}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Section header ────────────────────────────────────────── */
function SectionHeader({ index, eyebrow, title, accent, copy }: { index: string; eyebrow: string; title: string; accent: string; copy: string }) {
  return (
    <div className="mb-14 border-b pb-10" style={{ borderColor: HAIRLINE }}>
      <Reveal>
        <SpecTag>{index} · {eyebrow}</SpecTag>
      </Reveal>
      <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-end">
        <Reveal>
          <h2 className="font-display text-4xl font-bold uppercase leading-[0.98] tracking-[-0.02em] text-white md:text-[56px]">
            {title}<br /><span style={{ color: G }}>{accent}</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-md text-[15px] leading-relaxed text-gray-500 md:ml-auto">{copy}</p>
        </Reveal>
      </div>
    </div>
  );
}

/* ─── Pipeline (drawing timeline) ───────────────────────────── */
function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.7', 'end 0.6'] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how-it-works" className="relative scroll-mt-20" style={{ backgroundColor: INK }}>
      <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
        <SectionHeader index="01" eyebrow="The pipeline" title="Every step," accent="end to end." copy="From the first impression to a closed deal, and back to the top with fresh ads and social content." />

        <div ref={ref} className="relative pl-8 md:pl-0">
          {/* spine */}
          <div className="absolute left-[11px] top-2 h-full w-px md:left-1/2 md:-translate-x-1/2" style={{ backgroundColor: HAIRLINE }} />
          <motion.div className="absolute left-[11px] top-2 w-px origin-top md:left-1/2 md:-translate-x-1/2" style={{ height: '100%', backgroundColor: G, scaleY: lineScale }} />

          <div className="space-y-5">
            {STEPS.map((step, i) => {
              const left = i % 2 === 0;
              return (
                <Reveal key={step.n} className={`relative md:flex ${left ? 'md:justify-start' : 'md:justify-end'}`}>
                  {/* node */}
                  <span className="absolute left-[-26px] top-6 flex h-6 w-6 items-center justify-center rounded-sm border md:left-1/2 md:-translate-x-1/2" style={{ borderColor: 'rgba(212,175,55,0.5)', backgroundColor: INK }}>
                    <span className="h-1.5 w-1.5" style={{ backgroundColor: G }} />
                  </span>
                  <div className="group relative w-full overflow-hidden rounded-md border transition-colors duration-200 hover:border-[rgba(212,175,55,0.45)] md:w-[46%]" style={{ backgroundColor: GRAPHITE, borderColor: HAIRLINE }}>
                    <div className="flex items-center justify-between border-b px-5 py-2.5" style={{ borderColor: HAIRLINE }}>
                      <span className="font-mono text-[11px] tracking-[0.16em]" style={{ color: G }}>STEP {step.n}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">auto</span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-[17px] font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-gray-500">{step.body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Modules ───────────────────────────────────────────────── */
function Modules() {
  return (
    <section id="modules" className="scroll-mt-20" style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">
        <SectionHeader index="02" eyebrow="The modules" title="Every tool" accent="you need." copy="Voice, ads, social, WhatsApp, email, CRM, analytics, and a client portal. All wired together, with nothing to configure." />

        <motion.div className="grid gap-4 md:grid-cols-3" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          {PRIMARY_FEATURES.map((f, i) => {
            const Icon = f.icon;
            const Mockup = [VoiceMockup, AdsMockup, SocialMockup][i];
            return (
              <motion.div key={f.title} variants={fadeUp} className="group relative flex flex-col overflow-hidden rounded-md border transition-colors duration-200 hover:border-[rgba(212,175,55,0.45)]" style={{ backgroundColor: GRAPHITE, borderColor: HAIRLINE }}>
                <div className="flex items-center justify-between border-b px-6 py-3.5" style={{ borderColor: HAIRLINE }}>
                  <span className="text-[14px] font-semibold text-white">{f.tag}</span>
                  <span className="rounded-sm border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: G, borderColor: 'rgba(212,175,55,0.45)' }}>M0{i + 1}</span>
                </div>
                <div className="relative flex flex-col p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border" style={{ borderColor: 'rgba(212,175,55,0.5)', backgroundColor: G10 }}>
                    <Icon className="h-[18px] w-[18px]" style={{ color: G }} strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{f.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-gray-500">{f.body}</p>
                  <Mockup />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div className="mt-4 grid gap-px overflow-hidden rounded-md border sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: HAIRLINE, backgroundColor: HAIRLINE }} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
          {SECONDARY_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeUp} className="group flex gap-4 p-6 transition-colors duration-200 hover:bg-[#17171A]" style={{ backgroundColor: GRAPHITE }}>
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md border transition-colors group-hover:border-[rgba(212,175,55,0.5)]" style={{ borderColor: HAIRLINE, backgroundColor: INK }}>
                  <Icon className="h-[18px] w-[18px] text-gray-400 transition-colors group-hover:text-[#D4AF37]" strokeWidth={1.6} />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-600">{f.tag}</p>
                  <h3 className="mt-1 text-[15px] font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{f.body}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <Reveal className="mt-4">
          <div className="flex flex-wrap items-center gap-6 rounded-md border px-6 py-4" style={{ backgroundColor: GRAPHITE, borderColor: HAIRLINE }}>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-gray-600">Publishing to</p>
            {[{ Icon: Instagram, label: 'Instagram', color: '#E1306C' }, { Icon: Facebook, label: 'Facebook', color: '#1877F2' }, { Icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' }, { Icon: Twitter, label: 'Twitter, X', color: '#ccc' }].map(({ Icon, label, color }) => (
              <span key={label} className="flex items-center gap-2 text-[13px] text-gray-400">
                <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
                {label}
              </span>
            ))}
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-600">auto-published on schedule</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────────────── */
const ENGINE_SPEC: [string, string][] = [
  ['--voice-agent', 'hinglish · <60s'],
  ['--lead-score', '0–100 · route >70'],
  ['--drip', 'whatsapp + email'],
  ['--ad-creatives', '10 / project'],
  ['--social', '30 days queued'],
  ['--uptime', '24 / 7'],
];

function FinalCta() {
  return (
    <section className="px-6 pb-28 md:pb-36" style={{ backgroundColor: INK }}>
      <Reveal className="mx-auto max-w-7xl">
        <div className="relative grid gap-10 overflow-hidden rounded-md border py-14 pl-10 pr-8 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20 md:pl-14" style={{ backgroundColor: GRAPHITE, borderColor: HAIRLINE }}>
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: G }} />
          <div aria-hidden className="pointer-events-none absolute -right-1/4 top-0 h-full w-2/3" style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08), transparent 65%)' }} />
          <div className="relative">
            <SpecTag>Voice · Ads · Social · CRM</SpecTag>
            <h2 className="mt-5 font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] text-white md:text-[54px]">The full engine,<br /><span style={{ color: G }}>live in a day.</span></h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-500">Add your API keys and the acquisition engine starts running. Calls, drips, ad creatives, and social posts on autopilot.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/request-access" className={BTN_PRIMARY}>
                Request early access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/login" className={BTN_SECONDARY} style={{ borderColor: HAIRLINE, backgroundColor: INK }}>
                Sign in
              </Link>
            </div>
          </div>
          <div className="relative overflow-x-auto rounded-md border p-6 font-mono text-[12.5px] leading-[1.9]" style={{ backgroundColor: INK, borderColor: HAIRLINE }}>
            <p className="text-gray-600">/* engine.config */</p>
            {ENGINE_SPEC.map(([k, v]) => (
              <p key={k} className="flex gap-4 whitespace-nowrap">
                <span className="w-40 flex-none" style={{ color: G }}>{k}:</span>
                <span className="text-gray-300">{v};</span>
              </p>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-7xl border-t px-6 py-14" style={{ borderColor: HAIRLINE }}>
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark size={26} />
              <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-white">Realty Engine</span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-gray-500">The AI acquisition engine for Indian real estate developers. One operator runs ten clients.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-20 gap-y-8 sm:grid-cols-3">
            {[
              { h: 'Product', links: [['Pipeline', '#how-it-works'], ['Features', '#modules']] },
              { h: 'Company', links: [['Request access', '/request-access'], ['Sign in', '/login']] },
              { h: 'Modules', links: [['Voice AI', '#modules'], ['Ad creative', '#modules'], ['Social', '#modules']] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-[13px] font-semibold text-white">{col.h}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}><a href={href} className="text-[13px] text-gray-500 transition-colors hover:text-white">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-gray-600 md:flex-row" style={{ borderColor: HAIRLINE }}>
          <span>© {new Date().getFullYear()} Realty Engine. All rights reserved.</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Built for Indian real estate</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: INK }}>
      <Navbar />
      <Hero />
      <Stats />
      <Pipeline />
      <Modules />
      <FinalCta />
      <Footer />
    </main>
  );
}
