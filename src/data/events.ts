/**
 * The events / webinar list — Figma node 14777:26964
 * (cleartax.com/resources/events) for the listing, 14851:46962
 * (cleartax.com/resources/events/<slug>) for the detail page.
 *
 * SPLIT IN TWO BECAUSE THE PAGE IS. `upcomingEvents` feeds the bordered
 * "Our upcoming webinars & events" block — one lead event plus a scrolling
 * rail. `pastEvents` feeds "Watch our past Webinars & Events here", the
 * filterable grid below it. An event belongs to exactly one, so moving a
 * session from upcoming to past is a cut-and-paste between the two arrays and
 * nothing else has to change.
 *
 * `allEvents` is the two arrays concatenated, and it is what the detail route
 * walks in `getStaticPaths()` — so every event in either list has a page, and
 * moving one between lists keeps its URL.
 *
 * WHY THIS IS A MODULE AND NOT INLINE IN EACH SECTION. `Upcoming.astro` renders
 * both the lead card and the rail from one array, so two hand-kept copies would
 * drift the moment an event is added and the lead card would advertise a
 * session the rail no longer lists. `events/[slug].astro` then needs the same
 * array at build time to emit one page per event — if a section kept its own
 * copy, a card could link to a slug that has no page, a 404 nothing in the
 * build would catch.
 *
 * This does NOT break the "props never reach Webflow" rule. That rule is about
 * values a *page* passes down, which the embed route never supplies. A module
 * import is resolved at build time, so the rendered embed HTML carries the real
 * content either way.
 *
 * `type` is the Type filter AND the badge drawn over the card image, so its two
 * values are fixed. `country` must match an option in `events/Filters.astro` —
 * the grid filters on an exact string match, so a value with no option is
 * unreachable and an option with no value gives an empty result.
 *
 * `image: ''` renders the Figma "Visual Placeholder" tint. Drop in a Webflow
 * asset URL to replace it — never a `data:` URI, that alone can blow the 50 KB
 * Embed budget.
 *
 * KEEP AN EYE ON THE LENGTH OF `pastEvents`. Every entry is ~1.6 KB of pasted
 * markup in `events/events.html`, and Webflow splits an Embed over ~49 KB into
 * two pastes forever. `summary`, `agenda` and the speaker bios below are NOT
 * part of that budget — the detail route renders one event at a time, so they
 * only ever cost the page they appear on.
 */
export interface EventItem {
  /**
   * URL segment under /events/. In Webflow these become the CMS collection
   * item slugs; keep them matching or the pasted listing links to nothing.
   */
  slug: string;
  title: string;
  /**
   * `Name, Role` per entry. First is the one the rail card names; the lead
   * card badges up to three. The name half is also the key into
   * `speakerDirectory` below, which is where the detail page gets the bio —
   * so spell it exactly the same in both places.
   */
  speakers: string[];
  /** Display form, e.g. 'July 12 2026'. */
  date: string;
  /** ISO form of `date`. Drives <time datetime> and the Sort by control. */
  datetime: string;
  /** Display form including timezone, e.g. '3:00 PM - IST'. */
  time: string;
  /** Shown against the map pin on the lead card, e.g. 'Malaysia'. */
  location: string;
  /** Drives the Type filter and the badge over the image. */
  type: 'Online' | 'In person';
  /** Must match an option in `sections/events/Filters.astro`. */
  country: string;
  image: string;
  /** Registration or recording link. */
  href: string;
  /** Adds the Flux Lime "Popular" chip on rail cards. */
  popular?: boolean;

  /* ---- detail page only, all optional ------------------------------------
   * The detail route drops the block entirely when the field is missing, so a
   * newly added event renders a correct — just shorter — page from day one.
   * Nothing on the listing reads any of these. */

  /** "About the Webinar" body copy. */
  summary?: string;
  /** "Things we will discuss" — one checked line each. */
  agenda?: string[];
}

