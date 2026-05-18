# Adding a new page

This walk-through shows how to scaffold a new landing page end-to-end: page file, section components, CSS bundle, and build wiring. The build pipeline auto-discovers most things, so the manual surface is small.

## File layout overview

Every page follows the same four-part shape:

```
src/
├── pages/<page>.astro                ← the page (imports CSS + sections, renders them)
├── sections/<page>/                  ← page-specific section components (one .astro per section)
│   ├── Hero.astro
│   ├── Features.astro
│   └── …
├── sections/_shared/                 ← cross-page sections (Navbar, Footer, ContactForm, …)
└── styles/<page>.css                 ← the page's Tailwind entry bundle
```

Plus one wiring step in [scripts/build-css.mjs](../scripts/build-css.mjs).

## Step 1 — Create the page file

`src/pages/<page>.astro`:

```astro
---
import '../styles/fonts.css';
import '../styles/shared.css';
import '../styles/<page>.css';

import NavbarGlobalV2 from '../sections/_shared/NavbarGlobalV2.astro';
import Footer from '../sections/_shared/Footer.astro';
import Hero from '../sections/<page>/Hero.astro';
import Features from '../sections/<page>/Features.astro';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cleartax — <Page Title></title>
  </head>
  <body>
    <NavbarGlobalV2 />
    <Hero />
    <Features />
    <Footer />
  </body>
</html>
```

**Frontmatter rules that the build pipeline relies on:**

- CSS imports use the form `import '../styles/<name>.css'` — `scripts/assemble-confirmations.mjs` finds these to inline `<style>` blocks in the preview HTML.
- Section imports use the form `import <Capitalized> from '../sections/<folder>/<File>.astro'` — `scripts/build-css.mjs` parses these to auto-inject `@source` directives, and `scripts/assemble-confirmations.mjs` parses them to locate extracted embeds.

If you deviate from these import shapes, the auto-discovery won't pick them up.

## Step 2 — Create section components

`src/sections/<page>/<Section>.astro`:

```astro
---
// trivial typed props if needed
interface Props { … }
---

<section class="lg:py-16 max-lg:py-8 …">
  <!-- markup, Tailwind utilities -->
</section>

<style is:global>
  /* section-scoped CSS that can't be expressed as utilities.
     `is:global` so no Astro scope hashes leak into the embed paste. */
</style>

<script is:inline>
  /* vanilla JS, runs on page load */
</script>
```

Authoring rules in [README.md](../README.md) (`Authoring rules` section) apply. The `embed-build/[page]/[section].astro` dynamic route picks up new section files via `import.meta.glob` — no registry update needed.

## Step 3 — Create the CSS entry

`src/styles/<page>.css`:

```css
/**
 * <Page name> CSS — paste into the <Page name> Webflow page's <head> AFTER shared.css.
 * Emits Tailwind utilities for src/sections/<page>/** + the _shared components
 * src/pages/<page>.astro imports (auto-injected by scripts/build-css.mjs).
 */
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' source(none);

@source '../pages/<page>.astro';
@source '../sections/<page>/**/*.astro';

@config '../../tailwind.config.js';

/* Page-specific CSS goes here, unlayered. Example:
   .my-grid { display: grid; grid-template-columns: …; } */
```

**Key points:**

- **No `@layer theme, base, utilities;` declaration.** Utilities and any custom CSS in this file must compete in the unlayered cascade so they win against Webflow's element defaults. See [docs/responsive-no-overlap-rule.md](./responsive-no-overlap-rule.md) for the cascade background (the rule itself is no longer load-bearing).
- **`source(none)` is required** on the utilities import. Without it, Tailwind v4 auto-scans the entire workspace and your bundle becomes ~100 KB of unused utilities. With it, Tailwind only scans what your `@source` directives list.
- **Don't add `@source '../sections/_shared/…'` lines for shared components.** The build script auto-injects those by parsing your page's frontmatter imports. Adding them manually doesn't hurt but is redundant and drifts out of sync if the page imports change.

## Step 4 — Wire the build target

[scripts/build-css.mjs](../scripts/build-css.mjs) `TARGETS` array — append:

```js
{ name: '<page>', input: 'src/styles/<page>.css', page: 'src/pages/<page>.astro' },
```

The `page` field tells the build script to:

