/**
 * The events / webinar list — Figma node 14777:26964
 * (cleartax.com/resources/events).
 *
 * SPLIT IN TWO BECAUSE THE PAGE IS. `upcomingEvents` feeds the bordered
 * "Our upcoming webinars & events" block — one lead event plus a scrolling
 * rail. `pastEvents` feeds "Watch our past Webinars & Events here", the
 * filterable grid below it. An event belongs to exactly one, so moving a
 * session from upcoming to past is a cut-and-paste between the two arrays and
 * nothing else has to change.
 *
 * WHY THIS IS A MODULE AND NOT INLINE IN EACH SECTION. `Upcoming.astro` renders
 * both the lead card and the rail from one array, so two hand-kept copies would
 * drift the moment an event is added and the lead card would advertise a
 * session the rail no longer lists.
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
 * two pastes forever.
 */
export interface EventItem {
  title: string;
  /** First is the one the rail card names; the lead card badges up to three. */
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
}

export const upcomingEvents: EventItem[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

export const pastEvents: EventItem[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
