/**
 * Rich demo seed for Realty Engine.
 *
 * Creates a believable, fully-populated dataset so every dashboard looks alive
 * for a live demo: one developer client, three projects, ~50 leads spread across
 * all pipeline stages, AI call logs with Hinglish transcripts, WhatsApp/email
 * threads, ad campaigns, a 30-day social calendar, and an activity event stream.
 *
 * Idempotent: wipes the demo client (cascade) and demo-tagged events first.
 *
 *   pnpm seed:demo      (or)   npx tsx scripts/seed-demo.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/* ── helpers ─────────────────────────────────────────────────── */
const now = Date.now();
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const rint = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const todayAt = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

// Indian buyer names
const NAMES = [
  'Rahul Sharma', 'Priya Mehta', 'Arjun Reddy', 'Kavya Nair', 'Vikram Singh',
  'Ananya Iyer', 'Karan Malhotra', 'Sneha Joshi', 'Rohan Gupta', 'Divya Menon',
  'Aditya Kulkarni', 'Pooja Agarwal', 'Siddharth Rao', 'Meera Krishnan', 'Nikhil Desai',
  'Tara Bhatia', 'Aman Verma', 'Ishita Banerjee', 'Varun Kapoor', 'Riya Chawla',
  'Manish Patel', 'Neha Saxena', 'Gaurav Khanna', 'Shruti Pillai', 'Akash Bose',
  'Sanjana Kohli', 'Harsh Vora', 'Deepika Shetty', 'Yash Trivedi', 'Aarti Deshmukh',
  'Rishabh Jain', 'Nandini Rao', 'Kunal Sethi', 'Aishwarya Hegde', 'Saurabh Mishra',
  'Tanvi Bhat', 'Abhishek Nanda', 'Pallavi Roy', 'Dev Anand', 'Ritu Malhotra',
  'Naveen Kumar', 'Swati Ghosh', 'Imran Sheikh', 'Lakshmi Subramaniam', 'Pranav Joshi',
  'Anjali Tandon', 'Vivek Chauhan', 'Shreya Das', 'Mohit Bansal', 'Nisha Reddy',
];

const SOURCES = ['meta', 'google', '99acres', 'organic', 'walkin', 'manual'] as const;
const STAGES: { status: string; n: number; scoreLo: number; scoreHi: number }[] = [
  { status: 'new', n: 8, scoreLo: 0, scoreHi: 0 },
  { status: 'contacted', n: 9, scoreLo: 38, scoreHi: 68 },
  { status: 'qualified', n: 8, scoreLo: 66, scoreHi: 86 },
  { status: 'site_visit_booked', n: 6, scoreLo: 72, scoreHi: 92 },
  { status: 'visited', n: 5, scoreLo: 74, scoreHi: 93 },
  { status: 'negotiating', n: 4, scoreLo: 82, scoreHi: 96 },
  { status: 'closed_won', n: 3, scoreLo: 88, scoreHi: 99 },
  { status: 'closed_lost', n: 4, scoreLo: 22, scoreHi: 58 },
  { status: 'unresponsive', n: 3, scoreLo: 8, scoreHi: 40 },
];

const CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Delhi', 'Hyderabad', 'Ahmedabad', 'Nagpur', 'Surat'];

