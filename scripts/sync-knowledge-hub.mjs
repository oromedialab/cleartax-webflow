/**
 * Regenerates src/data/knowledge-hub.ts from the Google Sheet feed
 * (apps-script/knowledge-hub.gs).
 *
 *   npm run sync:knowledge-hub            # fetch + write
 *   npm run sync:knowledge-hub -- --dry   # fetch + validate, write nothing
 *
 * Feed URL: KNOWLEDGE_HUB_FEED_URL in the environment or .env.local.
 * Everything above `export const featuredResources` in the data file (the
 * interface and its comments) is kept; everything below is regenerated, so do
 * not hand-edit the arrays — edit the sheet.
 */
import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/data/knowledge-hub.ts', import.meta.url);
const FILTERS = new URL('../src/sections/knowledge-hub/Filters.astro', import.meta.url);
const CATEGORIES = ['Whitepaper', 'Report', 'Case study'];
// Sheet types that are deliberately not shown on the page.
const SKIP_TYPES = ['blog', 'opinion note'];
const TAGS = ['Popular', 'Recently added'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dry = process.argv.includes('--dry');

async function feedUrl() {
  if (process.env.KNOWLEDGE_HUB_FEED_URL) return process.env.KNOWLEDGE_HUB_FEED_URL;
  try {
    const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
    const m = env.match(/^KNOWLEDGE_HUB_FEED_URL=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  throw new Error('Set KNOWLEDGE_HUB_FEED_URL (env or .env.local) to the Apps Script /exec URL.');
}

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseDate(s) {
  let y, m, d;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else {
    const t = new Date(`${s} UTC`);
    if (isNaN(t)) return null;
    [y, m, d] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
  }
  return {
    date: `${MONTHS[m - 1]} ${d} ${y}`,
    datetime: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  };
}

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function render(item) {
  const lines = [`    slug: ${q(item.slug)},`, `    title: ${q(item.title)},`];
  if (item.author) lines.push(`    author: ${q(item.author)},`);
  lines.push(
    `    date: ${q(item.date)},`,
    `    datetime: ${q(item.datetime)},`,
    `    readTime: ${q(item.readTime)},`,
    `    category: ${q(item.category)},`,
    `    country: ${q(item.country)},`,
  );
  if (item.tags.length) lines.push(`    tags: [${item.tags.map(q).join(', ')}],`);
  lines.push(`    image: ${q(item.image)},`, `    href: ${q(item.href)},`);
  return `  {\n${lines.join('\n')}\n  },`;
}

// ---- Sheet -> ResourceItem mapping. Edit these constants, not the sheet. ----
// The Asset tab only has a month, so the year comes from here.
const ASSET_YEAR = 2026;
// Case study rows carry no date at all; each gets a day inside this range.
const CASE_STUDY_FROM = '2026-01-01';
const CASE_STUDY_TO = '2026-10-31';
// Sheet country text -> option in Filters.astro.
const COUNTRY_MAP = {
  'global e-invoicing': 'Global',
  'global': 'Global',
  'ksa': 'Saudi Arabia',
};
// Sheet "Type" text -> category.
const TYPE_MAP = { whitepaper: 'Whitepaper', report: 'Report', 'case study': 'Case study' };

// Thumbnails. Nine creatives, handed out in page order (Featured first, then
// the grid newest-first), so the same image never appears twice within any
// 9 consecutive cards. Deterministic: no Math.random (builds must be
// reproducible). Filtering the grid shows a subset, so repeats can still
// appear inside a filtered view.
const B = 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/';
const CREATIVES = [
  '6afed94aa62d1a6e06e57670_creative-1.png',
  '6afed94b062cffee12e5f311_creative-2.png',
  '6afed94bd19ae2bd2b3ad48f_creative-3.png',
  '6afed94be5d56365adf02769_creative-4.png',
  '6afed94bfa4de465d309a75a_creative-5.png',
  '6afed94b19724f176d40a76a_creative-6.png',
  '6afed94b245f343824aaca4f_creative-7.png',
  '6afed94b7fac6272d3dd00da_creative-8.png',
  '6afed94bf28ffcae1819fea3_creative-9.png',
].map((f) => B + f);
const creativeAt = (n) => CREATIVES[n % CREATIVES.length];

// Apps Script web apps can take a long time on a cold start, so allow 90s per
// attempt and try up to 3 times before giving up.
const FEED_URL = await feedUrl();
const ATTEMPTS = 3, TIMEOUT_MS = 90000;
let res, lastErr;
for (let attempt = 1; attempt <= ATTEMPTS && !res; attempt++) {
  try {
    res = await fetch(FEED_URL, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status >= 500 && attempt < ATTEMPTS) { lastErr = `HTTP ${res.status}`; res = undefined; }
  } catch (e) {
    lastErr = e.name === 'TimeoutError' ? `no answer within ${TIMEOUT_MS / 1000}s` : (e.cause?.code ?? e.message);
  }
  if (!res && attempt < ATTEMPTS) console.warn(`warn: feed attempt ${attempt}/${ATTEMPTS} failed (${lastErr}); retrying…`);
}
if (!res) {
  throw new Error(`Could not read the feed (${lastErr}). Open the /exec URL in a browser: if it does not show JSON, check the Apps Script deployment (Executions in its sidebar).`);
}
if (!res.ok) throw new Error(`Feed returned HTTP ${res.status}`);
const feed = await res.json().catch(() => {
  throw new Error('Feed did not return JSON — check the Web app access is "Anyone" and a new version is deployed.');
});
if (feed.error || !feed.tabs) throw new Error(`Feed error: ${feed.error ?? 'no "tabs" key — redeploy apps-script/knowledge-hub.gs'}`);
for (const t of ['Asset', 'Case study']) if (!Array.isArray(feed.tabs[t])) throw new Error(`Tab "${t}" missing from feed`);

// Header lookup that ignores case and spacing, so "Read time", "read time" and
// "Readtime" all work for the optional columns.
const col = (r, name) => {
  const k = Object.keys(r).find((h) => h.toLowerCase().replace(/\s+/g, '') === name);
  return k ? clean(r[k]) : '';
};
// Read time may be headed "Read time", "Reading time", "Time to read", "Duration"…
// and may be a bare number ("5") or "5 mins": show it as "5 min" either way.
const readTimeOf = (r) => {
  const k = Object.keys(r).find((h) => /^(read(ing)?time(\(?mins?\)?)?|timetoread|duration)$/.test(h.toLowerCase().replace(/[\s_-]+/g, '')));
  const v = k ? clean(r[k]) : '';
  return /^\d+(\.\d+)?$/.test(v) ? `${v} min` : v.replace(/\bmins\b/i, 'min');
};
const isYes = (v) => /^(yes|y|true|1|x)$/i.test(v);
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const country = (s) => { const c = clean(s); return COUNTRY_MAP[c.toLowerCase()] ?? c; };
const firstUrl = (...c) => c.map(clean).find((u) => /^https?:\/\//.test(u)) || '';
const isoMonth = (name) => {
  const i = MONTHS.findIndex((m) => m.toLowerCase().startsWith(clean(name).toLowerCase().slice(0, 3)) && clean(name).length >= 3);
  return i < 0 ? null : `${ASSET_YEAR}-${String(i + 1).padStart(2, '0')}-01`;
};
const fromIso = (iso) => parseDate(iso);

// Read times measured from the documents themselves (scripts/analyze-read-times.py).
// A value typed in the sheet always wins; this only fills the blanks.
let measured = {};
try { measured = JSON.parse(await readFile(new URL('../src/data/knowledge-hub-readtimes.json', import.meta.url), 'utf8')); } catch {}

// Cover titles of image-only PDFs (no text layer, so the analyser cannot read
// them). Read by eye from page 1 of each PDF; keyed by the sheet's link.
const TITLE_OVERRIDES = {
  'https://go.cleartax.com/hubfs/India/Case%20studies/No%20broker%20case%20study.pdf':
    'A leading real estate tech marketplace now generates lakhs of invoices per month with Clear E-commerce Invoicing',
  'https://go.cleartax.com/hubfs/India/Case%20studies/Blinkit%20case%20study.pdf':
    'This Top ‘Quick-Commerce’ Platform Masters 10-minute Delivery with e-Invoicing Excellence',
};

const rows = [];
feed.tabs['Asset'].forEach((r, i) => {
  const title = clean(r['Title']);
  if (!title) return;
  if (SKIP_TYPES.includes(clean(r['Type']).toLowerCase())) return;
  const iso = isoMonth(r['Month']);
  // Link priority: the HubSpot document, then the Ref link (also a HubSpot PDF),
  // and only as a last resort the website landing page.
  rows.push({
    at: `Asset row ${i + 2} ("${title}")`, title,
    category: TYPE_MAP[clean(r['Type']).toLowerCase()] ?? clean(r['Type']),
    country: country(r['Country']),
    readTime: readTimeOf(r), featured: isYes(col(r, 'featured')),
    iso, monthOnly: true, href: firstUrl(r['HubSpot link with Website UTM (English language)'], r['Ref link in English Language'], r['UTM Link with Website']),
  });
});
feed.tabs['Case study'].forEach((r, i) => {
  // Anonymous case studies are not published on the Knowledge Hub.
  if (clean(r['Customer naming']).toLowerCase() === 'anonymous') return;
  const href = firstUrl(r['Hubspot Link']);
  if (!href) {
    if (clean(r['AA'])) console.warn(`warn: Case study row ${i + 2} ("${clean(r['AA'])}") skipped: no link yet`);
    return;
  }
  const c = country(r['Country']);
  // Title = the case study's own cover title, read from its PDF
  // (scripts/analyze-read-times.py). Image-only PDFs have none, so those fall
  // back to the sheet's title cell (column "AA"). Nothing is ever added.
  const title = TITLE_OVERRIDES[href] || clean(measured[href]?.title) || clean(r['AA']);
  if (!title) { console.warn(`warn: Case study row ${i + 2} skipped: empty title`); return; }
  rows.push({ at: `Case study row ${i + 2} ("${title}")`, title, category: 'Case study', country: c, iso: CASE_STUDY_FROM, spread: true, href, readTime: readTimeOf(r), featured: isYes(col(r, 'featured')) });
});

// "Random" days that are stable: a hash of the slug, never Math.random(), so
// re-running the sync gives the same dates (builds must be reproducible).
const hash = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const spreadDate = (slug) => {
  const from = Date.parse(CASE_STUDY_FROM), to = Date.parse(CASE_STUDY_TO);
  const days = Math.round((to - from) / 86400000) + 1;
  return new Date(from + (hash(slug) % days) * 86400000).toISOString().slice(0, 10);
};

const filtersSrc = await readFile(FILTERS, 'utf8');
const errors = [], warnings = [], seen = new Map();
const items = [];
const dead = [];
for (const row of rows) {
  // Links the analyser found returning 404/410: don't publish a card to nowhere.
  if (measured[row.href]?.dead) { dead.push(row); continue; }
  if (!CATEGORIES.includes(row.category)) errors.push(`${row.at}: type "${row.category}" is not one of ${CATEGORIES.join(', ')} (add it to TYPE_MAP)`);
  if (!row.href) errors.push(`${row.at}: no usable link`);
  if (!row.country) errors.push(`${row.at}: country is empty`);
  else if (!filtersSrc.includes(`"${row.country}"`)) warnings.push(`${row.at}: country "${row.country}" has no option in Filters.astro — unreachable by filter (add to COUNTRY_MAP or Filters)`);
  let slug = slugify(row.title);
  const n = (seen.get(slug) ?? 0) + 1; seen.set(slug, n);
  if (n > 1) slug = `${slug}-${n}`;
  let iso = row.iso;
  if (iso && row.monthOnly) iso = iso.slice(0, 8) + String(1 + (hash(slug) % 28)).padStart(2, '0');
  if (iso && row.spread) iso = spreadDate(slug);
  const dt = iso ? fromIso(iso) : null;
  if (!dt) errors.push(`${row.at}: month unreadable`);
  items.push({ slug, title: row.title, author: '', ...(dt || { date: '', datetime: '' }), readTime: row.readTime || (measured[row.href]?.minutes ? `${measured[row.href].minutes} min` : ''), featured: !!row.featured, category: row.category, country: row.country, tags: [], image: '', href: row.href });
}

dead.forEach((d) => console.warn(`warn: ${d.at} left out: link is a 404 (${d.href})`));
warnings.forEach((w) => console.warn('warn:', w));
if (errors.length) {
  errors.forEach((e) => console.error('error:', e));
  console.error(`\n${errors.length} problem(s) — ${OUT.pathname} NOT written.`);
  process.exit(1);
}

const current = await readFile(OUT, 'utf8');
const head = current.slice(0, current.indexOf('export const featuredResources'));

// Newest first = the page's default sort. Stable, so equal dates (all the case
// studies) keep their sheet order.
const byNewest = (a, b) => (a.datetime < b.datetime ? 1 : a.datetime > b.datetime ? -1 : 0);
items.sort(byNewest);

// Featured: rows marked "Featured = yes" in the sheet. If nobody has marked
// any yet, fall back to the newest FEATURED_FALLBACK so the block is never
// empty. Featured items are NOT repeated in the grid.
const FEATURED_FALLBACK = 7;
const marked = items.filter((it) => it.featured);
const featured = marked.length ? marked : items.slice(0, FEATURED_FALLBACK);
if (!marked.length) console.warn(`warn: no row has Featured = yes; using the ${featured.length} newest. Add a "Featured" column to the sheet to choose.`);
const rest = items.filter((it) => !featured.includes(it));

// Thumbnails run in page order (Featured, then grid) so no image repeats
// within 9 consecutive cards.
let nextImage = 0;
for (const it of [...featured, ...rest]) it.image = creativeAt(nextImage++);

const next =
  `${head}export const featuredResources: ResourceItem[] = [\n${featured.map(render).join('\n')}\n];\n\n` +
  `export const resources: ResourceItem[] = [\n${rest.map(render).join('\n')}\n];\n`;

console.log(`${featured.length} featured + ${rest.length} resources from the sheet.`);
if (dry) console.log('--dry: nothing written.');
else { await writeFile(OUT, next); console.log('Wrote src/data/knowledge-hub.ts'); }
