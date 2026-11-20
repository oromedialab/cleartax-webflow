/**
 * Regenerates src/data/events.ts AND the Webflow CMS import CSV from the
 * "Webinar" tab of the same Google Sheet feed the Knowledge Hub uses
 * (apps-script/knowledge-hub.gs).
 *
 *   npm run sync:events                    # fetch + write both files
 *   npm run sync:events -- --dry           # fetch + validate, write nothing
 *   npm run sync:events -- --file=feed.json  # use a saved feed instead of fetching
 *
 * Feed URL: KNOWLEDGE_HUB_FEED_URL in the environment or .env.local (same as
 * sync-knowledge-hub.mjs).
 *
 * Writes:
 *   src/data/events.ts          everything from `export const speakerDirectory`
 *                               down to the `allEvents` comment is regenerated;
 *                               the interface above and helpers below are kept.
 *   webflow-import/events.csv   one row per event, columns named after the
 *                               Webflow Events collection fields, for
 *                               CMS > Events > Import. Detail pages come from it.
 *
 * Do not hand-edit the generated arrays — edit the sheet.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../src/data/events.ts', import.meta.url);
const CSV_OUT = new URL('../webflow-import/events.csv', import.meta.url);
const FILTERS = new URL('../src/sections/events/Filters.astro', import.meta.url);
const TAB = 'Webinar';
const dry = process.argv.includes('--dry');
const fileArg = process.argv.find((a) => a.startsWith('--file='));

// ---- Sheet -> EventItem mapping. Edit these constants, not the sheet. ------
// The Date column has no year ("Dec 8"). Events are assumed to fall in this year
// unless the cell carries one ("Dec 8 2027").
const EVENT_YEAR = 2026;
// Only events on or after this date are published (earlier sheet rows are skipped).
const EVENTS_FROM = '2026-08-01';
// Sheet country text -> option in events/Filters.astro.
const COUNTRY_MAP = { phillipines: 'Philippines', 'global e-invoicing': 'Global', ksa: 'Saudi Arabia', 'united arab emirates': 'UAE', 'united kingdom': 'UK' };
// Sheet "Type" text -> EventItem.type. Anything else is an error, so a new
// type is a deliberate decision rather than a silent default.
const TYPE_MAP = { webinar: 'Online', online: 'Online', event: 'In person', 'in person': 'In person', 'in-person': 'In person', conference: 'In person' };
// A row is "upcoming" when its Tags cell contains this word; otherwise past.
const UPCOMING_TAG = 'upcoming';
const POPULAR_TAG = 'popular';
// Fallback thumbnails: the same nine creatives the Knowledge Hub uses, handed out
// in page order (upcoming, then past) so neighbouring cards never repeat. A
// thumbnail typed in the sheet always wins. Deterministic: no Math.random.
const B = 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/';
const CREATIVES = [
  '6afed94aa62d1a6e06e57670_creative-1.png', '6afed94b062cffee12e5f311_creative-2.png',
  '6afed94bd19ae2bd2b3ad48f_creative-3.png', '6afed94be5d56365adf02769_creative-4.png',
  '6afed94bfa4de465d309a75a_creative-5.png', '6afed94b19724f176d40a76a_creative-6.png',
  '6afed94b245f343824aaca4f_creative-7.png', '6afed94b7fac6272d3dd00da_creative-8.png',
  '6afed94bf28ffcae1819fea3_creative-9.png',
].map((f) => B + f);
// Speaker photos by name (lowercase). Used when the sheet's "Speaker photo" cell
// has no URL. Webflow Assets CDN URLs only. A URL typed in the sheet wins.
const SPEAKER_PHOTOS = {
  'jean pierre': 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6a38ddc75224b51b6ff53e9d_jean%20pierre.png',
  'binidh gupta': 'https://cdn.prod.website-files.com/6141e3720a248d2024615d96/6af2cd3efa6d05583d90db39_bindh-gupta.jpeg',
  'ca binidh gupta': 'https://cdn.prod.website-files.com/6141e3720a248d2024615d96/6af2cd3efa6d05583d90db39_bindh-gupta.jpeg',
};
// Event thumbnails by slug, on the Webflow CDN. Used when the sheet's Thumbnail
// cell is empty or still a Google Drive link. A Webflow URL typed in the sheet wins.
const BW = 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/';
const EVENT_THUMBNAILS = {
  'the-bigger-picture-e-invoicing-peppol-vida-and-ai': BW + '6afc2df1f59a9755384d544b_GERMANY%20Thumbnail.png',
  'beyond-compliance-navigating-the-next-wave-of-tax-transformation-in-the-gcc': BW + '6b0010bde174bcea7fdee068_beyond-compliance-navigating-the-next-wave-of-tax-transformation-in-the-gcc.png',
  'readinss-illusion-a-live-cfo-benchmarking-workshop': BW + '6b0010bd015a3e2d605decd9_readinss-illusion-a-live-cfo-benchmarking-workshop.png',
  'spain-s-crea-y-crece-e-invoicing-what-applies-to-you-what-doesn-t-what-to-do-first': BW + '6b0010bd54e8a1b67df9e98d_spain-s-crea-y-crece-e-invoicing-what-applies-to-you-what-doesn-t-what-to-do-first.png',
  'uae-e-invoicing-your-asp-is-not-your-go-live-plan': BW + '6b0010bdadca47bb17e99f34_uae-e-invoicing-your-asp-is-not-your-go-live-plan.png',
  'france-e-invoicing-the-dgfip-s-view-from-day-one-and-the-road-to-vida-2030': BW + '6b0010bd927a36fc472924c0_france-e-invoicing-the-dgfip-s-view-from-day-one-and-the-road-to-vida-2030.png',
  'gst-3-0-the-next-cfo-agenda-for-indian-enterprises': BW + '6b0010bdbd82eddaffc02cc6_gst-3-0-the-next-cfo-agenda-for-indian-enterprises.png',
  'at-the-leader-s-table-beyond-e-invoicing-building-the-ai-foundation-for-finance': BW + '6b0010bce28cbf828d1f0ca1_at-the-leader-s-table-beyond-e-invoicing-building-the-ai-foundation-for-finance.png',
};
// Detail-page copy. Wins over the sheet's Description cell (which is also ignored
// when shorter than 120 characters, since it then holds a label or URL, not copy).
// `summary` is "About the Webinar" (blank line = new paragraph); `agenda` is the
// "Things we will discuss" list. Copy that IS typed in the sheet wins.
const EVENT_DETAILS = {
  'idc-ai-x-finance-digital-transformation': {
    summary: [
      'Most finance AI pilots succeed. Scaling them is where enterprises get stuck. IDC data shows 76.4% of finance AI pilots are rated mostly or completely successful by finance decision-makers, yet only 47% of AI proofs of concept moved to production in the past 12 months, and the number one blocker to production is data quality or availability.',
      'Data quality is the top reason AI proofs of concept fail to reach production. Risk, compliance and trust concerns come next: finance needs to trust what AI does before it goes live, and for now finance leaders want a person in the loop for agentic workflows. Many projects are also still too early for production, held back by business and technology maturity.',
      'Finance wants AI from the software it already uses. An IDC survey finds that finance leaders prefer AI agents delivered by their software providers rather than building their own. And e-invoicing gives that AI clean, compliant data: every e-invoice in a mandated country is structured, validated and compliant, so when your e-invoicing provider delivers the AI, the data foundation is already in place.',
      'For CFOs, financial controllers, and heads of AP and tax at multi-entity enterprises. Free to attend. Can\u2019t make it live? Register anyway and we\u2019ll send the recording.',
    ].join('\n\n'),
    agenda: [
      'Where finance AI stands today: new IDC research on why finance AI pilots succeed but struggle to scale, what blocks production, and how finance leaders want AI delivered',
      'From e-invoices to AI: a customer story of how one enterprise built on its e-invoicing data to take finance AI from pilot to production',
      'Live Q&A with both speakers: bring your questions on data readiness, trust, human oversight and first use cases',
    ],
  },
  'spain-s-crea-y-crece-e-invoicing-what-applies-to-you-what-doesn-t-what-to-do-first': {
    summary: [
      'Spain\u2019s Crea y Crece Law is bringing mandatory B2B electronic invoicing to businesses operating in Spain. But understanding what the mandate requires, whether it applies to your business, and how it fits alongside existing tax obligations can be challenging.',
      'Join us for a live conversation with Francesco Cropanese, Account Director - Spain, and Surbhi Punshi, Associate Director - Product, ClearTax, where they\u2019ll break down Spain\u2019s factura electr\u00f3nica requirements in simple terms, clarify common misconceptions, and outline the first steps businesses can take to prepare. We\u2019ll also cover what applies to your business, what you can stop worrying about, and how to begin preparing without unnecessary complexity.',
      'Walk away with a clearer view of the Spain factura electr\u00f3nica, insights into common misconceptions, how to minimise disruption to existing finance operations and protect the security of invoicing processes, a CFO-focused roadmap for painless compliance, and practical guidance on ERP and integration readiness.',
      'A 45-minute session, followed by live Q&A.',
    ].join('\n\n'),
    agenda: [
      'Why Spain is moving to B2B e-invoicing: what Crea y Crece aims to achieve, and why businesses should start with understanding the requirements, not buying software',
      'What applies, what doesn\u2019t: which businesses and B2B transactions are in scope, how turnover affects timelines, how Crea y Crece differs from SII, and what to verify before concluding you are exempt or already compliant',
      'What changes in your invoicing process: structured e-invoices versus PDFs sent by email, delivery, acceptance and rejection statuses, payment-status reporting, and traceability across the invoice lifecycle',
      'What you should do first: establish whether and when the mandate applies, map invoicing processes and ERP dependencies, check invoice data quality and formats, and identify gaps in status handling, reporting, archiving and exception management',
      'How to prepare without unnecessary disruption: why compliance does not automatically mean replacing an ERP, why validation, monitoring and exception handling matter, and how to build a scalable approach instead of a one-off fix',
      'Live Q&A',
    ],
  },
  "the-bigger-picture-e-invoicing-peppol-vida-and-ai": {
    summary: [
      "Europe’s e-invoicing mandates are evolving at different paces, and businesses need to prepare while keeping systems and processes aligned. Join Michael Walther (Architecture & Network Consultant, OpenPeppol; Co-Founder, The Invoicing Hub) and Raoul Koch (Country Director Germany, ClearTax) for a look at where Europe stands now, why more tax authorities and markets are turning to Peppol, and what ViDA means on the road to 2030.",
      "We’ll cover how Peppol works in general and how it is used in Germany, what the five-corner model changes in the exchange of invoice data, the role of EN 16931 and structured invoice data, Germany’s implementation timeline (including the transition for larger businesses through 31 December 2026 and the next stage from 2027), and what businesses can learn from Belgium when preparing for complex mandates.",
      "We’ll also look at what is practical with AI today, from flagging anomalies to spotting reconciliation gaps and prioritising tax risks. AI is only as useful as the quality and structure of the data it works with, and tax expertise is still needed to interpret exceptions and decide what action to take.",
    ].join('\n\n'),
    agenda: [
      "Welcome and the map: where Europe stands right now, with one direction and different timelines (5 mins, Raoul Koch)",
      "Peppol, one network, many mandates: why Peppol is being adopted across markets, how it works in Germany, and what the five-corner model changes (15 mins, Michael Walther)",
      "ViDA and the road to 2030: its direction and implementation approaches, and practical lessons from Germany and Belgium (15 mins, Michael Walther and Raoul Koch)",
      "From compliance data to AI: what finance teams can do with structured invoice data, why data quality matters, and where tax expertise remains essential (10 mins, Raoul Koch)",
      "Your questions, answered: open Q&A with both speakers (15 mins)",
    ],
  },
  "global-e-invoicing-dhl-tax-head": {
    summary: [
      "AI. ViDA. Peppol. And what’s next for global finance. The deadline may be clear, but the decisions you make along the way can shape your data, systems, controls and investment strategy for years to come.",
      "Join Fuad Shahin, Head of Tax, MENA, DHL, to look beyond compliance and understand what global e-invoicing really means for the business, and what CFOs should be thinking about before making their next big commitment.",
      "Country-level requirements often bring bigger, group-level decisions to the table: what the enterprise should standardise, where local flexibility matters, which processes should be automated, and what today’s technology investments commit the business to. The bigger CFO question is: are we making the right choices for the business we’re becoming?",
      "Designed for senior stakeholders in global enterprises, including CFOs and Finance Directors, and Heads of Tax and Tax Directors. Live virtual event, 19 November 2026.",
    ].join('\n\n'),
    agenda: [
      "The bigger CFO agenda: why e-invoicing deserves a place in the wider finance transformation conversation, not just another country-level compliance requirement",
      "AI beyond the promise: where automation can genuinely add value, how to measure it, and where human judgement and control still matter",
      "ViDA beyond the headlines: what the changing European landscape means for global business planning",
      "Peppol beyond the acronym: why interoperability matters when choosing systems, providers and connections",
      "The investment behind compliance: how today’s technology decisions can affect your flexibility tomorrow",
      "What comes next: the questions CFOs should be asking as they review their global e-invoicing strategy",
    ],
  },
  "uae-e-invoicing-your-asp-is-not-your-go-live-plan": {
    summary: [
      "The CFO’s January 2027 reality check. Selecting an ASP is a milestone. Knowing what’s actually ready for January is a different question.",
      "Picture the 30 October steering-committee meeting. The ASP decision is made, but no one can say which invoice flows have been mapped, when end-to-end testing will begin, or who is responsible for unresolved issues.",
      "Whether your business is still finalising its ASP choice or has already appointed one, join Taha Siddiqui, Senior E-invoicing Consultant at ClearTax Middle East, for a CFO-focused look at what your go-live plan needs to show. We’ll look at the scope, data, integration, testing and ownership questions behind an “on track” update, so you can ask for evidence, not just reassurance, and leave with the right questions to take into your next steering-committee meeting.",
      "Designed for senior finance and tax stakeholders in GCC: CFOs and Finance Directors, Heads of Tax and Tax Directors, Heads of Finance Transformation, ERP and Finance Systems Leaders, and E-invoicing and Indirect Tax Programme Owners.",
    ].join('\n\n'),
    agenda: [
      "ASP selected or nearly selected: what does your January plan actually tell you?",
      "Which invoice flows might be missing from the ERP plan everyone has reviewed?",
      "“Integration underway” versus an invoice journey that’s been tested end to end",
      "Who takes ownership when an invoice doesn’t move as expected?",
      "What should a CFO see before signing off on a green go-live status?",
    ],
  },
  "gst-3-0-the-next-cfo-agenda-for-indian-enterprises": {
    // The sheet lists a different speaker for this event; the campaign brief names Rohit Jain.
    speakers: [{ name: "Rohit Jain", role: "GST Expert, ClearTax" }],
    summary: [
      "Impact of the 57th GST Council Meeting on cash flow, business confidence and the future of finance. The 57th GST Council Meeting recommended changes to the law. For a CFO, the questions are more immediate. What could these proposals change in the cash forecast, the risk review and the way finance works?",
      "Join CA Rohit Kumar Jain for a CFO-focused discussion. Explore what deserves attention now and what must wait for the final legal text.",
      "Picture the next review. Treasury asks whether refunds could arrive sooner. Tax has a list of credits that may become eligible. The reporting team is assessing return mismatches. Legal raises a notice spanning multiple financial years. These proposals are not yet new entitlements or obligations. But waiting for implementation can leave a CFO without a clear view of the potential implications for cash, controls and disputes. The useful question now is: what can we quantify and prepare without assuming the law has changed?",
      "Leave with a way to separate potential cash from cash you can forecast. See which controls you can improve now, and which rules are still being finalised. Identify disputes that need review without changing your position prematurely. This is not a walkthrough of every Council recommendation. It is a discussion about the decisions a CFO needs to make around them.",
      "Designed for senior finance and tax stakeholders: CFOs and Finance Directors, Heads of Tax and Tax Directors, Heads of Finance Transformation, ERP and Finance Systems Leaders, and Indirect Tax Programme Owners.",
    ].join('\n\n'),
    agenda: [
      "Cash flow: which refund proposals could affect recovery, and what should stay out of the forecast for now?",
      "Credit: where is ITC difficult to trace, substantiate or assess against the proposed changes?",
      "Returns: can finance see the exceptions behind the numbers reported in GSTR-3B?",
      "E-invoicing: which specified purchase flows could bring new work into AP and finance systems?",
      "Disputes: how should proposed procedural relief and the multi-year notice validation clause inform your risk review?",
    ],
  },
  "at-the-leader-s-table-beyond-e-invoicing-building-the-ai-foundation-for-finance": {
    summary: [
      "Global e-invoicing is more than a series of local mandates. For multinational enterprises, it is an opportunity to build connected data, systems, and governance that can scale across markets, and prepare finance for an AI-driven future.",
      "Join a live global conversation with senior finance and tax leaders from MENA, EMEA, and the Philippines: Eoin Fitzgerald, Head of Tax Technology, Keeyns (MENA); Ghulam Sabir, Group CFO, SBG International (EMEA); and Mike San Diego, SVP & CFO, EON Group (Philippines). Hosted by Mohammed Farhan, Business Head – Southeast Asia & KSA, ClearTax.",
    ].join('\n\n'),
    agenda: [
      "Lessons from mature and emerging e-invoicing markets",
      "Repeatable rollout approaches, ERP integration, and data governance",
      "Where automation and interoperability can reduce risk",
      "The leadership agenda for AI-ready finance",
    ],
  },
  "readinss-illusion-a-live-cfo-benchmarking-workshop": {
    summary: [
      "See where your taxes actually stand. Most Indian enterprise CFOs believe their tax compliance is under control. The data from 500 companies and 12 crore+ tax transactions tells a different story.",
      "This isn’t a webinar where someone presents slides. It’s a live benchmarking session where you vote first, and the industry data lands after. Five questions. Five live reveals. By the end, you’ll know exactly where your enterprise stands against the national benchmark. A CFO guest translates every gap into the one language that matters: what it’s costing your bottom line.",
      "No sensitive data required. No company disclosures. Just a 45-minute mirror held up to your assumptions, and a clear picture of how far your compliance posture sits from best-in-class. Walk away with the State of Tax Assurance Report 2026 and your readiness diagnostic.",
    ].join('\n\n'),
    agenda: [
      "Does your compliance confidence match your actual visibility?",
      "Where does your ITC recovery rate really stand?",
      "What is a GST notice actually costing your business?",
      "Are you exposed to the fastest-growing compliance liability in GST?",
      "How quickly can your team respond when a notice lands?",
    ],
  },
};
// Recording links (Demio/HubSpot replays) by slug, used when the sheet's
// "Recording link (Hubspot)" cell is empty. A link typed in the sheet wins.
const RECORDINGS = {
  "spain-s-crea-y-crece-e-invoicing-what-applies-to-you-what-doesn-t-what-to-do-first": "https://go.cleartax.com/hubfs/Spain/Webinars/Nov%203%2cSpain%20Crea%20y%20Crece%20E-Invoicing.mp4",
  "the-bigger-picture-e-invoicing-peppol-vida-and-ai": "https://go.cleartax.com/hubfs/Germany/Webinars/OND%202026/The%20bigger%20picture%20E-Invoicing%2cPeppol%2cVIDA%20and%20AI-webinar.mp4",
  "uae-e-invoicing-your-asp-is-not-your-go-live-plan": "https://go.cleartax.com/hubfs/UAE/Webinars/OND%202026/Oct%2021st%20Webinar-%20UAE.mp4",
  "gst-3-0-the-next-cfo-agenda-for-indian-enterprises": "https://go.cleartax.com/hubfs/India/Webinars/OND%202026/28th-Oct-Virtual%20Event-India-GST-3.0.mp4",
  "beyond-compliance-navigating-the-next-wave-of-tax-transformation-in-the-gcc": "https://go.cleartax.com/hubfs/UAE/Webinars/9th%20Sept%20-%20UAE%20-%20Navigating%20the%20Next%20Wave%20of%20Tax%20Transformaiton%20in%20GCC.mp4",
  "at-the-leader-s-table-beyond-e-invoicing-building-the-ai-foundation-for-finance": "https://go.cleartax.com/hubfs/Global%20e-Invoicing/Webinars/JAS%202026/29th%20Sept%20Webinar%20-%20Global%20-%20Beyond%20e-Invoicing%20Building%20the%20AI%20Foundation.mp4",
  "readinss-illusion-a-live-cfo-benchmarking-workshop": "https://go.cleartax.com/hubfs/India/Webinars/JAS%202026/9th%20Sept%20Webinar%20-%20India%20-%20A%20Live%20CFO%20Benchmarking%20Workshop.mp4",
  "france-e-invoicing-the-dgfip-s-view-from-day-one-and-the-road-to-vida-2030": "https://go.cleartax.com/hubfs/France/Webinar/JAS%202026/27th%20August%20Webinar-%20France%20e-invoicing%20The%20DGFiPs%20view%20from%20day%20one%2c%20and%20the%20road%20to%20ViDA%202030.mp4",
};
// Sheet rows to leave out of the site entirely, by slug.
const EXCLUDE_SLUGS = new Set(['global-e-invoicing-dhl-tax-head']);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

async function feedUrl() {
  if (process.env.KNOWLEDGE_HUB_FEED_URL) return process.env.KNOWLEDGE_HUB_FEED_URL;
  try {
    const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
    const m = env.match(/^KNOWLEDGE_HUB_FEED_URL=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  throw new Error('Set KNOWLEDGE_HUB_FEED_URL (env or .env.local) to the Apps Script /exec URL.');
}

async function loadFeed() {
  if (fileArg) return JSON.parse(await readFile(fileArg.slice(7), 'utf8'));
  const url = await feedUrl();
  const ATTEMPTS = 3, TIMEOUT_MS = 90000;
  let res, lastErr;
  for (let a = 1; a <= ATTEMPTS && !res; a++) {
    try {
      res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status >= 500 && a < ATTEMPTS) { lastErr = `HTTP ${res.status}`; res = undefined; }
    } catch (e) {
      lastErr = e.name === 'TimeoutError' ? `no answer within ${TIMEOUT_MS / 1000}s` : (e.cause?.code ?? e.message);
    }
    if (!res && a < ATTEMPTS) console.warn(`warn: feed attempt ${a}/${ATTEMPTS} failed (${lastErr}); retrying…`);
  }
  if (!res) throw new Error(`Could not read the feed (${lastErr}).`);
  if (!res.ok) throw new Error(`Feed returned HTTP ${res.status}`);
  return res.json().catch(() => { throw new Error('Feed did not return JSON — check the Web app access is "Anyone".'); });
}

const feed = await loadFeed();
if (feed.error || !feed.tabs) throw new Error(`Feed error: ${feed.error ?? 'no "tabs" key'}`);
if (!Array.isArray(feed.tabs[TAB])) {
  throw new Error(`Tab "${TAB}" is missing from the feed. Add 'Webinar' to TABS in apps-script/knowledge-hub.gs, paste it into Apps Script and deploy a NEW version.`);
}

// ---- Helpers ---------------------------------------------------------------
// Sheet text sometimes uses Unicode "bold" letters (𝗔𝘀𝘀𝗼𝗰𝗶𝗮𝘁𝗲); NFKC turns them back into plain ASCII.
const clean = (s) => (s || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const lines = (s) => (s || '').normalize('NFKC').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
// Header lookup ignoring case, spaces and punctuation: "Speaker's linkedin" -> "speakerslinkedin".
const norm = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
const raw = (r, name) => { const k = Object.keys(r).find((h) => norm(h) === name); return k ? r[k] : ''; };
const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isUrl = (s) => /^https?:\/\//i.test(s);
const country = (s) => { const c = clean(s); return COUNTRY_MAP[c.toLowerCase()] ?? c; };

function parseDate(s) {
  const t = clean(s);
  let y, m, d;
  let x;
  if ((x = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) [y, m, d] = [+x[1], +x[2], +x[3]];
  else {
    // "Dec 8", "8 Dec", "December 8 2026", "8 December 2026", "Dec 8, 2026"
    const yr = t.match(/\b(20\d{2})\b/);
    const mo = t.match(/[A-Za-z]{3,}/);
    const dy = t.replace(/\b20\d{2}\b/, '').match(/\b(\d{1,2})\b/);
    const mi = mo ? MONTHS.findIndex((M) => M.toLowerCase().startsWith(mo[0].toLowerCase().slice(0, 3))) : -1;
    if (mi < 0 || !dy) return null;
    [y, m, d] = [yr ? +yr[1] : EVENT_YEAR, mi + 1, +dy[1]];
  }
  return { date: `${MONTHS[m - 1]} ${d} ${y}`, datetime: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

// "11 AM CET" -> "11:00 AM - CET"; "4:00 PM - IST" is already right.
function displayTime(s) {
  const t = clean(s);
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])\s*[-–]?\s*(.*)$/);
  if (!m) return t;
  return `${m[1]}:${m[2] ?? '00'} ${m[3].toUpperCase()}${m[4] ? ` - ${m[4]}` : ''}`;
}

// Names are comma-separated ("A, B"). The per-speaker cells (role, bio,
// LinkedIn, photo) are one entry per line. When a cell has the wrong number of
// lines for the names, a comma split is tried before giving up, because the
// sheet is typed by hand.
function perSpeaker(cell, count, { commaOk }) {
  const byLine = lines(cell);
  if (byLine.length === count) return byLine;
  if (commaOk) {
    const byComma = clean(cell).split(',').map((x) => x.trim()).filter(Boolean);
    if (byComma.length === count) return byComma;
  }
  if (count === 1 && clean(cell)) return [clean(cell)];
  return null;
}

// Drive "view" links (drive.google.com/file/d/<id>/view) are web pages, not
// images. The thumbnail endpoint serves the file itself for anyone-with-link files.
const directImage = (u) => {
  if (!isUrl(u)) return '';
  const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200` : u;
};

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

// ---- Rows -> events --------------------------------------------------------
const filtersSrc = await readFile(FILTERS, 'utf8');
const errors = [], warnings = [], seen = new Map(), events = [];
let skippedOld = 0, skippedExcluded = 0;

feed.tabs[TAB].forEach((r, i) => {
  const at = `Webinar row ${i + 2}`;
  const title = clean(raw(r, 'title'));
  if (!title) return;
  const where = `${at} ("${title}")`;

  const typeText = clean(raw(r, 'type'));
  const type = TYPE_MAP[typeText.toLowerCase()];
  if (!type) errors.push(`${where}: type "${typeText}" is not mapped (add it to TYPE_MAP)`);
  const c = country(raw(r, 'country'));
  if (!c) errors.push(`${where}: country is empty`);
  else if (!filtersSrc.includes(`"${c}"`)) warnings.push(`${where}: country "${c}" has no option in events/Filters.astro — unreachable by filter`);
  const dt = parseDate(raw(r, 'date'));
  if (!dt) errors.push(`${where}: date "${raw(r, 'date')}" unreadable`);

  if (dt && dt.datetime < EVENTS_FROM) { skippedOld++; return; }

  const tags = clean(raw(r, 'tags')).toLowerCase();
  const upcoming = tags.includes(UPCOMING_TAG);

  // Description is sometimes the website URL of the webinar rather than copy.
  const descRaw = (raw(r, 'description') || '').trim();
  const descIsUrl = isUrl(descRaw);
  const summary = descIsUrl ? '' : descRaw.normalize('NFKC').replace(/\r/g, '').trim();
  const demio = clean(raw(r, 'linkdemio'));
  const recording = clean(raw(r, 'recordinglinkhubspot'));
  const href = (upcoming ? demio || recording : recording || demio) || (descIsUrl ? descRaw : '');
  if (!href) warnings.push(`${where}: no Demio / recording link — the card will point nowhere`);

  // Usually "A, B" in the name cell. Some rows instead put one "Name, Role"
  // per line; then the role comes from that line and the Speaker role cell is ignored.
  const nameLines = lines(raw(r, 'speakername'));
  const inline = nameLines.length > 1;
  const names = inline
    ? nameLines.map((l) => l.split(',')[0].trim())
    : clean(raw(r, 'speakername')).split(',').map((x) => x.trim()).filter(Boolean);
  const roles = inline
    ? nameLines.map((l) => l.split(',').slice(1).join(',').trim())
    : perSpeaker(raw(r, 'speakerrole'), names.length, { commaOk: true });
  const bios = perSpeaker(raw(r, 'speakerbio'), names.length, { commaOk: false });
  const links = perSpeaker(raw(r, 'speakerslinkedin'), names.length, { commaOk: false });
  const photos = perSpeaker(raw(r, 'speakerphoto'), names.length, { commaOk: false });
  if (names.length && clean(raw(r, 'speakerrole')) && !roles) warnings.push(`${where}: ${names.length} speakers but Speaker role does not split to match; roles left blank`);
  if (names.length && clean(raw(r, 'speakerslinkedin')) && !links) warnings.push(`${where}: Speaker's linkedin does not split to ${names.length} lines; profile links left blank`);
  // Cells that hold a hyperlink come through the feed as their DISPLAY text
  // (e.g. the person's name), not the URL. Keep only real URLs.
  const urlOr = (arr, n) => (arr && isUrl(arr[n] ?? '') ? arr[n] : '');
  if (links && links.some(Boolean) && !links.some(isUrl)) warnings.push(`${where}: Speaker's linkedin holds text, not URLs (hyperlinked cells export their label) — profile links left blank. Paste the full URL in the cell.`);
  let speakers = names.map((name, n) => ({
    name, role: roles?.[n] ?? '', bio: bios?.[n] ?? '', profile: urlOr(links, n), image: urlOr(photos, n) || SPEAKER_PHOTOS[name.toLowerCase()] || '',
  }));

  if (summary && summary.length < 120) warnings.push(`${where}: Description "${summary.slice(0, 40)}" is a label, not copy — ignored`);
  let slug = slugify(title);
  if (EXCLUDE_SLUGS.has(slug)) { skippedExcluded++; return; }
  if (EVENT_DETAILS[slug]?.speakers) speakers = EVENT_DETAILS[slug].speakers.map((x) => ({ bio: '', profile: '', image: SPEAKER_PHOTOS[x.name.toLowerCase()] || '', ...x }));
  const n = (seen.get(slug) ?? 0) + 1; seen.set(slug, n);
  if (n > 1) slug = `${slug}-${n}`;

  const location = clean(raw(r, 'location')) || (type === 'Online' ? 'Online' : c);
  events.push({
    slug, title, speakers, date: dt?.date ?? '', datetime: dt?.datetime ?? '',
    time: displayTime(raw(r, 'time')), location, type, country: c,
    image: (() => {
      const sheet = clean(raw(r, 'thumbnail169'));
      return isUrl(sheet) && !/drive\.google\.com/.test(sheet) ? sheet : EVENT_THUMBNAILS[slug] || directImage(sheet);
    })(),
    href: (upcoming ? demio || (recording || RECORDINGS[slug]) : (recording || RECORDINGS[slug]) || demio) || href, popular: tags.includes(POPULAR_TAG), summary: EVENT_DETAILS[slug]?.summary || (summary.length >= 120 ? summary : ''), agenda: EVENT_DETAILS[slug]?.agenda ?? [], upcoming, recording: recording || RECORDINGS[slug] || '', demio,
  });
});

warnings.forEach((w) => console.warn('warn:', w));
if (errors.length) {
  errors.forEach((e) => console.error('error:', e));
  console.error(`\n${errors.length} problem(s) — nothing written.`);
  process.exit(1);
}

// Upcoming: soonest first. Past: most recent first.
const upcomingList = events.filter((e) => e.upcoming).sort((a, b) => (a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0));
const pastList = events.filter((e) => !e.upcoming).sort((a, b) => (a.datetime < b.datetime ? 1 : a.datetime > b.datetime ? -1 : 0));

let nextImage = 0;
for (const e of [...upcomingList, ...pastList]) {
  const fallback = CREATIVES[nextImage++ % CREATIVES.length];
  if (!e.image) e.image = fallback;
}

// ---- src/data/events.ts ----------------------------------------------------
const render = (e) => {
  const l = [
    `    slug: ${q(e.slug)},`,
    `    title: ${q(e.title)},`,
    `    speakers: [${e.speakers.map((s) => q(s.role ? `${s.name}, ${s.role}` : s.name)).join(', ')}],`,
    `    date: ${q(e.date)},`, `    datetime: ${q(e.datetime)},`, `    time: ${q(e.time)},`,
    `    location: ${q(e.location)},`, `    type: ${q(e.type)},`, `    country: ${q(e.country)},`,
    `    image: ${q(e.image)},`, `    href: ${q(e.href)},`,
  ];
  if (e.popular) l.push('    popular: true,');
  if (e.summary) l.push(`    summary: ${q(e.summary)},`);
  if (e.agenda.length) l.push(`    agenda: [\n${e.agenda.map((a) => `      ${q(a)},`).join('\n')}\n    ],`);
  return `  {\n${l.join('\n')}\n  },`;
};

const directory = new Map();
for (const e of [...upcomingList, ...pastList]) for (const s of e.speakers) {
  const prev = directory.get(s.name) ?? { bio: '', image: '', profile: '' };
  directory.set(s.name, { bio: prev.bio || s.bio, image: prev.image || s.image, profile: prev.profile || s.profile });
}
const renderDirectory = () =>
  `export const speakerDirectory: Record<string, Pick<EventSpeaker, 'bio' | 'image' | 'profile'>> = {\n` +
  [...directory].map(([name, d]) => `  ${q(name)}: {\n    bio: ${q(d.bio)},\n    image: ${q(d.image)},\n    profile: ${q(d.profile)},\n  },`).join('\n') +
  `\n};\n\n`;

const current = await readFile(OUT, 'utf8');
const startAt = current.indexOf('export const speakerDirectory');
const endAt = current.indexOf('/**\n * Both lists');
if (startAt < 0 || endAt < 0) throw new Error('events.ts markers not found (`export const speakerDirectory` / "Both lists" comment).');
const next =
  current.slice(0, startAt) + renderDirectory() +
  `export const upcomingEvents: EventItem[] = [\n${upcomingList.map(render).join('\n')}\n];\n\n` +
  `export const pastEvents: EventItem[] = [\n${pastList.map(render).join('\n')}\n];\n\n` +
  current.slice(endAt);

const noPhoto = [...directory].filter(([, d]) => !d.image).map(([n]) => n);
if (noPhoto.length) console.warn(`warn: no photo for ${noPhoto.length} speaker(s) (initials avatar used): ${noPhoto.join('; ')}. Add them to SPEAKER_PHOTOS or the sheet's Speaker photo cell.`);

// ---- webflow-import/events.csv ---------------------------------------------
// Column names are the Webflow field names (the [[ Field ]] markers in
// sections/event-detail/Template.astro). Description is Rich Text: Webflow's
// importer accepts HTML in that column.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const richText = (e) =>
  (e.summary ? e.summary.split(/\n{2,}/).map((p) => `<p>${esc(p.replace(/\n/g, ' ').trim())}</p>`).join('') : '') +
  (e.agenda.length ? `<h2>Things we will discuss</h2><ul>${e.agenda.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '');
const COLS = ['Name', 'Slug', 'Type', 'Country', 'Date', 'Display Time', 'Location', 'Is Upcoming', 'Popular', 'Thumbnail', 'Recording Link', 'Registration Link', 'Description'];
for (const n of [1, 2, 3]) COLS.push(`Speaker ${n} Name`, `Speaker ${n} Role`, `Speaker ${n} Bio`, `Speaker ${n} LinkedIn`, `Speaker ${n} Photo`);
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvRow = (e) => {
  const v = {
    Name: e.title, Slug: e.slug, Type: e.type, Country: e.country, Date: e.datetime, 'Display Time': e.time,
    Location: e.location, 'Is Upcoming': e.upcoming ? 'true' : 'false', Popular: e.popular ? 'true' : 'false',
    Thumbnail: e.image, 'Recording Link': e.recording, 'Registration Link': e.demio || (e.upcoming ? e.href : ''),
    Description: richText(e),
  };
  e.speakers.slice(0, 3).forEach((s, i) => {
    v[`Speaker ${i + 1} Name`] = s.name; v[`Speaker ${i + 1} Role`] = s.role; v[`Speaker ${i + 1} Bio`] = s.bio;
    v[`Speaker ${i + 1} LinkedIn`] = s.profile; v[`Speaker ${i + 1} Photo`] = s.image;
  });
  return COLS.map((c) => csvCell(v[c])).join(',');
};
const csv = [COLS.map(csvCell).join(','), ...[...upcomingList, ...pastList].map(csvRow)].join('\r\n') + '\r\n';
const tooMany = events.filter((e) => e.speakers.length > 3);
tooMany.forEach((e) => console.warn(`warn: "${e.title}" has ${e.speakers.length} speakers; the Webflow template has 3 slots, extras are left out of the CSV`));

if (skippedOld) console.log(`Skipped ${skippedOld} row(s) dated before ${EVENTS_FROM}.`);
if (skippedExcluded) console.log(`Excluded ${skippedExcluded} row(s) via EXCLUDE_SLUGS.`);
console.log(`${upcomingList.length} upcoming + ${pastList.length} past events from the "${TAB}" tab.`);
if (dry) console.log('--dry: nothing written.');
else {
  await writeFile(OUT, next);
  await mkdir(new URL('../webflow-import/', import.meta.url), { recursive: true });
  await writeFile(CSV_OUT, csv);
  console.log('Wrote src/data/events.ts and webflow-import/events.csv');
}
