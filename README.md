# Cleartax Webflow — HTML / CSS authoring workspace

Authoring workspace for Cleartax e-invoicing landing pages. Sections built here as Astro components, compiled to per-section HTML blobs, then pasted into Webflow Embed elements on the page Retool promotes to production.

Brand system and design rules: [docs/brand/](docs/brand/README.md). Build mechanics: [docs/build-pipeline.md](docs/build-pipeline.md).

## Requirements

- Node 20+
- npm 10+

## Install

```bash
npm install
```

## Develop

```bash
npm run build:css                                  # build all CSS bundles once
npm run build:css -- --watch                       # rebuild every bundle on change
npm run build:css -- --watch --page=<name>         # watch only shared + fonts + this page
npm run dev                                        # start Astro dev server (run in a second terminal)
```

Component `<style>` blocks hot-reload via the Astro dev server. CSS bundles do NOT auto-rebuild from `npm run dev` alone — run `build:css` (one-shot or `--watch`) alongside.

After changing `src/styles/tokens.css`, `src/styles/shared.css`, or `tailwind.config.js`, rerun `build:css`.

| URL | Purpose |
|-----|---------|
| `http://localhost:4321/` | **dev index** — every page and section, auto-listed. Start here. |
| `http://localhost:4321/<page>` | full page preview — one route per `src/pages/*.astro` |
| `http://localhost:4321/brand-test` | **brand v2 token specimen + parity test** (see below) |
| `http://localhost:4321/test` | cascade test page (utilities vs fake-Webflow defaults) |
| `http://localhost:4321/embed-build/<page>/<section>` | one section's raw markup, **unstyled** — the route exists to generate embeds, not to preview them |
| `http://localhost:4321/embed-build/_shared/navbar` | isolated shared section preview |

**Naming:** every page still on brand v1 carries a `v1-` prefix across all three of its files — `src/pages/v1-<page>.astro`, `src/sections/v1-<page>/`, `src/styles/v1-<page>.css` — so legacy sorts together and deleting it is one `git rm` per page with no rename of the survivor. A rebranded page takes the clean name from day one.

The index groups pages into Brand v2, Reference & test, and Brand v1 — classifying by whether the page still imports `fonts.css` (the self-hosted Nohemi/Gilroy bundle), so it stays accurate without a hand-maintained list. `src/pages/index.astro` is skipped by `assemble-confirmations.mjs` — it is a dev nav page, not a Webflow page.

Current pages: `global-invoicing` (brand v2) · `brand-test`, `test`, `thankyou`, `pipeline` (utility) · and 18 `v1-*` pages still on brand v1.

The `embed-build` route carries no CSS by design — it exists so `extract-embeds.mjs` can lift each section's body HTML, and it renders unstyled in the browser. It previously imported every page's bundle, which meant a section could look correct there while being broken on its own page. **Verify with `dist/preview/<page>.html`**, which is the accurate mirror of the Webflow paste.

`brand-test` is the parity check: `localhost:4321/brand-test` and `dist/preview/brand-test.html` must render identically. It exercises every token through both the Tailwind-utility route and the hand-written `var()` route, so a divergence means the pipeline is dropping something.

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
│   ├── fonts.css            # PREVIEW-ONLY (brand v1 faces), never paste into Webflow
│   ├── <page>.css           # paste into that page's <head>
│   └── <page>-1.css/-2.css  # if the bundle exceeded 49 KB — paste both, in order
├── _embeds/
│   ├── _shared/             # navbar, footer, contact-form, logostrip, …
│   └── <page>/              # one .html per section (plus -1/-2 parts if split)
└── preview/
    └── <page>.html          # open in browser to preview assembled embeds