/**
 * One bio per person, keyed by the name half of a `speakers` string.
 *
 * Keyed rather than inlined per event because the same five people run most of
 * these sessions, and a bio copied into eighteen entries is eighteen places to
 * miss when someone changes role. `resolveSpeakers` does the lookup; a name
 * with no entry still renders, just without a bio or a profile link.
 *
 * `image: ''` falls back to the initials avatar, the same empty state the blog
 * author card uses. Point it at a Webflow asset URL to replace it — never a
 * `data:` URI.
 */
export interface EventSpeaker {
  name: string;
  /** Taken from the `speakers` string, not from the directory — the same
   *  person can be billed differently on different sessions. */
  role: string;
  bio: string;
  image: string;
  /** LinkedIn or equivalent. An empty string hides the View Profile button. */
  profile: string;
}

export const speakerDirectory: Record<string, Pick<EventSpeaker, 'bio' | 'image' | 'profile'>> = {
  'Shrenik Shah': {
    bio: 'Leads enterprise compliance advisory at Clear, working with finance teams across the Gulf and South East Asia on mandate readiness. Has taken more than two hundred enterprises through a first e-invoicing go-live, and spends most of his week in the gap between what a mandate says and what an ERP can actually produce.',
    image: '',
    profile: 'http://linkedin.com/company/cleartax',
  },
  'Surbhi Punshi': {
    bio: 'A Chartered Accountant with a stronghold in the field of direct and indirect taxes, handling the entire gamut of professional services including consultancy, compliance advisory and training. Currently working on managing GST and E-way bill advisory and software development. In the past, has experience of statutory and internal auditing along with the finalisation of books of accounts for various businesses.',
    image: '',
    profile: 'http://linkedin.com/company/cleartax',
  },
  'Binidh Gupta': {
    bio: 'Works on indirect tax technology at Clear, with a focus on notice management and input tax credit. Spends most of his time inside the reconciliation data that decides whether a notice arrives at all, and writes the playbooks finance teams use when one does.',
    image: '',
    profile: 'http://linkedin.com/company/cleartax',
  },
  'Ankita Rao': {
    bio: 'Product lead for Clear’s global compliance platform. Owns the schema and clearance layer that keeps a single ERP integration valid across a dozen national mandates, and has shipped country support through four regulatory rewrites without a customer-side re-integration.',
    image: '',
    profile: 'http://linkedin.com/company/cleartax',
  },
  'Vivek Menon': {
    bio: 'Solutions architect working on ERP connectivity — SAP, Oracle and the middleware in between. Has run integrations at volumes past a million documents a day, and is usually the person asked why the pilot worked and the rollout did not.',
    image: '',
    profile: 'http://linkedin.com/company/cleartax',
  },
};