function transcriptFor(status: string, name: string, project: string, score: number): { transcript: string; summary: string; sentiment: string; outcome: string } {
  const first = name.split(' ')[0];
  const hot = score >= 70;
  if (status === 'new' || status === 'unresponsive') {
    return {
      transcript: `Agent: Hello, main Orchid Developers ki taraf se baat kar raha hoon, ${project} ke baare mein. Kya aapko 2 minute hai?\n${first}: Sorry, abhi busy hoon, baad mein call karna.\nAgent: Bilkul ${first} ji, main aapko WhatsApp pe details bhej deta hoon aur kal dobara try karunga. Dhanyavaad.`,
      summary: 'Lead did not engage — requested callback, no budget/timeline captured yet.',
      sentiment: 'neutral',
      outcome: status === 'unresponsive' ? 'no_answer' : 'callback',
    };
  }
  if (status === 'closed_lost') {
    return {
      transcript: `Agent: ${first} ji, ${project} mein 3 BHK available hai, budget kya soch rahe the aap?\n${first}: Dekho, budget thoda tight hai, aur main actually ready-possession dhoondh raha hoon, under-construction nahi.\nAgent: Samajh gaya. Main aapko hamare ready inventory ki details bhejta hoon, agar fit ho toh batayein.`,
      summary: 'Budget mismatch and wants ready-possession — not a fit for this project. Nurtured to alternate inventory.',
      sentiment: 'negative',
      outcome: 'not_qualified',
    };
  }
  // qualified / site_visit / visited / negotiating / closed_won / contacted (hot)
  return {
    transcript: `Agent: Namaste ${first} ji, Orchid Developers se. Aapne ${project} ke liye enquiry ki thi. Main 2 minute aapke requirements samajh loon?\n${first}: Haan bilkul.\nAgent: Budget approx kitna soch rahe hain aap?\n${first}: Around ${score >= 85 ? '4 se 5 crore' : '1.5 se 2 crore'}, sea-facing prefer karunga.\nAgent: Perfect. Aur kab tak shift karne ka plan hai?\n${first}: ${score >= 85 ? '2-3 mahine mein, deal sahi lagi toh jaldi' : 'Agle 6 mahine mein'}.\nAgent: Great ${first} ji. ${project} mein exactly aapke budget ka 3 BHK sea-view available hai. Main ek site visit set karta hoon is weekend?\n${first}: Haan, Saturday morning theek rahega.\nAgent: Done. Main WhatsApp pe location aur brochure bhej raha hoon. Milte hain Saturday.`,
    summary: `Strong intent. Budget ${score >= 85 ? '₹4–5 Cr' : '₹1.5–2 Cr'}, ${score >= 85 ? 'timeline 2–3 months' : 'timeline ~6 months'}, sea-view preference. Site visit proposed for the weekend.`,
    sentiment: hot ? 'positive' : 'neutral',
    outcome: 'qualified',
  };
}

const AD_COPY = [
  { headline: 'Sea-View Living in the Heart of Worli', primary: 'Only 38 residences. Direct Arabian Sea views, Italian craftsmanship, private concierge. Book a private viewing of The Crest, Worli.' },
  { headline: 'Your 4 BHK Sky Mansion Awaits', primary: 'Calacatta marble, 24-hour butler service, helipad-ready rooftop. The Crest, Worli — where South Mumbai\'s most discerning families come home.' },
  { headline: 'Smart Homes, 10 Min from Hinjewadi IT', primary: 'Skyline Heights, Pune — 2 & 3 BHK premium homes with smart automation, Western Ghats views, possession guaranteed March 2027.' },
  { headline: 'Invest Where Pune is Growing', primary: 'NA-approved plots in Lonavala. Clear title, gated layout, 40+ plots sold in Phase 1. Easy bank loans. Register today.' },
  { headline: 'Weekend Home, 2 Hours from Mumbai', primary: 'Green Acres, Lonavala — investment plots from ₹25L. Internal roads, water, electricity ready. Build your escape.' },
];

const SOCIAL_CAPTIONS = [
  'Step into a residence where the Arabian Sea is your every-morning view. 🌊 #TheCrestWorli #LuxuryLiving',
  'Italian marble. Indian soul. Discover craftsmanship that lasts generations. #OrchidDevelopers',
  'Only 38 families will ever call this address home. Will you be one of them? #Worli #SeaView',
  '10 minutes to Hinjewadi. A lifetime of comfort. Skyline Heights, Pune is now open for bookings. 🏙️',
  'Smart homes for smart families. Pre-installed automation, Vastu-compliant layouts. #SkylineHeights',
  'Possession you can count on — March 2027, escrow guaranteed. That\'s the Orchid promise. ✅',
  'Your weekend escape is closer than you think. Green Acres, Lonavala — plots from ₹25L. 🌿',
  'Clear title. Gated community. 40+ plots already sold. Don\'t wait for Phase 2 prices. #Lonavala',
  'Behind every Orchid address: 40 years, 14 landmarks, zero delays. Trust, delivered. #RealEstateIndia',
  'A home is the one investment you live inside. Choose one that appreciates — in value and in life.',
];