```

One `dist/preview/<page>.html` and one `dist/_embeds/<page>/` per page. Bundles and embeds over 49 KB are auto-split — keeping them under it is worth real effort, since a split means the user pastes twice on every change.

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
- **Tailwind first. A custom class is a decision to go global.** Anything page- or section-specific is written as Tailwind utilities — that is what Tailwind is for. Only write a custom class when the thing is genuinely reusable across sections, and then it belongs in `shared.css` once, not copy-pasted into each section's `<style>`.

  Section `<style is:global>` is unscoped by design, and every section on a page shares one namespace, so two sections defining `.card` fight — the embed pasted later wins, and a section's appearance starts depending on where it sits on the page. Astro also bundles a section's global CSS into **every page that imports that section**, so a "local" tweak is not local.

  This is already visible in v1: on `erp-connectivity`, six of eight sections each carry an identical `.gradient-text` rule, and five redefine `.premium-reveal` / `.is-visible` which already exist in `shared.css`. Repo-wide there are 10 real same-page collisions (50 class names are defined by two or more sections in the same folder, but 40 of those are `Footer` vs `FooterUAE`, which never appear on the same page). Don't add to it; if you must hand-name a class, prefix it per section (`.erp-grid-card`, not `.card`).
- **Every section's `<style>` block uses `<style is:global>`.** No Astro scope hashes in output. Class-name uniqueness across sections sharing a page is the author's responsibility.
- **Tailwind v4 utilities are emitted bare** (no `tw:` prefix) and **unlayered** so they beat Webflow's element defaults in the cascade. Each page CSS imports `tailwindcss/utilities.css ... source(none)` and scopes via `@source` to its own sections + (auto-injected) the `_shared` components the page imports. Preflight reset is omitted (no `tailwindcss/preflight` import) so Webflow's base styles survive; a minimal reset lives in `shared.css` at top-level (no `@layer` wrapping). Avoid hand-naming Webflow classes after Tailwind utilities (`flex`, `grid`, `container`, `w-*`, `p-*`, `text-*`, …).
- **Design tokens live in `src/styles/tokens.css` `:root`** as plain CSS vars (`--palette-*` raw values, `--color-*` aliases). A plain `:root` block is never tree-shaken. `src/styles/theme.css` then maps the same names through `@theme inline` to generate utilities (`bg-vault-navy`, `font-heading`) without emitting `:root` vars of its own — a plain `@theme` block purges tokens no utility references, which previously broke `var(--color-…)` lookups in hand-written CSS. Adding a token means editing **both** files. `tailwind.config.js` is kept (loaded via `@config`) for the `xl2` breakpoint and future plugin/preset use.
- **Page width is the `container` utility.** Defined once via `@utility container` in `src/styles/theme.css` (max-width `--container-max`, 1328px, from `xl2`). Never hand-roll a wrapper class and never use `max-w-[…]` for page width — change the width in one place and every page moves.
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

## Docs

- [docs/build-pipeline.md](docs/build-pipeline.md) — full data flow: how `.astro` + Tailwind sources become per-section HTML embeds + per-page CSS bundles.
- [docs/adding-a-new-page.md](docs/adding-a-new-page.md) — end-to-end walkthrough for scaffolding a new page.
- [docs/responsive-no-overlap-rule.md](docs/responsive-no-overlap-rule.md) — cascade strategy background (historical; the rule itself is no longer load-bearing).
- [docs/brand/](docs/brand/README.md) — brand v2 source of truth: colour, typography, spacing, layout grid, accessibility, logo, open questions.
- [CLAUDE.md](CLAUDE.md) — condensed rules auto-loaded by AI agents working in this repo.

## Adding a new page

See [docs/adding-a-new-page.md](docs/adding-a-new-page.md) for the end-to-end walkthrough — page file, section components, CSS bundle structure, and build wiring.

Short version: create `src/pages/<page>.astro` (importing `shared.css` + your `<page>.css` + each section), create `src/sections/<page>/*.astro` for page-specific sections, create `src/styles/<page>.css` (no `@layer theme, base, utilities;` declaration — see the doc), and add `{ name: '<page>', input: 'src/styles/<page>.css', page: 'src/pages/<page>.astro' }` to `PAGE_TARGETS` in [scripts/css-entries.mjs](scripts/css-entries.mjs). That is the only wiring step.

The build auto-injects `@source` directives for the `_shared` components your page imports, plus `@import '../theme.css'`. **Never hand-list `_shared` sources in the CSS entry**, and never the `@source '../sections/_shared/**/*.astro'` wildcard — it compiles all 12 shared components into the page and costs 5–12 KB against Webflow's 50 KB paste cap.

## Brand fonts

**Brand v2 — Inter Tight (headings) + Google Sans (body).** Both are on Google Fonts under SIL OFL 1.1, so there is nothing to licence, buy or renew. Load them with one tag in the page head, identical in dev preview and in the Webflow page head:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..700&family=Google+Sans:opsz,wght@17..18,400..700&display=swap" rel="stylesheet">
```

Note "Google Sans Text" does not exist on Google Fonts — the small-size reading cut is the `opsz` axis, handled by `font-optical-sizing: auto` on `body` in `shared.css`. Full type spec: [docs/brand/typography.md](docs/brand/typography.md).

### Brand v1 (Nohemi, Gilroy) — legacy pages only

Webflow Site Settings → Fonts holds both families; Webflow injects `@font-face` rules inside its own linked `shared.webflow.<hash>.css`, so v1 embeds pasted into Webflow render via cascade — no extra CSS needed in Webflow `<head>`.

For `npm run dev` and `dist/preview/*.html` these are self-hosted. **v2 pages must not import `fonts.css`.** Delete it once no v1 page remains.

- Files: `public/fonts/nohemi/*.woff2`, `public/fonts/gilroy/*.otf` (4 weights each: 400/500/600/700).
- `@font-face` rules: `src/styles/fonts.css` → built to `public/css/fonts.css` via `scripts/build-css.mjs`.
- Pages link `/css/fonts.css` above `/css/shared.css`; `assemble-confirmations.mjs` inlines it inside a "PREVIEW-ONLY — DO NOT PASTE INTO WEBFLOW" banner in `dist/preview/*.html`.
- `fonts.css` is **not** imported into `shared.css`, so the `@font-face` block never leaks into the CSS blob pasted into Webflow.

## Outstanding from Cleartax before production

- Lead-API endpoint + payload schema + env URLs (current code posts to `https://www.cleartax.com/f/common-lead/lead/`).
- reCAPTCHA site key per environment (current hardcoded: `6Lc5ZG0m...`).
- Webflow staging URL per page + edit access window.

## Reference files (original hand-written pages)

Kept in `archive/` until every section is ported:

- `archive/uae-landing-page/index.html` — UAE full page, 9 sections
- `archive/global-e-invoicing-mandate-page/index.html` — Global mandate, ~8 sections
- `archive/thankyou-page/thank-you-embed.html` — thank-you embed
- `root.css` — superseded by `src/styles/tokens.css`