export const upcomingEvents: EventItem[] = [
  {
    slug: 'confidence-vs-control-ai-led-tax-compliance',
    title: 'Confidence vs. Control: Decoding the AI-Led Tax Compliance',
    speakers: [
      'Shrenik Shah, Tax Expert',
      'Surbhi Punshi, Tax Expert',
      'Binidh Gupta, Tax Expert',
      'Ankita Rao, Product Lead',
      'Vivek Menon, Solutions Architect',
    ],
    date: '26 May 2026',
    datetime: '2026-05-26',
    time: '4:00 PM - IST',
    location: 'Malaysia',
    type: 'In person',
    country: 'Malaysia',
    image: '',
    href: 'https://www.cleartax.com/contact-us',
    summary:
      'The tax enforcement environment has shifted. Authorities now run AI systems that cross-reference indirect tax, withholding, e-invoice and banking data in near real time, and the majority of notices issued last year were triggered automatically rather than by a human reviewer. Yet most enterprise finance teams still discover a compliance failure when the notice lands, reconcile in spreadsheets, and file under a deadline that compromises accuracy. This session is for CFOs, tax heads and senior finance leaders who want to understand what is driving the notice surge, and what AI-led compliance infrastructure looks like in practice inside a live enterprise environment.',
    agenda: [
      'The five notice triggers causing the most damage to large enterprises this year',
      'Why internal data failures, not external ones, are the leading source of tax notices',
      'How the revenue authorities’ AI systems are auditing your enterprise in real time',
      'The input tax credit leakage pattern that quietly feeds the notice machine',
      'A live use case demonstrating notice prevention inside Clear Compliance Cloud',
      'Early access to a ClearTax CFO research asset, revealed to attendees at the end of the session',
    ],
  },
  {
    slug: 'uae-invoicing-readiness-list',
    title: 'UAE Invoicing Readiness list',
    speakers: ['Shrenik Shah, Tax Expert'],
    date: 'July 12 2026',
    datetime: '2026-07-12',
    time: '3:00 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'UAE',
    image: '',
    href: 'https://www.cleartax.com/ae/e-invoicing-software',
    summary:
      'The UAE Electronic Invoicing System starts from 30 October 2026, and it reaches every business handling B2B or B2G transactions — VAT registered or not. A valid e-invoice is structured XML delivered through an Accredited Service Provider, which means a PDF, however it is produced, no longer qualifies. This session walks the readiness list we use with enterprises now, in the order the work actually has to happen.',
    agenda: [
      'What the mandate covers, who is in scope, and what the extended timeline changed',
      'Peppol PINT-AE in plain terms, and the fields your ERP is probably not emitting yet',
      'Master data clean-up: the tax registration numbers and identifiers to fix first',
      'Choosing an Accredited Service Provider, and the questions to ask before you do',
    ],
  },
  {
    slug: 'zatca-phase-ii-integration-checklist',
    title: 'ZATCA Phase II: the integration checklist',
    speakers: ['Surbhi Punshi, Tax Expert'],
    date: 'June 24 2026',
    datetime: '2026-06-24',
    time: '3:00 PM - IST',
    location: 'Riyadh',
    type: 'In person',
    country: 'Saudi Arabia',
    image: '',
    href: 'https://www.cleartax.com/sa/ksa-einvoicing',
    popular: true,
    summary:
      'Phase II onboarding windows are short and they do not move. The enterprises that clear them are the ones that validated their invoice data before the window opened, not during it. An in-person working session in Riyadh on exactly what to check, and in what order.',
    agenda: [
      'The onboarding window: what ZATCA asks for, and what it rejects most often',
      'Cryptographic stamping, QR codes and the fields that fail validation silently',
      'Simplified versus standard invoices, and where teams misroute them',
      'A dry-run plan you can execute before your wave is called',
    ],
  },
  {
    slug: 'peppol-in-practice-malaysia-singapore',
    title: 'Peppol in practice: Malaysia, Singapore and what travels',
    speakers: ['Ankita Rao, Product Lead'],
    date: 'June 10 2026',
    datetime: '2026-06-10',
    time: '2:00 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Malaysia',
    image: '',
    href: 'https://www.cleartax.com/my/en/e-invoicing-malaysia',
    summary:
      'Peppol is sold as the thing that makes one integration work everywhere. It mostly is — but every country publishes a national specialisation, and the difference between them is where rollout schedules go wrong. A practical comparison of two live networks and an honest account of what carries across and what does not.',
    agenda: [
      'What the Peppol layer standardises, and what it deliberately leaves to each country',
      'MyInvois and InvoiceNow side by side: the same document, two sets of rules',
      'Access point selection, delivery receipts and what to do when one fails',
      'Building a country model your next mandate can slot into',
    ],
  },
  {
    slug: 'sap-to-clearance-in-eight-weeks',
    title: 'SAP to clearance in eight weeks',
    speakers: ['Vivek Menon, Solutions Architect'],
    date: 'May 28 2026',
    datetime: '2026-05-28',
    time: '3:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/erp-integration',
    summary:
      'An eight-week integration is not a faster version of a six-month one — it is a different plan. This session walks a real SAP-to-clearance timeline week by week, including the two decisions taken in week one that make the rest of it possible.',
    agenda: [
      'IDoc, CPI or direct API: choosing the path that fits the landscape you already have',
      'The master data work that has to finish before any of the integration starts',
      'Error handling that a tax team can operate without an ABAP developer',
      'Cutover, parallel running, and how to know clearance is actually working',
    ],
  },
  {
    slug: 'vida-and-the-german-b2b-mandate',
    title: 'ViDA and the German B2B mandate',
    speakers: ['Binidh Gupta, Tax Expert'],
    date: 'May 14 2026',
    datetime: '2026-05-14',
    time: '1:00 PM - IST',
    location: 'Berlin',
    type: 'In person',
    country: 'Germany',
    image: '',
    href: 'https://www.cleartax.com/de/en/e-invoicing-germany',
    summary:
      'Germany’s B2B e-invoicing obligation and the EU’s VAT in the Digital Age package are on overlapping timelines, and teams are planning for them separately. They should not be. An in-person session on where the two meet and what that means for a rollout already underway.',
    agenda: [
      'The German receive-then-issue sequence, and what each stage actually obliges you to do',
      'XRechnung and ZUGFeRD: which one, when, and why both still exist',
      'What ViDA changes about digital reporting, and the dates that matter',
      'Planning one programme instead of two',
    ],
  },
];

