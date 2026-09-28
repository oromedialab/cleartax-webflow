/**
 * Knowledge Hub content — Figma node 15070:48189
 * (https://www.cleartax.com/resources/knowledge-hub).
 *
 * SPLIT IN TWO BECAUSE THE PAGE IS, same pattern as `src/data/events.ts`.
 * `featuredResources` feeds the bordered "Featured resources" block — one
 * lead resource plus a scrolling rail. `resources` feeds "Discover more
 * research & publications", the filterable grid below it. A resource belongs
 * to exactly one, so promoting one into the featured rail is a cut-and-paste
 * between the two arrays and nothing else has to change.
 *
 * NO DETAIL PAGE. Unlike events, there is no `knowledge-hub/[slug].astro` —
 * cards link straight to `href`, the resource's own URL (a blog post, a
 * hosted whitepaper, a case study). Do not add a slug-based route here
 * without also being asked to build the detail page.
 *
 * `category` is the Category filter AND the badge drawn over the card image,
 * so its four values are fixed. `country` must match an option in
 * `knowledge-hub/Filters.astro` — the grid filters on an exact string match,
 * so a value with no option is unreachable and an option with no value gives
 * an empty result.
 *
 * `image: ''` renders the Figma "Visual Placeholder" tint. Drop in a Webflow
 * asset URL to replace it — never a `data:` URI, that alone can blow the
 * 50 KB Embed budget.
 */
export interface ResourceItem {
  /** Stable id for React-portable keys. Not routed anywhere. */
  slug: string;
  title: string;
  /** `Name, Role`. Shown on rail cards; omitted on the lead and the grid. */
  author?: string;
  /** Display form, e.g. 'July 12 2026'. */
  date: string;
  /** ISO form of `date`. Drives <time datetime> and the Sort by control. */
  datetime: string;
  /** e.g. '5 min'. */
  readTime: string;
  /** Drives the Category filter and the badge over the image. */
  category: 'Blog' | 'Whitepaper' | 'Report' | 'Case study';
  /** Must match an option in `sections/knowledge-hub/Filters.astro`. */
  country: string;
  /** Extra chip(s) — Flux Lime "Popular" or the neutral "Recently added". */
  tags?: Array<'Popular' | 'Recently added'>;
  image: string;
  /** The resource's own URL — there is no detail page to route through. */
  href: string;
}

export const featuredResources: ResourceItem[] = [
  {
    slug: 'e-invoicing-malaysia-2026-guidelines-requirements-timeline-exemptions',
    title: 'E-Invoicing in Malaysia 2026: Guidelines, Requirements, Timeline & Exemptions',
    date: '26 May 2026',
    datetime: '2026-05-26',
    readTime: '5 mins',
    category: 'Blog',
    country: 'Malaysia',
    tags: ['Popular'],
    image: '',
    href: 'https://www.cleartax.com/my/en/e-invoicing-malaysia',
  },
  {
    slug: 'uae-invoicing-readiness-list',
    title: 'UAE Invoicing Readiness List',
    author: 'Shrenik Shah, Tax Expert',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '5 min',
    category: 'Blog',
    country: 'UAE',
    tags: ['Recently added'],
    image: '',
    href: 'https://www.cleartax.com/ae/e-invoicing-uae',
  },
  {
    slug: 'scaling-zatca-compliant-invoicing-across-a-growing-network',
    title: 'Scaling ZATCA-Compliant Invoicing Across a Growing Network',
    author: 'Surbhi Punshi, Tax Expert',
    date: 'June 24 2026',
    datetime: '2026-06-24',
    readTime: '8 min',
    category: 'Case study',
    country: 'Saudi Arabia',
    image: '',
    href: 'https://www.cleartax.com/sa/ksa-einvoicing',
  },
  {
    slug: 'peppol-in-practice-what-travels-between-malaysia-and-singapore',
    title: 'Peppol in Practice: What Travels Between Malaysia and Singapore',
    author: 'Ankita Rao, Product Lead',
    date: 'June 10 2026',
    datetime: '2026-06-10',
    readTime: '12 min',
    category: 'Whitepaper',
    country: 'Malaysia',
    image: '',
    href: 'https://www.cleartax.com/sg/e-invoicing-software',
  },
  {
    slug: 'the-state-of-global-e-invoicing-mandates-2026',
    title: 'The State of Global E-Invoicing Mandates, 2026',
    author: 'Vivek Menon, Solutions Architect',
    date: 'May 28 2026',
    datetime: '2026-05-28',
    readTime: '15 min',
    category: 'Report',
    country: 'Global',
    tags: ['Popular'],
    image: '',
    href: 'https://www.cleartax.com/global-e-invoicing-mandates-by-country',
  },
  {
    slug: 'vida-and-the-german-b2b-mandate-a-compliance-primer',
    title: 'ViDA and the German B2B Mandate: A Compliance Primer',
    author: 'Binidh Gupta, Tax Expert',
    date: 'May 14 2026',
    datetime: '2026-05-14',
    readTime: '10 min',
    category: 'Whitepaper',
    country: 'Germany',
    image: '',
    href: 'https://www.cleartax.com/de/en/e-invoicing-germany',
  },
  {
    slug: 'how-a-40-entity-retailer-cut-reconciliation-time-by-70-percent',
    title: 'How a 40-Entity Retailer Cut Reconciliation Time by 70%',
    author: 'Shrenik Shah, Tax Expert',
    date: 'April 30 2026',
    datetime: '2026-04-30',
    readTime: '6 min',
    category: 'Case study',
    country: 'Global',
    tags: ['Recently added'],
    image: '',
    href: 'https://www.cleartax.com/case-studies',
  },
];

