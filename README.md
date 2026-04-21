# Cleartax Webflow — HTML / CSS authoring workspace

Authoring workspace for Cleartax e-invoicing landing pages. Sections are built here as Astro components, compiled to per-section HTML blobs, then pasted into Webflow Embed elements on the page that Retool promotes to production.

Design / architecture rationale lives in `/Users/afiqnuaim/.claude/plans/we-small-startup-just-compressed-stardust.md`.

## Requirements

- Node 20+
- npm 10+

## Install

```bash
npm install
```

## Develop

`npm run dev` builds the Tailwind CSS bundles once (via the `predev` hook), then starts the Astro dev server. Component `<style>` blocks hot-reload as you edit. Re-run `npm run build:css` manually after changing `src/styles/tokens.css` or `tailwind.config.js`.

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| `http://localhost:4321/uae` | full UAE page preview, composes Navbar + HeroUAE |
| `http://localhost:4321/embed/uae/hero-uae` | isolated section preview (what the Webflow paste looks like, with `/css/uae.css` loaded) |
| `http://localhost:4321/embed/_shared/navbar` | isolated shared Navbar preview |

## Build

```bash
npm run build
```

Output lands in `dist/`:

```
dist/
├── css/
│   ├── shared.css     # paste this into EVERY Webflow page's <head>
│   ├── uae.css        # paste into UAE page <head> only
│   └── global.css     # paste into Global Mandate page <head> only
└── _embeds/
    ├── _shared/
    │   └── navbar.html        # paste into an Embed element on every page
    └── uae/
        └── hero-uae.html      # paste into the UAE page Hero Embed

Final assembled pages for preview:
└── preview/
    └── uae.html               # Open this in a browser to preview all embeds work together
```

`dist/_embeds/**/*.html` is guaranteed to contain no `<html>`, `<head>`, `<body>`, or `<!doctype>` — the build fails if any slips through.

## Paste into Webflow

Per page, one-time:

1. Open the Webflow page in Designer.
2. Page settings → **Inside `<head>` tag** — paste:
   ```html
   <style>PASTE dist/css/shared.css HERE</style>
   <style>PASTE dist/css/<page>.css HERE</style>
   ```
   Google Fonts link + any GSAP / Motion.dev CDN scripts also go here.

Per section, every time it changes:

1. Add an **Embed** element on the page where the section should render.
2. Paste the contents of `dist/_embeds/<page>/<section>.html` into the Embed element.
3. Save → Publish to staging → Cleartax reviews → Retool promotes.

If a single Embed element exceeds Webflow's size limit, split the section into two Embeds or move the inlined `<style>` block into the page's `<head>` custom code.

## Authoring rules

- **One `.astro` file per section.** Section files live at `src/sections/_shared/*.astro` (cross-page) or `src/sections/<page>/*.astro` (page-specific).
- **Every section's `<style>` block uses `<style is:global>`.** No Astro scope hashes in the output. Class-name uniqueness across sections sharing a page is the author's responsibility. Going forward all new styling is Tailwind `tw:`-prefixed utilities, which self-isolate.
- **Shared design tokens live in `src/styles/tokens.css`** and are mirrored into `tailwind.config.js` `theme.extend`. Update both when adding a new token.
- **Tailwind v4 utilities are prefixed `tw:`** (e.g. `tw:p-4`, `tw:text-hero`) and the Tailwind preflight reset is excluded by importing only `tailwindcss/utilities.css`, so Webflow's own base styles survive.
- **Theme tokens live in `src/styles/tokens.css`** inside an `@theme { ... }` block — v4 turns each `--color-*` / `--text-*` into a utility automatically. Plain `:root` vars in the same file are for hand-written CSS that references them. `tailwind.config.js` is kept (loaded via `@config` directive) for backwards-compat.
- **Page-scoped JS lives at `src/scripts/<page>-<section>.js`.** Animation libraries (GSAP, Motion.dev) load via CDN from the Webflow page's `<head>`, not bundled here.
- **Prefer logical properties** (`margin-inline-start`, `tw:ps-*`) for anything that might render in Arabic (RTL). Tailwind v4 ships logical-property utilities natively — no plugin needed.

## Adding a new section

1. Create `src/sections/<page>/<Section>.astro` with markup + `<style>` block.
2. Add it to `src/pages/<page>.astro` for preview.
3. `npm run build`.
4. Paste `dist/_embeds/<page>/<section-kebab>.html` into the Webflow Embed element.

The `embed-build/[page]/[section].astro` route picks up new sections automatically via `import.meta.glob` — no registry updates needed. `dist/embed-build/` is a build-only staging dir and is deleted by `extract-embeds`; the paste artifact is always `dist/_embeds/`.

## Adding a new page

1. Create `src/pages/<page>.astro`.
2. Create `src/sections/<page>/` folder with section components.
3. Create `src/styles/<page>.css`:
   ```css
   @import 'tailwindcss/utilities.css' layer(utilities) prefix(tw) source(none);
   @source '../sections/<page>/**/*.astro';
   @source '../pages/<page>.astro';
   @config '../../tailwind.config.js';
   ```
4. Add a target to `scripts/build-css.mjs` `TARGETS` array:
   ```js
   { name: '<page>', input: 'src/styles/<page>.css' }
   ```
5. `npm run build`.

## Brand fonts (Nohemi, Gilroy)

Webflow Site Settings → Fonts already holds both families; Webflow injects the `@font-face` rules inside its own linked `shared.webflow.<hash>.css` (not in `<head>`), so embeds pasted into Webflow pages render correctly via cascade — no extra CSS needed in the Webflow `<head>` paste.

For `npm run dev` and `dist/preview/*.html` the fonts are self-hosted:

- Files live in `public/fonts/nohemi/*.woff2` and `public/fonts/gilroy/*.otf` (4 weights each: 400/500/600/700).
- `@font-face` rules live in `src/styles/fonts.css`, built to `public/css/fonts.css` via `scripts/build-css.mjs`.
- Pages link `/css/fonts.css` above `/css/shared.css`, wrapped in a banner comment reading "PREVIEW-ONLY — DO NOT PASTE INTO WEBFLOW".
- `fonts.css` is **not** imported into `shared.css`, so the `@font-face` block never leaks into the CSS blob pasted into Webflow. `scripts/extract-embeds.mjs` already drops bundled CSS, so `dist/_embeds/*.html` also stays clean.
- `scripts/assemble-confirmations.mjs` emits a visible warning banner above the inlined `fonts.css` `<style>` block in `dist/preview/*.html`.

## Things we need from Cleartax before production

- Lead-API endpoint + payload schema + env URLs (current code posts to `https://www.cleartax.com/f/common-lead/lead/`).
- reCAPTCHA site key per environment (current hardcoded key: `6Lc5ZG0m...`).
- Gilroy web-font license (Adobe Fonts / Fontspring / self-hosted files).
- Webflow staging URL per page + edit access window.

## Reference files (original hand-written pages)

Kept until every section is ported:

- `uae-landing-page/index.html` — UAE full page, 9 sections
- `global-e-invoicing-mandate-page/index.html` — Global mandate page, ~8 sections
- `thankyou-page/thank-you-embed.html` — thank-you embed
- `root.css` — superseded by `src/styles/tokens.css`
