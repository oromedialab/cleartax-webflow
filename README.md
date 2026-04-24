# Cleartax Webflow — HTML / CSS authoring workspace

Authoring workspace for Cleartax e-invoicing landing pages. Sections built here as Astro components, compiled to per-section HTML blobs, then pasted into Webflow Embed elements on the page Retool promotes to production.

Design / architecture rationale: `/Users/afiqnuaim/.claude/plans/we-small-startup-just-compressed-stardust.md`.

## Requirements

- Node 20+
- npm 10+

## Install

```bash
npm install
```

## Develop

`npm run dev` builds Tailwind CSS bundles once (via `predev` hook), then starts Astro dev server. Component `<style>` blocks hot-reload on edit. Re-run `npm run build:css` after changing `src/styles/tokens.css` or `tailwind.config.js`.

```bash
npm run dev          # builds all page bundles, watches all
npm run dev:uae      # watches shared + fonts + uae only
npm run dev:global   # watches shared + fonts + global only
```

| URL | Purpose |
|-----|---------|
| `http://localhost:4321/uae` | full UAE page preview |
| `http://localhost:4321/global-mandate` | full Global Mandate preview |
| `http://localhost:4321/thankyou` | thank-you page preview |
| `http://localhost:4321/embed/uae/hero-uae` | isolated section preview (mirrors Webflow paste, with `/css/uae.css` loaded) |
| `http://localhost:4321/embed/_shared/navbar` | isolated shared section preview |

## Build

```bash
npm run build
```

Pipeline: `build:css` → `astro build` → `extract-embeds.mjs` → `assemble-confirmations.mjs`.

Output:

```
dist/
├── css/
│   ├── shared.css           # paste into EVERY Webflow page <head>
│   ├── fonts.css            # PREVIEW-ONLY, never paste into Webflow
│   ├── uae.css              # paste into UAE page <head>
│   └── global.css           # paste into Global Mandate page <head>
├── _embeds/
│   ├── _shared/             # navbar, footer, contact-form
│   ├── uae/                 # hero-uae, logos-strip, platform, why-cleartax, security, case-studies, faq, faqv2
│   └── global/              # hero-global, navbar-global, logos-strip-global, trusted-leaders, scale-stats, seamless-integration, enterprise-security, uspdark, contact-global
└── preview/
    ├── uae.html
    ├── global-mandate.html
    └── thankyou.html        # open in browser to preview assembled embeds
```

`dist/_embeds/**/*.html` is guaranteed free of `<html>`, `<head>`, `<body>`, `<!doctype>`, and Astro scope markers — build fails if any slip through.

## Paste into Webflow

Per page, one-time:

1. Open Webflow page in Designer.
2. Page settings → **Inside `<head>` tag** — paste:
   ```html
   <style>PASTE dist/css/shared.css HERE</style>
   <style>PASTE dist/css/<page>.css HERE</style>
   ```
   Google Fonts link + GSAP / Motion.dev CDN scripts also go here. **Never** paste `dist/css/fonts.css` — Webflow injects Nohemi + Gilroy itself via Project Settings → Fonts.

Per section, every change:

1. Add an **Embed** element on the page.
2. Paste contents of `dist/_embeds/<page>/<section>.html` into Embed.
3. Save → Publish to staging → Cleartax reviews → Retool promotes.

If an Embed exceeds Webflow's size limit, split section into two Embeds or move the inlined `<style>` block into the page's `<head>` custom code.

## Authoring rules

- **One `.astro` file per section.** Lives at `src/sections/_shared/*.astro` (cross-page) or `src/sections/<folder>/*.astro` (page-specific). Folder names are `uae`, `global` (not `global-mandate`).
- **Every section's `<style>` block uses `<style is:global>`.** No Astro scope hashes in output. Class-name uniqueness across sections sharing a page is the author's responsibility.
- **Tailwind v4 utilities are emitted bare** (no `tw:` prefix). Each page CSS imports `tailwindcss/utilities.css ... source(none)` and scopes via `@source` to its own sections. Preflight reset is omitted (no `tailwindcss/preflight` import) so Webflow's base styles survive; a minimal reset lives in `shared.css` `@layer base`. Avoid hand-naming Webflow classes after Tailwind utilities (`flex`, `grid`, `container`, `w-*`, `p-*`, `text-*`, …).
- **Design tokens live in `src/styles/tokens.css` `:root`** as plain CSS vars. Tailwind v4's `@theme` was avoided — v4 tree-shakes `@theme` tokens that no utility references, which broke colors. `tailwind.config.js` is kept (loaded via `@config`) for future plugin / preset use; `theme.extend` is currently empty.
- **Animation libraries (GSAP, Motion.dev) load via CDN** from the Webflow page's `<head>`, not bundled here. No JS bundling step exists — page-scoped JS goes inside section `<script>` tags or the Webflow page head.
- **Prefer logical properties** (`margin-inline-start`, `ps-*`) for anything rendering in Arabic (RTL). Tailwind v4 ships logical-property utilities natively.

## Portability (future Next.js / React migration)

