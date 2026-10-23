#!/usr/bin/env node
/**
 * Preview of the CMS-driven events LISTING.
 *
 * `dist/preview/events.html` is the Webflow-paste simulation, and since the
 * listing reads its events from Collection Lists, that file alone shows an
 * empty page. This writes `dist/preview/events-cms.html`: the same page with
 * hidden Collection Lists added at the end of <body>, carrying sample events in
 * exactly the shape Webflow renders them (one `.ct-ev-data` Div per item, fields
 * in data- attributes, thumbnail in an Image with class `ct-f-thumbnail`).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(ROOT, 'dist/preview/events.html');
if (!existsSync(src)) {
  console.warn('[preview-events-listing] dist/preview/events.html missing — skipping.');
  process.exit(0);
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// name, slug, type, country, date (as Webflow may print it), time, location, speakers, popular
const UPCOMING = [
  ['GST 3.0: The Next CFO Agenda for India Enterprises', 'gst-3-0', 'Online', 'India', '2026-10-28', '3:00 PM - IST', 'Online', ['Rohit Jain'], false],
  ['Tax Tech and E-Invoicing Summit Qatar', 'summit-qatar', 'In person', 'Qatar', '2026-10-28', '', 'Doha', [], false],
  ["Spain's Crea Y Crece E-Invoicing: What Applies, What Doesn't", 'crea-y-crece', 'Online', 'Spain', '2026-11-03', '4:00 PM - CET', 'Online', ['Francesco'], true],
  ['The Invoicing Hub: A Conversation with Michael Walther', 'invoicing-hub', 'Online', 'Germany', '2026-11-12', '', 'Online', ['Michael Walther', 'Raoul', 'Aditya'], false],
  ['DFCG', 'dfcg', 'In person', 'France', '2026-11-16', '', 'Paris', [], false],
  ['Peppol Conference APAC 2026', 'peppol-apac', 'In person', 'Singapore', '2026-11-17', '', 'Singapore', [], false],
  ['WFF Paris', 'wff-paris', 'In person', 'France', '2026-11-26', '', 'Paris', ['Jean Pierre'], true],
];
const PAST = [
  ['UAE E-Invoicing: Your ASP Is Not Your Go-Live Plan', 'asp-go-live', 'Online', 'UAE', '2026-10-21', '', 'Online', ['Taha']],
  ['Taxcom Summit & Awards, Oman', 'taxcom-oman', 'In person', 'Oman', '2026-10-07', '', 'Muscat', []],
  ['WFF Madrid', 'wff-madrid', 'In person', 'Spain', '2026-10-08', '', 'Madrid', []],
  ['The warning signs your e-Invoicing project won\'t make it', 'warning-signs', 'Online', 'France', '2026-10-07', '', 'Online', []],
  ['GT Bahrain event', 'gt-bahrain', 'In person', 'Bahrain', '2026-10-15', '', 'Bahrain', []],
  ['Finance Summit', 'finance-summit', 'In person', 'Germany', '2026-09-16', '', 'Dusseldorf', ['Aditya']],
  ['Beyond Malaysia', 'beyond-malaysia', 'In person', 'Malaysia', '2026-09-23', '', 'KL', []],
  ['WFF London', 'wff-london', 'In person', 'UK', '2026-09-03', '', 'London', ['Ayush']],
  ['Why Cleared E-Invoices in UAE Are Not Enough', 'why-cleared', 'Online', 'UAE', '2026-04-30', '', 'Online', ['Abreza Heyra']],
  ['Future of Tax Compliance with AI', 'future-ai', 'Online', 'India', '2026-05-26', '', 'Online', ['Shrenik Shah']],
  ['Your e-Invoicing Go-Live Has 51 New Fields. Are You Covered?', 'fifty-one', 'Online', 'UAE', 'Apr 15, 2026', '', 'Online', ['Ritwika']],
  ['ViDA Explained: What Every Finance Leader Needs to Know', 'vida', 'Online', 'Germany', '2026-04-28', '', 'Online', ['Toby Kington']],
  ['5 France E-Invoicing Realities That Hit After Go-Live', 'five-france', 'Online', 'France', '2026-04-29', '', 'Online', ['Jean Pierre']],
  ['PwC Global Tax Symposium', 'pwc-hk', 'In person', 'Hong Kong', '2026-05-20', '', 'Hong Kong', ['Eeshan', 'Farhan']],
  ['Event with ICAI Oman & MMJS', 'icai-oman', 'In person', 'Oman', '2026-05-18', '', 'Muscat', ['Shemeem']],
];

function item([name, slug, type, country, date, time, location, speakers, popular]) {
  const a = {
    name, slug, type, country, date, 'display-time': time, location,
    'speaker-1-name': speakers[0] || '', 'speaker-2-name': speakers[1] || '', 'speaker-3-name': speakers[2] || '',
  };
  if (popular !== undefined) a.popular = popular ? 'yes' : '';
  const attrs = Object.entries(a).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<div role="listitem" class="w-dyn-item"><div class="ct-ev-data" ${attrs}><img class="ct-f-thumbnail w-dyn-bind-empty" alt=""></div></div>`;
}

const list = (cls, rows) =>
  `<div class="${cls} w-dyn-list"><div role="list" class="w-dyn-items">${rows.map(item).join('')}</div></div>`;

const html = readFileSync(src, 'utf8').replace(
  '</body>',
  `<!-- Sample Collection Lists, as Webflow would render them -->\n${list('ct-ev-upcoming-source', UPCOMING)}\n${list('ct-ev-past-source', PAST)}\n</body>`
);
writeFileSync(join(ROOT, 'dist/preview/events-cms.html'), html, 'utf8');
console.log('[preview-events-listing] wrote dist/preview/events-cms.html');

/* ---- PASTE KIT — numbered in the order they go on the Webflow Events page. */
import { mkdirSync } from 'node:fs';
const KIT = join(ROOT, 'dist/paste/events-listing');
mkdirSync(KIT, { recursive: true });
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const kit = {
  '0-shared-css.html': `<style>\n${rd('dist/css/shared.css')}\n</style>\n`,
  '1-page-css.html': `<style>\n${rd('dist/css/events.css')}\n</style>\n`,
  '2-embed-navbar.html': rd('dist/_embeds/events/navbar.html'),
  '3-embed-hero.html': rd('dist/_embeds/events/hero.html'),
  '4-embed-upcoming.html': rd('dist/_embeds/events/upcoming.html'),
  '5-embed-filters.html': rd('dist/_embeds/events/filters.html'),
  '6-embed-events-grid.html': rd('dist/_embeds/events/events.html'),
  '7-embed-footer.html': rd('dist/_embeds/events/footer.html'),
};
for (const [name, body] of Object.entries(kit)) {
  writeFileSync(join(KIT, name), body, 'utf8');
  console.log(`[preview-events-listing] paste kit: dist/paste/events-listing/${name} (${(Buffer.byteLength(body) / 1024).toFixed(1)} KB)`);
}