async function seed() {
  console.log('\n🌱  Seeding Realty Engine demo data…\n');

  /* 1. Wipe prior demo data (cascade from client) + demo events */
  await supabase.from('clients').delete().eq('slug', 'orchid-developers');
  await supabase.from('events').delete().eq('kind', 'access_request');
  console.log('  ✓ cleared previous demo rows');

  /* 2. Client */
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .insert([{
      name: 'Orchid Developers',
      brand_name: 'Orchid Developers',
      contact_email: 'sales@orchiddevelopers.in',
      contact_phone: '+912212345678',
      gold_color_hex: '#d4af37',
      status: 'active',
      monthly_fee_paise: 9999900,
      slug: 'orchid-developers',
      brand_voice_notes: 'Premium, understated, trustworthy. References Mumbai/Pune heritage. Avoids hard sell.',
      portal_allowed_emails: ['nainasachdev01@gmail.com', 'sachdevharsh10@gmail.com', 'tech@kreoxmedia.com', 'client@orchiddevelopers.in'],
    }])
    .select()
    .single();
  if (cErr || !client) { console.error('client insert failed:', cErr?.message); process.exit(1); }
  console.log('  ✓ client: Orchid Developers');

  /* 3. Projects */
  const projectDefs = [
    {
      name: 'The Crest, Worli', location: 'Worli, Mumbai', segment: 'luxury',
      unit_type: '3 BHK & 4 BHK Sea-View Residences',
      // Column is named *_paise but the app's formatters treat it as rupees (₹/1e7 = Cr).
      price_min_paise: 85_000_000, price_max_paise: 150_000_000, // ₹8.5 Cr – ₹15 Cr
      public_slug: 'the-crest-worli', rera_number: 'P51800012345',
      usp_bullets: [
        'Direct Arabian Sea views from every residence',
        'Hand-selected Calacatta marble and Italian fittings',
        'Private concierge and chauffeured fleet on call',
        '24-hour butler service and curated wellness rituals',
        '12-acre gated estate with only 38 residences',
      ],
      developer_about: 'Orchid Developers have delivered 14 landmark addresses across South Mumbai over four decades — Italian craftsmanship, Indian sensibility, and an unbroken record of on-time possession.',
      key_amenities: { wellness: ['Infinity pool', 'Spa & wellness suites', 'Yoga deck'], social: ['Private dining pavilion', 'Cigar lounge', 'Curated library'], outdoor: ['Sky garden', 'Reflexology path'] },
    },
    {
      name: 'Skyline Heights, Pune', location: 'Hinjewadi, Pune', segment: 'premium',
      unit_type: '2 & 3 BHK Premium Homes',
      price_min_paise: 15_000_000, price_max_paise: 30_000_000, // ₹1.5 Cr – ₹3 Cr
      public_slug: 'skyline-heights-pune', rera_number: 'P52100023456',
      usp_bullets: [
        '10-minute drive to Hinjewadi IT Phase 2',
        'Walk to two top-rated international schools',
        'Sky-deck with the Western Ghats panorama',
        'Smart-home automation pre-installed',
        'Possession March 2027 — escrow guaranteed',
      ],
      developer_about: 'Orchid Developers brings 40 years of South Mumbai heritage to Pune. Skyline Heights is built on smart layouts, premium finishes, and a builder who shows up on possession day.',
      key_amenities: { outdoor: ['Sky-deck pool', 'Jogging track'], indoor: ['Clubhouse', 'Co-working lounge', 'Indoor sports'], kids: ['Crèche', 'Tutoring room'] },
    },
    {
      name: 'Green Acres, Lonavala', location: 'Lonavala, Maharashtra', segment: 'plot',
      unit_type: 'NA-approved investment plots, 1500–2400 sqft',
      price_min_paise: 2_500_000, price_max_paise: 6_000_000, // ₹25 L – ₹60 L
      public_slug: 'green-acres-lonavala', rera_number: 'P52000034567',
      usp_bullets: [
        'NA-approved with clear title — ready to register today',
        '2 hours from Mumbai, 1 hour from Pune Expressway exit',
        'Gated layout with 24/7 security and internal roads',
        '40+ plots already sold in Phase 1',
        'Partner banks pre-approved for easy loans',
      ],
      developer_about: 'Green Acres is Orchid Developers\' first plotting venture — the same documentation rigor and trust, now in land. Every plot is RERA-approved and title-cleared by a top Mumbai law firm.',
      key_amenities: { infra: ['Internal tar roads', 'Underground utilities', 'Water connection'], security: ['Gated entry', '24/7 CCTV'], community: ['Community lawn', "Children's play area"] },
    },
  ];

  const projects: any[] = [];
  for (const p of projectDefs) {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ client_id: client.id, status: 'active', hero_image_url: null, gallery_urls: null, floor_plan_urls: null, ...p }])
      .select()
      .single();
    if (error) { console.error(`project ${p.name} failed:`, error.message); continue; }
    projects.push(data);
  }
  console.log(`  ✓ ${projects.length} projects`);

  /* 4. Leads across all stages */
  let nameIdx = 0;
  let phoneSeq = 70_000_000;
  const leadRows: any[] = [];
  for (const stage of STAGES) {
    for (let i = 0; i < stage.n; i++) {
      const name = NAMES[nameIdx++ % NAMES.length];
      const project = pick(projects);
      const ageDays = stage.status === 'new' ? Math.random() * 1.5 : rint(1, 30) + Math.random();
      const createdMs = now - ageDays * DAY;
      // cluster some fresh leads "today"
      const created = i < 2 && (stage.status === 'new' || stage.status === 'contacted' || stage.status === 'qualified')
        ? todayAt(rint(9, 18), rint(0, 59))
        : createdMs;
      const score = stage.scoreLo === 0 && stage.scoreHi === 0 ? 0 : rint(stage.scoreLo, stage.scoreHi);
      const contacted = stage.status !== 'new';
      const active = ['qualified', 'site_visit_booked', 'visited', 'negotiating'].includes(stage.status);
      leadRows.push({
        project_id: project.id,
        full_name: name,
        phone_e164: `+9198${phoneSeq++}`,
        email: `${name.toLowerCase().replace(/[^a-z]/g, '.')}@gmail.com`,
        source: pick(SOURCES as unknown as string[]),
        source_meta: { campaign: pick(['brand_search', 'sea_view_lookalike', 'retargeting_30d', 'phase2_launch']) },
        status: stage.status,
        score,
        language_pref: pick(['hinglish', 'hinglish', 'hinglish', 'en', 'hi']),
        location_city: pick(CITIES),
        location_country: 'India',
        notes: active ? 'Hot lead — follow up scheduled.' : null,
        last_contacted_at: contacted ? iso(created + rint(1, 6) * HOUR) : null,
        next_followup_at: active ? iso(now + rint(1, 4) * DAY) : null,
        created_at: iso(created),
        // active leads "touched today" so the today-stats read as live
        updated_at: active ? iso(now - rint(1, 8) * HOUR) : iso(created + HOUR),
        _stage: stage.status,
        _project: project,
      });
    }
  }

  const insertedLeads: any[] = [];
  for (const row of leadRows) {
    const { _stage, _project, ...payload } = row;
    const { data, error } = await supabase.from('leads').insert([payload]).select().single();
    if (error) { console.error('lead failed:', error.message); continue; }
    insertedLeads.push({ ...data, _stage, _project });
  }
  console.log(`  ✓ ${insertedLeads.length} leads across ${STAGES.length} stages`);

  // Bulk insert helper: inserts in chunks and HARD-FAILS on any error so the
  // seed can never silently report success for rows that did not persist.
  async function bulkInsert(table: string, rows: Record<string, unknown>[]) {
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) { console.error(`  ✗ ${table} insert failed:`, error.message); process.exit(1); }
    }
    return rows.length;
  }

  /* 5. Call logs for every contacted+ lead */
  let callsToday = 0;
  const callRows = insertedLeads
    .filter((lead) => lead._stage !== 'new')
    .map((lead) => {
      const t = transcriptFor(lead._stage, lead.full_name, lead._project.name, lead.score);
      const baseMs = lead.last_contacted_at ? new Date(lead.last_contacted_at).getTime() : now - DAY;
      const makeToday = callsToday < 9 && Math.random() < 0.4;
      const startMs = makeToday ? todayAt(rint(10, 19), rint(0, 59)) : baseMs;
      if (makeToday) callsToday++;
      const dur = t.outcome === 'no_answer' ? rint(8, 25) : rint(75, 280);
      return {
        lead_id: lead.id,
        bolna_call_id: `bolna_${Math.random().toString(36).slice(2, 12)}`,
        started_at: iso(startMs),
        ended_at: iso(startMs + dur * 1000),
        duration_seconds: dur,
        outcome: t.outcome,
        transcript: t.transcript,
        recording_url: null,
        summary: t.summary,
        sentiment: t.sentiment,
        score_delta: lead.score >= 70 ? rint(8, 22) : lead.score > 0 ? rint(-10, 6) : 0,
        created_at: iso(startMs),
      };
    });
  await bulkInsert('call_logs', callRows);
  console.log(`  ✓ ${callRows.length} call logs (${callsToday} today)`);

  /* 6. WhatsApp + email threads for qualified+ leads */
  const msgRows: Record<string, unknown>[] = [];
  for (const lead of insertedLeads) {
    if (!['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won'].includes(lead._stage)) continue;
    const base = lead.last_contacted_at ? new Date(lead.last_contacted_at).getTime() : now - DAY;
    const thread = [
      { channel: 'whatsapp', direction: 'out', template_name: 'site_visit_invite', body: `Namaste ${lead.full_name.split(' ')[0]} ji 🙏 Thank you for your interest in ${lead._project.name}. Here is the brochure and a 3-min walkthrough video. Shall we confirm your site visit this weekend?`, status: 'read', off: 0 },
      { channel: 'whatsapp', direction: 'in', template_name: null, body: 'Yes, Saturday morning works. Please share the location.', status: 'delivered', off: 2 },
      { channel: 'whatsapp', direction: 'out', template_name: null, body: 'Perfect! 📍 Pin shared. Our relationship manager Aditya will receive you at 11 AM. See you Saturday!', status: 'delivered', off: 2.4 },
      { channel: 'email', direction: 'out', template_name: 'price_sheet', body: `Dear ${lead.full_name}, attached is the detailed price sheet and floor plans for ${lead._project.name}, along with our current payment plan. Warm regards, Orchid Developers.`, status: 'sent', off: 5 },
    ];
    for (const m of thread) {
      const ts = base + m.off * HOUR;
      msgRows.push({
        lead_id: lead.id,
        channel: m.channel,
        direction: m.direction,
        template_name: m.template_name,
        body: m.body,
        status: m.status,
        sent_at: m.direction === 'out' ? iso(ts) : null,
        replied_at: m.direction === 'in' ? iso(ts) : null,
        created_at: iso(ts),
      });
    }
  }
  await bulkInsert('messages', msgRows);
  console.log(`  ✓ ${msgRows.length} WhatsApp/email messages`);

  /* 7. Ad campaigns */
  const platforms = ['meta', 'google', '99acres'] as const;
  const campRows: Record<string, unknown>[] = [];
  for (const project of projects) {
    for (let i = 0; i < 3; i++) {
      const copy = pick(AD_COPY);
      const leadsC = rint(6, 48);
      campRows.push({
        project_id: project.id,
        platform: platforms[i],
        name: `${project.name.split(',')[0]} · ${platforms[i].toUpperCase()} · ${pick(['Brand', 'Lookalike', 'Retargeting', 'Launch'])}`,
        status: pick(['active', 'active', 'paused', 'draft']),
        budget_paise_daily: rint(2000, 12000) * 100,
        headline: copy.headline,
        primary_text: copy.primary,
        creative_url: null,
        external_campaign_id: `act_${rint(100000, 999999)}`,
        started_at: iso(now - rint(5, 28) * DAY),
        leads_count: leadsC,
        spend_paise: leadsC * rint(180, 650) * 100,
        created_at: iso(now - rint(5, 28) * DAY),
      });
    }
  }
  await bulkInsert('campaigns', campRows);
  console.log(`  ✓ ${campRows.length} ad campaigns`);

  /* 8. 30-day social calendar */
  const socialPlatforms = ['instagram', 'facebook', 'linkedin', 'twitter'] as const;
  const socialRows: Record<string, unknown>[] = [];
  for (let d = -18; d <= 12; d++) {
    if (Math.random() < 0.25) continue; // some days off
    const count = rint(1, 2);
    for (let k = 0; k < count; k++) {
      const project = pick(projects);
      const when = now + d * DAY + rint(9, 19) * HOUR;
      const isPast = when < now;
      socialRows.push({
        project_id: project.id,
        platform: pick(socialPlatforms as unknown as string[]),
        caption: pick(SOCIAL_CAPTIONS),
        media_urls: null,
        scheduled_at: iso(when),
        posted_at: isPast ? iso(when) : null,
        status: isPast ? 'posted' : (d <= 4 ? 'scheduled' : pick(['scheduled', 'draft'])),
        claude_brief: 'Generated by Claude. Luxury, understated tone per Orchid brand voice.',
        created_at: iso(now - 19 * DAY),
      });
    }
  }
  await bulkInsert('social_posts', socialRows);
  console.log(`  ✓ ${socialRows.length} social posts (30-day calendar)`);

  /* 9. Activity events + pending access requests */
  const eventKinds = ['lead_created', 'call_completed', 'message_sent', 'score_updated', 'site_visit_booked'];
  const eventRows: Record<string, unknown>[] = [];
  for (let i = 0; i < 24; i++) {
    const lead = pick(insertedLeads);
    eventRows.push({
      lead_id: lead.id,
      project_id: lead.project_id,
      kind: pick(eventKinds),
      payload: { name: lead.full_name, project: lead._project.name, score: lead.score, demo: true },
      created_at: iso(now - Math.random() * 3 * DAY),
    });
  }
  // Payload shape must match what the Requests page + approve API expect
  // (fullName / company / requestedAt, etc.), so the cards render fully and
  // "Approve & create portal" can mint a real client.
  const accessRequests = [
    { fullName: 'Rohit Khanna', company: 'Rohit Builders', email: 'rohit@rohitbuilders.in', activeProjects: '2', monthlyLeadVolume: '300 to 500', message: 'We run two residential towers in Thane and want to automate first-response calling. Saw a demo from a peer developer.' },
    { fullName: 'Sneha Marvel', company: 'Marvel Realty', email: 'partnerships@marvelrealty.in', activeProjects: '4', monthlyLeadVolume: '800 to 1200', message: 'Looking to replace our call centre with the AI voice agent across 4 Pune projects. Keen to start with one project.' },
  ];
  for (let i = 0; i < accessRequests.length; i++) {
    const r = accessRequests[i];
    const ts = iso(now - (i + 1) * DAY);
    eventRows.push({
      kind: 'access_request',
      payload: { ...r, status: 'pending', requestedAt: ts },
      created_at: ts,
    });
  }
  await bulkInsert('events', eventRows);
  console.log('  ✓ 24 activity events + 2 pending access requests');

  console.log('\n✅  Demo seed complete.\n');
  console.log('   Client portal : /portal/orchid-developers');
  console.log('   Landing pages :', projects.map((p) => `/p/${p.public_slug}`).join('  '));
  console.log('   Operator login: sign in with an ADMIN_EMAILS address → /pipeline\n');
}

seed().catch((e) => { console.error(e); process.exit(1); });