Sections are authored in `.astro` but the long-term plan is to move off Webflow onto Next.js (or similar React stack). Keep sections framework-agnostic so the port is a mechanical rewrite, not a redesign:

- **Treat `.astro` as "HTML + props", not a framework.** Frontmatter limited to typed `interface Props` + trivial destructuring. No `Astro.glob`, no content collections, no `Astro.request` / `Astro.cookies` / `Astro.redirect`, no middleware.
- **No Astro-only template syntax in section files.** Avoid `set:html`, `set:text`, named `<slot />`, `<Fragment>`, `client:*` directives. Use plain JSX-compatible markup: `{expr}`, `.map()`, ternaries.
- **Use `class`, not Astro-specific attr tricks.** Port to `className` later is a single find/replace. Camel-case event handlers aren't used here (no interactivity via Astro) — keep it that way.
- **Interactivity lives in vanilla `<script>` blocks** inside the section, operating on DOM via `querySelector` / `addEventListener`. Port target: drop into `useEffect`. Do **not** adopt Astro islands (`client:load` etc.) — they don't translate.
- **Styles stay in `<style is:global>` + Tailwind utilities.** Both port cleanly — `<style is:global>` → `globals.css` import, Tailwind classes 1:1. Avoid `<style>` without `is:global` (scope hashes) and avoid CSS-in-JS patterns.
- **No Astro-specific imports in sections.** No `astro:assets` `<Image>`, no `astro:content`, no `astro:transitions`. Use plain `<img>` with `/public`-relative paths; swap to `next/image` at migration time.
- **Props are serializable and typed.** Plain strings, numbers, arrays, objects. No functions-as-props, no class instances. Same `interface Props` works as React component props.
- **Keep section files self-contained.** One `.astro` = one future `.tsx`. No cross-section imports of partials that only make sense in Astro.

Migration later becomes: rename `.astro` → `.tsx`, replace frontmatter with `export default function Section(props: Props)`, `class` → `className`, `<script>` body → `useEffect`, done.

## Adding a new section

1. Create `src/sections/<folder>/<Section>.astro` with markup + `<style is:global>` block.
2. Import + render it in `src/pages/<page>.astro`.
3. `npm run build`.
4. Paste `dist/_embeds/<folder>/<section-kebab>.html` into the Webflow Embed element.

The `embed-build/[page]/[section].astro` route picks up new sections automatically via `import.meta.glob` — no registry updates needed. `dist/embed-build/` is a build-only staging dir, deleted by `extract-embeds`; the paste artifact is always `dist/_embeds/`.

## Adding a new page

1. Create `src/pages/<page>.astro`.
2. Create `src/sections/<folder>/` with section components.
3. Create `src/styles/<page>.css`:
   ```css
   @layer theme, base, utilities;

   @import 'tailwindcss/theme.css' layer(theme);
   @import 'tailwindcss/utilities.css' layer(utilities) source(none);

   @source '../sections/<folder>/**/*.astro';
   @source '../pages/<page>.astro';

   @config '../../tailwind.config.js';
   ```
4. Add target to `scripts/build-css.mjs` `TARGETS`:
   ```js
   { name: '<page>', input: 'src/styles/<page>.css' }
   ```
5. Add a focused dev script to `package.json` `scripts` so the watcher only rebuilds shared + fonts + this page:
   ```json
   "dev:<page>": "PAGE=<page> npm run dev"
   ```
6. `npm run build`.

## Brand fonts (Nohemi, Gilroy)

Webflow Site Settings → Fonts holds both families; Webflow injects `@font-face` rules inside its own linked `shared.webflow.<hash>.css`, so embeds pasted into Webflow render via cascade — no extra CSS needed in Webflow `<head>`.

For `npm run dev` and `dist/preview/*.html` fonts are self-hosted:

- Files: `public/fonts/nohemi/*.woff2`, `public/fonts/gilroy/*.otf` (4 weights each: 400/500/600/700).
- `@font-face` rules: `src/styles/fonts.css` → built to `public/css/fonts.css` via `scripts/build-css.mjs`.
- Pages link `/css/fonts.css` above `/css/shared.css`; `assemble-confirmations.mjs` inlines it inside a "PREVIEW-ONLY — DO NOT PASTE INTO WEBFLOW" banner in `dist/preview/*.html`.
- `fonts.css` is **not** imported into `shared.css`, so the `@font-face` block never leaks into the CSS blob pasted into Webflow.

## Outstanding from Cleartax before production

- Lead-API endpoint + payload schema + env URLs (current code posts to `https://www.cleartax.com/f/common-lead/lead/`).
- reCAPTCHA site key per environment (current hardcoded: `6Lc5ZG0m...`).
- Gilroy web-font license (Adobe Fonts / Fontspring / self-hosted).
- Webflow staging URL per page + edit access window.

## Reference files (original hand-written pages)

Kept in `archive/` until every section is ported:

- `archive/uae-landing-page/index.html` — UAE full page, 9 sections
- `archive/global-e-invoicing-mandate-page/index.html` — Global mandate, ~8 sections
- `archive/thankyou-page/thank-you-embed.html` — thank-you embed
- `root.css` — superseded by `src/styles/tokens.css`
