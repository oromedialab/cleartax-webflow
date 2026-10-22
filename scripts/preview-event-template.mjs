#!/usr/bin/env node
/**
 * Previews the Webflow CMS TEMPLATE for events — the paste unit, not the
 * static `events/[slug].astro` page.
 *
 * `dist/preview/event-detail.html` is rendered from `src/data/events.ts`, so
 * its speakers, dates and links are fixed sample data. The file pasted into
 * Webflow is `dist/_embeds/event-detail/template.html`, whose `[[ Field ]]`
 * placeholders Webflow replaces from a CMS item. This script does what Webflow
 * does — substitutes each placeholder with a value — and wraps the result in
 * the same hidden helper elements the Webflow page carries, so the embed's own
 * script runs against realistic markup.
 *
 * Writes one file per state, because the states change the DOM:
 *   dist/preview/event-template-upcoming.html   online, 3 speakers, register live
 *   dist/preview/event-template-past.html       online, 1 speaker, Demio recording
 *   dist/preview/event-template-in-person.html  in person, 2 speakers, no photo
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EMBEDS = join(ROOT, 'dist/_embeds');
const CSS = join(ROOT, 'dist/css');
const OUT = join(ROOT, 'dist/preview');

const need = ['event-detail/template.html', 'event-detail/related-card.html', 'events/navbar.html', 'events/footer.html'];
for (const f of need) {
  if (!existsSync(join(EMBEDS, f))) {
    console.warn(`[preview-event-template] ${f} missing — run extract-embeds first. Skipping.`);
    process.exit(0);
  }
}

const read = (p) => readFileSync(p, 'utf8');
const template = read(join(EMBEDS, 'event-detail/template.html'));
const card = read(join(EMBEDS, 'event-detail/related-card.html'));
const navbar = read(join(EMBEDS, 'events/navbar.html'));
const footer = read(join(EMBEDS, 'events/footer.html'));
const css = `${read(join(CSS, 'shared.css'))}\n${read(join(CSS, 'event-detail.css'))}`;

/* What "+ Add Field" would insert. Anything not listed is an empty CMS field,
   which is exactly how Webflow renders it. */
const SPEAKERS = [
  {
    Name: 'Ritwika Pal',
    Role: 'Tax Expert, Clear',
    Bio: 'Leads tax advisory for UAE enterprises, helping finance teams get e-invoicing mandate-ready before go-live.',
    LinkedIn: 'https://www.linkedin.com/company/cleartax',
  },
  {
    Name: 'Shrenik Shah',
    Role: 'Head of Compliance Advisory, Clear',
    Bio: 'Has taken more than two hundred enterprises through a first e-invoicing go-live.',
    LinkedIn: 'https://www.linkedin.com/company/cleartax',
  },
  {
    Name: 'Surbhi Punshi',
    Role: 'Chartered Accountant',
    Bio: 'A Chartered Accountant with a stronghold in direct and indirect taxes, covering GST and e-way bill advisory.',
    LinkedIn: 'https://www.linkedin.com/company/cleartax',
  },
];

const THUMB = 'https://cdn.prod.website-files.com/69fda2cd307dcc6cf810e935/6ab246685e37e413aa90378a_play-button.png';

const STATES = [
  {
    file: 'event-template-upcoming',
    upcoming: true,
    item: {
      Name: 'Your e-Invoicing Go-Live Has 51 New Fields. Are You Covered?',
      Type: 'Webinar',
      Date: 'April 15, 2026',
      'Display Time': '2:00 PM - IST',
      Location: 'Online',
      Thumbnail: '',
      'Registration Link': 'https://www.cleartax.com/ae/e-invoicing-uae',
      'Recording Link': '',
    },
    speakers: 3,
    photos: false,
  },
  {
    file: 'event-template-past',
    upcoming: false,
    item: {
      Name: 'Why Cleared E-Invoices in UAE Are Not Enough',
      Type: 'Webinar',
      Date: 'February 4, 2026',
      'Display Time': '3:00 PM - GST',
      Location: 'Online',
      Thumbnail: '',
      'Registration Link': 'https://www.cleartax.com/ae/e-invoicing-uae',
      'Recording Link': 'https://event.demio.com/recording/example',
    },
    speakers: 1,
    photos: false,
  },
  {
    file: 'event-template-in-person',
    upcoming: true,
    item: {
      Name: 'Dubai CFO Roundtable: Readiness for 2027',
      Type: 'Conference',
      Date: 'November 12, 2026',
      'Display Time': '10:00 AM - GST',
      Location: 'Dubai',
      Thumbnail: '',
      'Registration Link': 'https://www.cleartax.com/ae/e-invoicing-uae',
      'Recording Link': '',
    },
    speakers: 2,
    photos: false,
  },
];

