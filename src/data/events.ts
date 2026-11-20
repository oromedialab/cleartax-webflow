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
  'Bo Lykkegaard': {
    bio: '',
    image: '',
    profile: '',
  },
  'Srivatsan Chari': {
    bio: '',
    image: '',
    profile: '',
  },
  'Michael Walther': {
    bio: '',
    image: '',
    profile: '',
  },
  'Raoul Koch': {
    bio: '',
    image: '',
    profile: '',
  },
  'Francesco Cropanese': {
    bio: '',
    image: '',
    profile: '',
  },
  'Surbhi Punshi': {
    bio: '',
    image: '',
    profile: '',
  },
  'Rohit Jain': {
    bio: '',
    image: '',
    profile: '',
  },
  'Taha Siddiqui': {
    bio: '',
    image: '',
    profile: '',
  },
  'Eoin': {
    bio: '',
    image: '',
    profile: '',
  },
  'Ghulam Sabir': {
    bio: '',
    image: '',
    profile: '',
  },
  'Mike San Diego': {
    bio: '',
    image: '',
    profile: '',
  },
  'Fuad Shahin': {
    bio: '',
    image: '',
    profile: '',
  },
  'CA Satish Jain': {
    bio: '',
    image: '',
    profile: '',
  },
  'David (DGFiP) + Jean Pierre Gardille': {
    bio: '',
    image: '',
    profile: '',
  },
};

export const upcomingEvents: EventItem[] = [
  {
    slug: 'idc-ai-x-finance-digital-transformation',
    title: 'IDC: AI x Finance - Digital Transformation',
    speakers: ['Bo Lykkegaard, Associate VP for Software Research Europe at IDC', 'Srivatsan Chari, ClearTax Co-founder'],
    date: 'December 8 2026',
    datetime: '2026-12-08',
    time: '11:00 AM - CET',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6afed94aa62d1a6e06e57670_creative-1.png',
    href: 'https://www.cleartax.com/webinar/global/idc-cleartax-ai-in-finance-december',
    summary: 'Most finance AI pilots succeed. Scaling them is where enterprises get stuck. IDC data shows 76.4% of finance AI pilots are rated mostly or completely successful by finance decision-makers, yet only 47% of AI proofs of concept moved to production in the past 12 months, and the number one blocker to production is data quality or availability.\n\nData quality is the top reason AI proofs of concept fail to reach production. Risk, compliance and trust concerns come next: finance needs to trust what AI does before it goes live, and for now finance leaders want a person in the loop for agentic workflows. Many projects are also still too early for production, held back by business and technology maturity.\n\nFinance wants AI from the software it already uses. An IDC survey finds that finance leaders prefer AI agents delivered by their software providers rather than building their own. And e-invoicing gives that AI clean, compliant data: every e-invoice in a mandated country is structured, validated and compliant, so when your e-invoicing provider delivers the AI, the data foundation is already in place.\n\nFor CFOs, financial controllers, and heads of AP and tax at multi-entity enterprises. Free to attend. Can’t make it live? Register anyway and we’ll send the recording.',
    agenda: [
      'Where finance AI stands today: new IDC research on why finance AI pilots succeed but struggle to scale, what blocks production, and how finance leaders want AI delivered',
      'From e-invoices to AI: a customer story of how one enterprise built on its e-invoicing data to take finance AI from pilot to production',
      'Live Q&A with both speakers: bring your questions on data readiness, trust, human oversight and first use cases',
    ],
  },
];

