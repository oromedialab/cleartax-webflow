/**
 * The blog post list — single source of truth for the listing page and the
 * `/blog-listing/[slug]` detail route.
 *
 * WHY THIS IS A MODULE AND NOT INLINE IN EACH SECTION
 * `[slug].astro` needs the full list at build time to generate one page per
 * post via `getStaticPaths()`. If the listing sections kept their own arrays,
 * a card could link to a slug that has no page — a 404 that nothing in the
 * build would catch. Sharing one array makes that impossible by construction.
 *
 * This does NOT break the "props never reach Webflow" rule. That rule is about
 * values a *page* passes down, which the embed route never supplies. A module
 * import is resolved at build time, so the rendered embed HTML carries the real
 * content either way.
 *
 * `slug` is the URL segment. In Webflow these become the CMS collection item
 * slugs; keep them matching or the pasted listing links to nothing.
 *
 * `image: ''` renders the Figma "Visual Placeholder" tint. Drop in a Webflow
 * asset URL to replace it — never a `data:` URI, that alone can blow the 50 KB
 * Embed budget.
 */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  /** ISO form of `date`, for <time datetime>. */
  datetime: string;
  readTime: string;
  image: string;
  /** Must match an option in `sections/blog-listing/Filters.astro`. */
  topic: string;
  /** Must match an option in `sections/blog-listing/Filters.astro`. */
  country: string;
  author: string;
  authorRole: string;
}

export const posts: BlogPost[] = [
  {
    slug: 'uae-invoicing-readiness-list',
    title: 'UAE Invoicing Readiness list',
    excerpt: 'A practical framework to get ahead of the mandate',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '23 min',
    image: '',
    topic: 'E-Invoicing',
    country: 'UAE',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'zatca-phase-ii-integration-checklist',
    title: 'ZATCA Phase II: integration checklist',
    excerpt: 'What to validate before your onboarding window opens',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '14 min',
    image: '',
    topic: 'Compliance',
    country: 'Saudi Arabia',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'connecting-sap-to-a-global-e-invoicing-platform',
    title: 'Connecting SAP to a global e-invoicing platform',
    excerpt: 'Middleware, IDocs and the trade-offs between them',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '18 min',
    image: '',
    topic: 'ERP Integration',
    country: 'Global',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'france-e-invoicing-the-2026-timeline',
    title: 'France e-invoicing: the 2026 timeline',
    excerpt: 'Who is in scope, when, and what Chorus Pro changes',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '11 min',
    image: '',
    topic: 'E-Invoicing',
    country: 'France',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'germany-b2b-e-invoicing-explained',
    title: 'Germany B2B e-invoicing, explained',
    excerpt: 'Preparing for a mandate that starts with receiving, not sending',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '9 min',
    image: '',
    topic: 'Compliance',
    country: 'Germany',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'malaysia-myinvois-beyond-the-first-wave',
    title: 'Malaysia MyInvois beyond the first wave',
    excerpt: 'Lessons from the enterprises that went live early',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '12 min',
    image: '',
    topic: 'E-Invoicing',
    country: 'Malaysia',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'reconciliation-without-the-spreadsheet',
    title: 'Reconciliation without the spreadsheet',
    excerpt: 'How AI agents close the gap between invoice and ledger',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '10 min',
    image: '',
    topic: 'Tax Technology',
    country: 'Global',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'ksef-and-the-polish-rollout',
    title: 'KSeF and the Polish rollout',
    excerpt: 'A migration plan for groups filing across several entities',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '15 min',
    image: '',
    topic: 'Compliance',
    country: 'Poland',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'invoicenow-in-singapore',
    title: 'InvoiceNow in Singapore',
    excerpt: 'Peppol-first invoicing and what it asks of your billing stack',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '8 min',
    image: '',
    topic: 'E-Invoicing',
    country: 'Singapore',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'scaling-to-a-million-invoices-a-day',
    title: 'Scaling to a million invoices a day',
    excerpt: 'The architecture behind peak-period filing',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '16 min',
    image: '',
    topic: 'Tax Technology',
    country: 'Global',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'oracle-and-netsuite-connectors-end-to-end',
    title: 'Oracle and NetSuite connectors, end to end',
    excerpt: 'Mapping tax determination once and reusing it everywhere',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '13 min',
    image: '',
    topic: 'ERP Integration',
    country: 'Global',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
  {
    slug: 'whats-new-in-the-compliance-cloud',
    title: "What's new in the compliance cloud",
    excerpt: 'Product updates from the last quarter, in one place',
    date: 'July 12 2026',
    datetime: '2026-07-12',
    readTime: '6 min',
    image: '',
    topic: 'Product',
    country: 'Global',
    author: 'Rajan Rauniyar',
    authorRole: 'Senior Content Writer',
  },
];

/** The detail-page URL for a post. One place to change when the Webflow CMS
 *  collection settles on its own path. */
export function postPath(slug: string): string {
  return `/blog-listing/${slug}`;
}