export const pastEvents: EventItem[] = [
  {
    slug: 'factur-x-chorus-pro-french-timeline',
    title: 'Factur-X, Chorus Pro and the 2026 French timeline',
    speakers: ['Surbhi Punshi, Tax Expert'],
    date: 'April 16 2026',
    datetime: '2026-04-16',
    time: '10:00 AM - IST',
    location: 'Online',
    type: 'Online',
    country: 'France',
    image: '',
    href: 'https://www.cleartax.com/fr/en/e-invoicing-france',
    summary:
      'France has rewritten its e-invoicing architecture more than once, and each revision moved work between the platform and the taxpayer. A recorded session on where the French model landed and what an enterprise has to build on its own side.',
    agenda: [
      'Factur-X as a hybrid format: what the PDF half is for and what it is not',
      'Chorus Pro, PDPs, and who is responsible for delivery after the reform',
      'The mandatory fields in the French VAT Code an e-invoice is validated against',
      'Sequencing receive and issue obligations across a group',
    ],
  },
  {
    slug: 'itc-leakage-finding-the-money-you-already-paid',
    title: 'ITC leakage: finding the money you already paid',
    speakers: ['Binidh Gupta, Tax Expert'],
    date: 'April 2 2026',
    datetime: '2026-04-02',
    time: '11:00 AM - IST',
    location: 'Bengaluru',
    type: 'In person',
    country: 'India',
    image: '',
    href: 'https://cleartax.in/s/clear-compliance-cloud',
    summary:
      'Most input tax credit is not lost to fraud or to audit. It is lost to vendors who file late, invoices that never match, and a reconciliation cadence that runs after the window has closed. A working session on finding it before that happens.',
    agenda: [
      'The four leakage patterns that account for most of the loss',
      'Vendor filing behaviour as a leading indicator, not a post-mortem',
      'Matching at line level, and why invoice-level matching hides the problem',
      'Turning a monthly reconciliation into a continuous one',
    ],
  },
  {
    slug: 'master-data-is-the-compliance-project',
    title: 'Master data is the compliance project',
    speakers: ['Ankita Rao, Product Lead'],
    date: 'March 19 2026',
    datetime: '2026-03-19',
    time: '3:00 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/e-invoicing',
    summary:
      'Every failed e-invoicing rollout we have reviewed failed in the same place, and it was not the integration. It was customer, vendor and item master data that had been good enough for internal reporting and was not good enough for a tax authority.',
    agenda: [
      'The identifier fields a clearance model will reject you on',
      'Auditing master data quality before you scope the integration',
      'Who owns the clean-up, and why it is not the tax team alone',
      'Keeping it clean once the mandate is live',
    ],
  },
  {
    slug: 'gst-notices-answering-with-your-own-data',
    title: 'GST notices: answering with your own data',
    speakers: ['Binidh Gupta, Tax Expert'],
    date: 'March 5 2026',
    datetime: '2026-03-05',
    time: '11:30 AM - IST',
    location: 'Online',
    type: 'Online',
    country: 'India',
    image: '',
    href: 'https://cleartax.in/s/e-invoicing-gst',
    summary:
      'A notice is a question about data the authority already has. The teams that answer quickly are the ones who can reproduce the same view from their own systems on the same day. A recorded session on building that capability before it is needed.',
    agenda: [
      'Reading a notice: what is actually being asked, and by which system',
      'Assembling the response pack from returns, e-invoice and books in one pass',
      'The reconciliation evidence that closes a notice without escalation',
      'Preventing the repeat notice, which is usually the same root cause',
    ],
  },
  {
    slug: 'invoicenow-the-singapore-rollout',
    title: 'InvoiceNow: the Singapore rollout, one quarter in',
    speakers: ['Vivek Menon, Solutions Architect'],
    date: 'February 19 2026',
    datetime: '2026-02-19',
    time: '2:30 PM - IST',
    location: 'Singapore',
    type: 'In person',
    country: 'Singapore',
    image: '',
    href: 'https://www.cleartax.com/sg/e-invoicing-software',
    summary:
      'A quarter of live traffic tells you things a pilot cannot. An in-person retrospective on Singapore’s InvoiceNow rollout — what held, what needed rework, and what we would sequence differently.',
    agenda: [
      'Access point behaviour under real volume, including the failure modes',
      'Where buyer-side readiness became the constraint',
      'Reconciling delivered documents against what the ERP believes it sent',
      'What transferred cleanly to the next country and what did not',
    ],
  },
  {
    slug: 'an-ai-agent-for-reconciliation',
    title: 'An AI agent for reconciliation, under the hood',
    speakers: ['Ankita Rao, Product Lead'],
    date: 'February 5 2026',
    datetime: '2026-02-05',
    time: '4:00 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/recon-ai',
    summary:
      'Reconciliation is a good test for an agent: the rules are real, the data is messy, and a wrong answer is expensive. A technical walkthrough of how ours is built, where it is allowed to decide, and where it is required to ask.',
    agenda: [
      'Matching beyond exact keys, and how confidence is scored',
      'The review queue: what escalates to a human and why',
      'Auditability — reproducing a decision months later',
      'What it does not do, and the reasons that is deliberate',
    ],
  },
  {
    slug: 'scaling-to-a-million-invoices-a-day',
    title: 'Scaling to a million invoices a day',
    speakers: ['Vivek Menon, Solutions Architect'],
    date: 'January 22 2026',
    datetime: '2026-01-22',
    time: '3:00 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/scale-security',
    summary:
      'Clearance volume is not evenly distributed — it arrives in month-end spikes against government endpoints with their own rate limits and their own downtime. A session on the architecture that absorbs that, and the operational practice around it.',
    agenda: [
      'Queueing and backpressure when the authority is the bottleneck',
      'Retry semantics that do not create duplicate clearances',
      'Observability: knowing a document is stuck before the business does',
      'Capacity planning against a filing calendar rather than a daily average',
    ],
  },
  {
    slug: 'vat-in-the-gulf-six-filing-calendars',
    title: 'VAT in the Gulf: one team, six filing calendars',
    speakers: ['Surbhi Punshi, Tax Expert'],
    date: 'January 8 2026',
    datetime: '2026-01-08',
    time: '12:00 PM - IST',
    location: 'Dubai',
    type: 'In person',
    country: 'UAE',
    image: '',
    href: 'https://www.cleartax.com/ae/e-invoicing-uae',
    summary:
      'Six GCC jurisdictions, six sets of rules, and usually one small team covering all of them. An in-person session on running that without a headcount per country.',
    agenda: [
      'Where the Gulf VAT regimes agree, and the four places they do not',
      'A single close calendar that still respects six deadlines',
      'Standardising evidence so one review serves every filing',
      'What to centralise and what genuinely has to stay local',
    ],
  },
  {
    slug: 'choosing-a-compliance-vendor',
    title: 'Choosing a compliance vendor: the questions that matter',
    speakers: ['Shrenik Shah, Tax Expert'],
    date: 'December 11 2025',
    datetime: '2025-12-11',
    time: '3:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/contact-us',
    summary:
      'Most vendor evaluations compare country coverage and price, and both are the easiest things to change after signing. A candid session on the questions that predict how the next five years go — asked from the side of the table that has answered them.',
    agenda: [
      'Coverage claims: what "supported" means, and how to test it',
      'Change cadence — how fast a schema revision reaches production',
      'Integration ownership, and what happens when your ERP is upgraded',
      'Exit: getting your data and your document history back out',
    ],
  },
  {
    slug: 'oman-e-invoicing-what-the-first-wave-learned',
    title: 'Oman e-invoicing: what the first wave learned',
    speakers: ['Shrenik Shah, Tax Expert'],
    date: 'November 27 2025',
    datetime: '2025-11-27',
    time: '2:00 PM - IST',
    location: 'Muscat',
    type: 'In person',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/om/e-invoicing-oman',
    summary:
      'First-wave enterprises pay for everyone else’s learning. An in-person session in Muscat on what the early Omani adopters hit, how long each fix took, and which of them could have been avoided entirely.',
    agenda: [
      'Scope and timeline as they were applied in practice',
      'The three readiness gaps that appeared in almost every programme',
      'Working with the authority during onboarding',
      'A sequence for wave two that is shorter than wave one’s',
    ],
  },
  {
    slug: 'ksa-phase-ii-waves-readiness-retrospective',
    title: 'KSA Phase II waves: a readiness retrospective',
    speakers: ['Surbhi Punshi, Tax Expert'],
    date: 'November 13 2025',
    datetime: '2025-11-13',
    time: '1:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Saudi Arabia',
    image: '',
    href: 'https://www.cleartax.com/sa/ksa-einvoicing',
    summary:
      'Several waves in, the pattern is clear enough to be useful: the programmes that ran long were not the ones with the hardest ERPs. A retrospective across the waves completed so far and what separated them.',
    agenda: [
      'What actually consumed the onboarding window, measured rather than assumed',
      'Integration versus data: where the time really went',
      'The validation errors that recurred across unrelated enterprises',
      'A readiness checklist derived from the waves already done',
    ],
  },
  {
    slug: 'poland-ksef-lessons-from-a-mandatory-rollout',
    title: 'Poland KSeF: lessons from a mandatory rollout',
    speakers: ['Binidh Gupta, Tax Expert'],
    date: 'October 30 2025',
    datetime: '2025-10-30',
    time: '4:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/pl/en/e-invoicing-poland',
    summary:
      'Poland’s KSeF is a centralised clearance model with a hard cutover, and its rollout history includes a deferral that taught teams the wrong lesson. A recorded session on what the mandatory phase actually required.',
    agenda: [
      'The centralised model: what changes when the state holds the invoice',
      'Authorisation and access rights, which is where most projects stalled',
      'Offline mode and what it obliges you to reconcile afterwards',
      'Reading a deferral correctly the next time one is announced',
    ],
  },
];