export const pastEvents: EventItem[] = [
  {
    slug: 'the-bigger-picture-e-invoicing-peppol-vida-and-ai',
    title: 'The bigger picture: E-Invoicing, Peppol, VIDA and AI',
    speakers: ['Michael Walther', 'Raoul Koch'],
    date: 'November 12 2026',
    datetime: '2026-11-12',
    time: '11:00 Uhr',
    location: 'Online',
    type: 'Online',
    country: 'Germany',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6afc2df1f59a9755384d544b_GERMANY%20Thumbnail.png',
    href: 'https://go.cleartax.com/hubfs/Germany/Webinars/OND%202026/The%20bigger%20picture%20E-Invoicing%2cPeppol%2cVIDA%20and%20AI-webinar.mp4',
    summary: 'Europe’s e-invoicing mandates are evolving at different paces, and businesses need to prepare while keeping systems and processes aligned. Join Michael Walther (Architecture & Network Consultant, OpenPeppol; Co-Founder, The Invoicing Hub) and Raoul Koch (Country Director Germany, ClearTax) for a look at where Europe stands now, why more tax authorities and markets are turning to Peppol, and what ViDA means on the road to 2030.\n\nWe’ll cover how Peppol works in general and how it is used in Germany, what the five-corner model changes in the exchange of invoice data, the role of EN 16931 and structured invoice data, Germany’s implementation timeline (including the transition for larger businesses through 31 December 2026 and the next stage from 2027), and what businesses can learn from Belgium when preparing for complex mandates.\n\nWe’ll also look at what is practical with AI today, from flagging anomalies to spotting reconciliation gaps and prioritising tax risks. AI is only as useful as the quality and structure of the data it works with, and tax expertise is still needed to interpret exceptions and decide what action to take.',
    agenda: [
      'Welcome and the map: where Europe stands right now, with one direction and different timelines (5 mins, Raoul Koch)',
      'Peppol, one network, many mandates: why Peppol is being adopted across markets, how it works in Germany, and what the five-corner model changes (15 mins, Michael Walther)',
      'ViDA and the road to 2030: its direction and implementation approaches, and practical lessons from Germany and Belgium (15 mins, Michael Walther and Raoul Koch)',
      'From compliance data to AI: what finance teams can do with structured invoice data, why data quality matters, and where tax expertise remains essential (10 mins, Raoul Koch)',
      'Your questions, answered: open Q&A with both speakers (15 mins)',
    ],
  },
  {
    slug: 'spain-s-crea-y-crece-e-invoicing-what-applies-to-you-what-doesn-t-what-to-do-first',
    title: 'Spain’s Crea y Crece E-Invoicing: What Applies to You, What Doesn’t, What to Do First',
    speakers: ['Francesco Cropanese, Account director-Spain', 'Surbhi Punshi, Assistant Director-Product'],
    date: 'November 3 2026',
    datetime: '2026-11-03',
    time: '11:00 AM - CEST',
    location: 'Online',
    type: 'Online',
    country: 'Spain',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bd54e8a1b67df9e98d_spain-s-crea-y-crece-e-invoicing-what-applies-to-you-what-doesn-t-what-to-do-first.png',
    href: 'https://go.cleartax.com/hubfs/Spain/Webinars/Nov%203%2cSpain%20Crea%20y%20Crece%20E-Invoicing.mp4',
    summary: 'Spain’s Crea y Crece Law is bringing mandatory B2B electronic invoicing to businesses operating in Spain. But understanding what the mandate requires, whether it applies to your business, and how it fits alongside existing tax obligations can be challenging.\n\nJoin us for a live conversation with Francesco Cropanese, Account Director - Spain, and Surbhi Punshi, Associate Director - Product, ClearTax, where they’ll break down Spain’s factura electrónica requirements in simple terms, clarify common misconceptions, and outline the first steps businesses can take to prepare. We’ll also cover what applies to your business, what you can stop worrying about, and how to begin preparing without unnecessary complexity.\n\nWalk away with a clearer view of the Spain factura electrónica, insights into common misconceptions, how to minimise disruption to existing finance operations and protect the security of invoicing processes, a CFO-focused roadmap for painless compliance, and practical guidance on ERP and integration readiness.\n\nA 45-minute session, followed by live Q&A.',
    agenda: [
      'Why Spain is moving to B2B e-invoicing: what Crea y Crece aims to achieve, and why businesses should start with understanding the requirements, not buying software',
      'What applies, what doesn’t: which businesses and B2B transactions are in scope, how turnover affects timelines, how Crea y Crece differs from SII, and what to verify before concluding you are exempt or already compliant',
      'What changes in your invoicing process: structured e-invoices versus PDFs sent by email, delivery, acceptance and rejection statuses, payment-status reporting, and traceability across the invoice lifecycle',
      'What you should do first: establish whether and when the mandate applies, map invoicing processes and ERP dependencies, check invoice data quality and formats, and identify gaps in status handling, reporting, archiving and exception management',
      'How to prepare without unnecessary disruption: why compliance does not automatically mean replacing an ERP, why validation, monitoring and exception handling matter, and how to build a scalable approach instead of a one-off fix',
      'Live Q&A',
    ],
  },
  {
    slug: 'gst-3-0-the-next-cfo-agenda-for-indian-enterprises',
    title: 'GST 3.0: The Next CFO Agenda for Indian Enterprises',
    speakers: ['Rohit Jain, GST Expert, ClearTax'],
    date: 'October 28 2026',
    datetime: '2026-10-28',
    time: '11:00 AM',
    location: 'Online',
    type: 'Online',
    country: 'India',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bdbd82eddaffc02cc6_gst-3-0-the-next-cfo-agenda-for-indian-enterprises.png',
    href: 'https://go.cleartax.com/hubfs/India/Webinars/OND%202026/28th-Oct-Virtual%20Event-India-GST-3.0.mp4',
    summary: 'Impact of the 57th GST Council Meeting on cash flow, business confidence and the future of finance. The 57th GST Council Meeting recommended changes to the law. For a CFO, the questions are more immediate. What could these proposals change in the cash forecast, the risk review and the way finance works?\n\nJoin CA Rohit Kumar Jain for a CFO-focused discussion. Explore what deserves attention now and what must wait for the final legal text.\n\nPicture the next review. Treasury asks whether refunds could arrive sooner. Tax has a list of credits that may become eligible. The reporting team is assessing return mismatches. Legal raises a notice spanning multiple financial years. These proposals are not yet new entitlements or obligations. But waiting for implementation can leave a CFO without a clear view of the potential implications for cash, controls and disputes. The useful question now is: what can we quantify and prepare without assuming the law has changed?\n\nLeave with a way to separate potential cash from cash you can forecast. See which controls you can improve now, and which rules are still being finalised. Identify disputes that need review without changing your position prematurely. This is not a walkthrough of every Council recommendation. It is a discussion about the decisions a CFO needs to make around them.\n\nDesigned for senior finance and tax stakeholders: CFOs and Finance Directors, Heads of Tax and Tax Directors, Heads of Finance Transformation, ERP and Finance Systems Leaders, and Indirect Tax Programme Owners.',
    agenda: [
      'Cash flow: which refund proposals could affect recovery, and what should stay out of the forecast for now?',
      'Credit: where is ITC difficult to trace, substantiate or assess against the proposed changes?',
      'Returns: can finance see the exceptions behind the numbers reported in GSTR-3B?',
      'E-invoicing: which specified purchase flows could bring new work into AP and finance systems?',
      'Disputes: how should proposed procedural relief and the multi-year notice validation clause inform your risk review?',
    ],
  },
  {
    slug: 'uae-e-invoicing-your-asp-is-not-your-go-live-plan',
    title: 'UAE E-Invoicing:Your ASP is not your Go-live Plan',
    speakers: ['Taha Siddiqui, Senior E-Invoicing Consultant'],
    date: 'October 21 2026',
    datetime: '2026-10-21',
    time: '11:00:00 AM GST',
    location: 'Online',
    type: 'Online',
    country: 'UAE',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bdadca47bb17e99f34_uae-e-invoicing-your-asp-is-not-your-go-live-plan.png',
    href: 'https://go.cleartax.com/hubfs/UAE/Webinars/OND%202026/Oct%2021st%20Webinar-%20UAE.mp4',
    summary: 'The CFO’s January 2027 reality check. Selecting an ASP is a milestone. Knowing what’s actually ready for January is a different question.\n\nPicture the 30 October steering-committee meeting. The ASP decision is made, but no one can say which invoice flows have been mapped, when end-to-end testing will begin, or who is responsible for unresolved issues.\n\nWhether your business is still finalising its ASP choice or has already appointed one, join Taha Siddiqui, Senior E-invoicing Consultant at ClearTax Middle East, for a CFO-focused look at what your go-live plan needs to show. We’ll look at the scope, data, integration, testing and ownership questions behind an “on track” update, so you can ask for evidence, not just reassurance, and leave with the right questions to take into your next steering-committee meeting.\n\nDesigned for senior finance and tax stakeholders in GCC: CFOs and Finance Directors, Heads of Tax and Tax Directors, Heads of Finance Transformation, ERP and Finance Systems Leaders, and E-invoicing and Indirect Tax Programme Owners.',
    agenda: [
      'ASP selected or nearly selected: what does your January plan actually tell you?',
      'Which invoice flows might be missing from the ERP plan everyone has reviewed?',
      '“Integration underway” versus an invoice journey that’s been tested end to end',
      'Who takes ownership when an invoice doesn’t move as expected?',
      'What should a CFO see before signing off on a green go-live status?',
    ],
  },
  {
    slug: 'at-the-leader-s-table-beyond-e-invoicing-building-the-ai-foundation-for-finance',
    title: 'At the Leader’s Table Beyond e-Invoicing: Building the AI Foundation for Finance',
    speakers: ['Eoin, Head of Tax Technology - MENA, Keeyns', 'Ghulam Sabir, Group CFO – EMEA, SB Group International', 'Mike San Diego, Senior Vice President & CFO, EON Group'],
    date: 'September 29 2026',
    datetime: '2026-09-29',
    time: '12:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'Global',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bce28cbf828d1f0ca1_at-the-leader-s-table-beyond-e-invoicing-building-the-ai-foundation-for-finance.png',
    href: 'https://go.cleartax.com/hubfs/Global%20e-Invoicing/Webinars/JAS%202026/29th%20Sept%20Webinar%20-%20Global%20-%20Beyond%20e-Invoicing%20Building%20the%20AI%20Foundation.mp4',
    summary: 'Global e-invoicing is more than a series of local mandates. For multinational enterprises, it is an opportunity to build connected data, systems, and governance that can scale across markets, and prepare finance for an AI-driven future.\n\nJoin a live global conversation with senior finance and tax leaders from MENA, EMEA, and the Philippines: Eoin Fitzgerald, Head of Tax Technology, Keeyns (MENA); Ghulam Sabir, Group CFO, SBG International (EMEA); and Mike San Diego, SVP & CFO, EON Group (Philippines). Hosted by Mohammed Farhan, Business Head – Southeast Asia & KSA, ClearTax.',
    agenda: [
      'Lessons from mature and emerging e-invoicing markets',
      'Repeatable rollout approaches, ERP integration, and data governance',
      'Where automation and interoperability can reduce risk',
      'The leadership agenda for AI-ready finance',
    ],
  },
  {
    slug: 'beyond-compliance-navigating-the-next-wave-of-tax-transformation-in-the-gcc',
    title: 'Beyond Compliance:Navigating the Next Wave of Tax Transformation in the GCC',
    speakers: ['Fuad Shahin, Head of Tax – MENA at DHL'],
    date: 'September 9 2026',
    datetime: '2026-09-09',
    time: '12:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'UAE',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bde174bcea7fdee068_beyond-compliance-navigating-the-next-wave-of-tax-transformation-in-the-gcc.png',
    href: 'https://go.cleartax.com/hubfs/UAE/Webinars/9th%20Sept%20-%20UAE%20-%20Navigating%20the%20Next%20Wave%20of%20Tax%20Transformaiton%20in%20GCC.mp4',
  },
  {
    slug: 'readinss-illusion-a-live-cfo-benchmarking-workshop',
    title: 'Readinss illusion: A Live CFO Benchmarking Workshop',
    speakers: ['CA Satish Jain, Vice President,Head-Finace Technology'],
    date: 'September 9 2026',
    datetime: '2026-09-09',
    time: '4:00 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'India',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bd015a3e2d605decd9_readinss-illusion-a-live-cfo-benchmarking-workshop.png',
    href: 'https://go.cleartax.com/hubfs/India/Webinars/JAS%202026/9th%20Sept%20Webinar%20-%20India%20-%20A%20Live%20CFO%20Benchmarking%20Workshop.mp4',
    summary: 'See where your taxes actually stand. Most Indian enterprise CFOs believe their tax compliance is under control. The data from 500 companies and 12 crore+ tax transactions tells a different story.\n\nThis isn’t a webinar where someone presents slides. It’s a live benchmarking session where you vote first, and the industry data lands after. Five questions. Five live reveals. By the end, you’ll know exactly where your enterprise stands against the national benchmark. A CFO guest translates every gap into the one language that matters: what it’s costing your bottom line.\n\nNo sensitive data required. No company disclosures. Just a 45-minute mirror held up to your assumptions, and a clear picture of how far your compliance posture sits from best-in-class. Walk away with the State of Tax Assurance Report 2026 and your readiness diagnostic.',
    agenda: [
      'Does your compliance confidence match your actual visibility?',
      'Where does your ITC recovery rate really stand?',
      'What is a GST notice actually costing your business?',
      'Are you exposed to the fastest-growing compliance liability in GST?',
      'How quickly can your team respond when a notice lands?',
    ],
  },
  {
    slug: 'france-e-invoicing-the-dgfip-s-view-from-day-one-and-the-road-to-vida-2030',
    title: 'France e-invoicing: The DGFiP\'s view from day one, and the road to ViDA 2030',
    speakers: ['David (DGFiP) + Jean Pierre Gardille, E-Invoicing Expert,Eastern region'],
    date: 'August 27 2026',
    datetime: '2026-08-27',
    time: '2:30 PM - IST',
    location: 'Online',
    type: 'Online',
    country: 'France',
    image: 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6b0010bd927a36fc472924c0_france-e-invoicing-the-dgfip-s-view-from-day-one-and-the-road-to-vida-2030.png',
    href: 'https://go.cleartax.com/hubfs/France/Webinar/JAS%202026/27th%20August%20Webinar-%20France%20e-invoicing%20The%20DGFiPs%20view%20from%20day%20one%2c%20and%20the%20road%20to%20ViDA%202030.mp4',
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