1. Parse `src/pages/<page>.astro` frontmatter for `import X from '../sections/_shared/X.astro'` lines.
2. Generate a temporary entry CSS at `src/styles/.build/<page>.css` (gitignored) that re-imports your `<page>.css` and appends `@source '../sections/_shared/X.astro'` for each discovered import.
3. Run Tailwind on the generated entry, output to `public/css/<page>.css`.

Targets without a `page` field (currently only `shared` and `fonts`) skip the auto-injection and run Tailwind on the original entry directly.

## Step 5 — Watch mode (optional)

For faster iteration on one page, run the CSS builder in watch mode scoped to your page:

```bash
npm run build:css -- --watch --page=<page>
```

This rebuilds only `shared`, `fonts`, and your page bundle when their inputs change. Run `npm run dev` in a second terminal for the Astro dev server.

## Step 6 — Build

```bash
npm run build
```

This runs:

1. `build:css` — compiles every entry CSS to `public/css/<name>.css`. Bundles over 49 KB are auto-split into `<name>-1.css` and `<name>-2.css` (Webflow's per-`<style>`-paste cap is ~50 KB).
2. `astro build` — generates `dist/<page>/index.html` and `dist/embed-build/<page>/<section>/index.html`.
3. `scripts/extract-embeds.mjs` — extracts per-section HTML to `dist/_embeds/<folder>/<section>.html`.
4. `scripts/assemble-confirmations.mjs` — assembles `dist/preview/<page>.html` with inlined CSS for local browser preview.

After build, you should see:

- `public/css/<page>.css` — paste this into the Webflow page's `<head>`.
- `dist/_embeds/<page>/<section>.html` — paste each section into a Webflow Embed element on the page.
- `dist/preview/<page>.html` — open in a browser to verify before pasting.

## Step 7 — Paste into Webflow

Per page, one-time:

1. Webflow page settings → **Inside `<head>` tag** — paste:
   ```html
   <style>PASTE public/css/shared.css HERE</style>
   <style>PASTE public/css/<page>.css HERE</style>
   ```
   If the page bundle was split, paste `<page>-1.css` then `<page>-2.css` in two separate `<style>` blocks. Order matters.

   Never paste `public/css/fonts.css` — Webflow injects Nohemi + Gilroy itself via Project Settings → Fonts. The `fonts.css` bundle is preview-only.

Per section, every change:

1. Add (or open) an **Embed** element on the page.
2. Paste contents of `dist/_embeds/<folder>/<section>.html` into the Embed.
3. Save → Publish to staging → Cleartax reviews → Retool promotes.

## Quick checklist

- [ ] `src/pages/<page>.astro` created, imports `fonts.css` + `shared.css` + `<page>.css` + each section component.
- [ ] `src/sections/<page>/*.astro` exist with `<style is:global>` blocks.
- [ ] `src/styles/<page>.css` created with the structure above (no `@layer theme, base, utilities;` declaration).
- [ ] `scripts/build-css.mjs` `TARGETS` array has a new entry with `name`, `input`, and `page` fields.
- [ ] `npm run build` succeeds.
- [ ] `dist/preview/<page>.html` renders correctly in browser.
- [ ] Webflow paste works without `!important` hacks.

## Common mistakes

**Forgetting `source(none)`.** Symptom: page bundle is ~100 KB+ and contains utilities for every section in the workspace. Fix: ensure `@import 'tailwindcss/utilities.css' source(none);` (with the `source(none)` modifier).

**Hand-adding `@source '../sections/_shared/X.astro'` to the CSS entry.** Not wrong, but redundant — the build script auto-injects these. If you remove an `_shared` import from the page but leave the `@source` line in CSS, you'll keep compiling utilities for a component that's no longer in the page.

**Using `@layer` blocks in the page CSS or section `<style is:global>`.** Layered styles always lose to unlayered styles in the cascade, regardless of specificity. Webflow's element defaults are unlayered, so anything you wrap in `@layer base { … }` or `@layer utilities { … }` will lose to them. Keep page CSS unlayered.

**Naming a Webflow class after a Tailwind utility.** Don't make Webflow classes called `flex`, `grid`, `container`, `w-full`, etc. — they'll collide with the utilities pasted in your `<head>` and break unpredictably. Use distinct names like `hero-grid`, `pricing-container`.