export const resources: ResourceItem[] = [
  {
    slug: 'factur-x-chorus-pro-and-the-2026-french-timeline-explained',
    title: "Factur-X, Chorus Pro and the 2026 French Timeline, Explained",
    date: 'April 16 2026',
    datetime: '2026-04-16',
    readTime: '7 min',
    category: 'Blog',
    country: 'France',
    image: '',
    href: 'https://www.cleartax.com/fr/en/e-invoicing-france',
  },
  {
    slug: 'itc-leakage-a-finance-leaders-guide',
    title: "ITC Leakage: A Finance Leader's Guide to Finding the Money You Already Paid",
    date: 'April 2 2026',
    datetime: '2026-04-02',
    readTime: '9 min',
    category: 'Whitepaper',
    country: 'India',
    image: '',
    href: 'https://cleartax.in/s/clear-compliance-cloud',
  },
  {
    slug: 'master-data-is-the-compliance-project-a-readiness-report',
    title: 'Master Data Is the Compliance Project: A Readiness Report',
    date: 'March 19 2026',
    datetime: '2026-03-19',
    readTime: '11 min',
    category: 'Report',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/e-invoicing',
  },
  {
    slug: 'answering-a-gst-notice-with-your-own-data',
    title: 'Answering a GST Notice With Your Own Data',
    date: 'March 5 2026',
    datetime: '2026-03-05',
    readTime: '6 min',
    category: 'Blog',
    country: 'India',
    image: '',
    href: 'https://cleartax.in/s/e-invoicing-gst',
  },
  {
    slug: 'invoicenow-one-quarter-in-a-singapore-case-study',
    title: 'InvoiceNow, One Quarter In: A Singapore Case Study',
    date: 'February 19 2026',
    datetime: '2026-02-19',
    readTime: '8 min',
    category: 'Case study',
    country: 'Singapore',
    image: '',
    href: 'https://www.cleartax.com/sg/e-invoicing-software',
  },
  {
    slug: 'reconciliation-under-the-hood-how-our-ai-agent-decides',
    title: 'Reconciliation, Under the Hood: How Our AI Agent Decides',
    date: 'February 5 2026',
    datetime: '2026-02-05',
    readTime: '10 min',
    category: 'Whitepaper',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/recon-ai',
  },
  {
    slug: 'scaling-to-a-million-invoices-a-day-an-architecture-report',
    title: 'Scaling to a Million Invoices a Day: An Architecture Report',
    date: 'January 22 2026',
    datetime: '2026-01-22',
    readTime: '13 min',
    category: 'Report',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/global/scale-security',
  },
  {
    slug: 'vat-in-the-gulf-running-six-filing-calendars-with-one-team',
    title: 'VAT in the Gulf: Running Six Filing Calendars With One Team',
    date: 'January 8 2026',
    datetime: '2026-01-08',
    readTime: '7 min',
    category: 'Blog',
    country: 'UAE',
    image: '',
    href: 'https://www.cleartax.com/ae/e-invoicing-uae',
  },
  {
    slug: 'choosing-a-compliance-vendor-the-questions-that-matter',
    title: 'Choosing a Compliance Vendor: The Questions That Matter',
    date: 'December 11 2025',
    datetime: '2025-12-11',
    readTime: '9 min',
    category: 'Whitepaper',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/contact-us',
  },
  {
    slug: 'oman-e-invoicing-what-the-first-wave-learned',
    title: 'Oman E-Invoicing: What the First Wave Learned',
    date: 'November 27 2025',
    datetime: '2025-11-27',
    readTime: '8 min',
    category: 'Case study',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/om/e-invoicing-oman',
  },
  {
    slug: 'ksa-phase-ii-waves-a-readiness-retrospective',
    title: 'KSA Phase II Waves: A Readiness Retrospective',
    date: 'November 13 2025',
    datetime: '2025-11-13',
    readTime: '12 min',
    category: 'Report',
    country: 'Saudi Arabia',
    image: '',
    href: 'https://www.cleartax.com/sa/ksa-einvoicing',
  },
  {
    slug: 'poland-ksef-lessons-from-a-mandatory-rollout',
    title: 'Poland KSeF: Lessons From a Mandatory Rollout',
    date: 'October 30 2025',
    datetime: '2025-10-30',
    readTime: '8 min',
    category: 'Blog',
    country: 'Global',
    image: '',
    href: 'https://www.cleartax.com/pl/en/e-invoicing-poland',
  },
];