/**
 * Both lists, upcoming first. The detail route walks this in
 * `getStaticPaths()`, so an event in either array has a page and moving one
 * between them keeps its URL.
 */
export const allEvents: EventItem[] = [...upcomingEvents, ...pastEvents];

/** The detail URL for an event. One place, so a route rename is one edit. */
export function eventPath(slug: string): string {
  return `/events/${slug}`;
}

/** True when the event is still to come — drives the Upcoming / Past badge. */
export function isUpcoming(event: EventItem): boolean {
  return upcomingEvents.indexOf(event) !== -1;
}

/**
 * Turn the `Name, Role` strings on an event into speaker cards, pulling the
 * bio from `speakerDirectory`.
 *
 * Split on the FIRST comma only — roles contain commas ("Tax Expert, Clear")
 * far more often than names do, and `split(',')[1]` would silently truncate
 * them. A name with no directory entry still yields a card, just without a bio
 * or a profile link, so adding a guest speaker to an event is a one-line edit
 * and never a broken page.
 */
export function resolveSpeakers(event: EventItem): EventSpeaker[] {
  return event.speakers.map((entry) => {
    const comma = entry.indexOf(',');
    const name = (comma === -1 ? entry : entry.slice(0, comma)).trim();
    const role = comma === -1 ? '' : entry.slice(comma + 1).trim();
    const known = speakerDirectory[name];
    return {
      name,
      role,
      bio: known ? known.bio : '',
      image: known ? known.image : '',
      profile: known ? known.profile : '',
    };
  });
}