const RELATED = [
  { Slug: 'vida-explained', Name: 'ViDA Explained: What Every Finance Leader Must Know', Type: 'Webinar', Date: 'May 6, 2026', 'Display Time': '2:00 PM - CET', speaker: 'Surbhi Punshi, Chartered Accountant' },
  { Slug: 'dubai-roundtable', Name: 'Dubai CFO Roundtable: Readiness for 2027', Type: 'Conference', Date: 'November 12, 2026', 'Display Time': '10:00 AM - GST', speaker: 'Shrenik Shah, Head of Compliance Advisory' },
  { Slug: 'malaysia-2026', Name: 'Malaysia E-Invoicing 2026: What Enterprises Need', Type: 'Webinar', Date: 'June 18, 2026', 'Display Time': '11:00 AM - MYT', speaker: '' },
];

function fill(html, values) {
  return html.replace(/\[\[ ([^\]]+?) \]\]/g, (_, key) => (key in values ? values[key] : ''));
}

function itemValues(state) {
  const values = { ...state.item };
  SPEAKERS.forEach((s, i) => {
    const n = i + 1;
    const on = i < state.speakers;
    values[`Speaker ${n} Name`] = on ? s.Name : '';
    values[`Speaker ${n} Role`] = on ? s.Role : '';
    values[`Speaker ${n} Bio`] = on ? s.Bio : '';
    values[`Speaker ${n} Photo`] = on && state.photos ? THUMB : '';
    values[`Speaker ${n} LinkedIn`] = on ? s.LinkedIn : '';
  });
  return values;
}

mkdirSync(OUT, { recursive: true });

for (const state of STATES) {
  const cards = RELATED.map((r) =>
    `<div role="listitem" class="w-dyn-item"><div class="w-embed">${fill(card, {
      Slug: r.Slug,
      Name: r.Name,
      Type: r.Type,
      Date: r.Date,
      'Display Time': r['Display Time'],
      'Speaker 1 Name': r.speaker.split(', ')[0] ?? '',
      'Speaker 1 Role': r.speaker.split(', ').slice(1).join(', '),
      Thumbnail: '',
    })}</div></div>`
  ).join('\n');

  // Webflow keeps a conditionally-hidden element in the DOM with this class.
  const flag = state.upcoming ? 'ct-event-upcoming' : 'ct-event-upcoming w-condition-invisible';

  const html = `<!DOCTYPE html>
<html>
<head>
  <!-- PREVIEW of the Webflow CMS template with sample CMS values (${state.file}).
       Built from dist/_embeds/event-detail/*.html by scripts/preview-event-template.mjs. -->
  <script>document.documentElement.setAttribute('lang', 'en');</script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${state.item.Name} — template preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..700&family=Google+Sans:opsz,wght@17..18,400..700&display=swap" rel="stylesheet" />
  <style>
${css}
  </style>
</head>
<body style="background-color:#fff">
<div class="w-embed">${navbar}</div>
<div class="w-embed">${fill(template, itemValues(state))}</div>
<div class="${flag}"></div>
<div class="ct-event-description w-richtext"><p>Fifty-one is the number of fields a typical ERP is not yet emitting correctly for UAE e-invoicing, and most of them fail validation silently rather than loudly.</p><h2>Things we will discuss</h2><ul><li>The 51-field list, and which ones fail validation silently</li><li>Master data sources for the fields an ERP does not natively carry</li><li>A pre-go-live checklist built around this specific field set</li></ul></div>
<div class="ct-event-related-source w-dyn-list"><div role="list" class="w-dyn-items">
${cards}
</div></div>
<div class="w-embed">${footer}</div>
</body>
</html>`;

  writeFileSync(join(OUT, `${state.file}.html`), html, 'utf8');
  console.log(`[preview-event-template] wrote dist/preview/${state.file}.html`);
}

/* ---- PASTE KIT -----------------------------------------------------------
   The same files, numbered in the order they go into the Webflow Events
   Template page, with the CSS already wrapped in <style> so nothing has to be
   assembled by hand. These — not the previews above — are what gets pasted. */
const KIT = join(ROOT, 'dist/paste/event-template');
mkdirSync(KIT, { recursive: true });
const kit = {
  /* Two separate files, pasted separately: shared.css carries the design tokens
     (--palette-*, --spacing-*, --fs-*) and must load FIRST; without it every
     var() in the page CSS is undefined and the page renders unstyled. */
  '0-shared-css.html': `<style>\n${read(join(CSS, 'shared.css'))}\n</style>\n`,
  '1-page-css.html': `<style>\n${read(join(CSS, 'event-detail.css'))}\n</style>\n`,
  '2-embed-navbar.html': navbar,
  '3-embed-event-template.html': template,
  '4-embed-related-card.html': card,
  '5-embed-footer.html': footer,
};
for (const [name, body] of Object.entries(kit)) {
  writeFileSync(join(KIT, name), body, 'utf8');
  const kb = (Buffer.byteLength(body) / 1024).toFixed(1);
  console.log(`[preview-event-template] paste kit: dist/paste/event-template/${name} (${kb} KB)`);
}
