# Build pipeline & data flow

How `.astro` + Tailwind sources become the per-section HTML + per-page CSS that gets pasted into Webflow.

## TL;DR diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  AUTHORING                                                          │
│                                                                     │
│  src/pages/<page>.astro          ← orchestrates a page              │
│  src/sections/<page>/*.astro     ← page-specific sections           │
│  src/sections/_shared/*.astro    ← cross-page sections              │
│  src/styles/<page>.css           ← Tailwind entry (page-scoped)     │
│  src/styles/shared.css           ← tokens + reset + helpers (no TW) │
│  src/styles/tokens.css           ← CSS vars in :root                │
└────────────────────────────────────────┬────────────────────────────┘
                                         │
                       npm run build     │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1 — scripts/build-css.mjs                                     │
│    For each page target:                                            │
│      • Parse page.astro frontmatter for _shared/* imports.          │
│      • Generate src/styles/.build/<page>.css that @imports the      │
│        original entry and @sources each _shared component.          │
│      • Run @tailwindcss/cli → public/css/<page>.css.                │
│      • Split into -1/-2 if over 49 KB (Webflow paste cap).          │
│                                                                     │
│  Output: public/css/{shared,fonts,<page>,...}.css                   │
└────────────────────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2 — astro build                                               │
│    • Renders each page → dist/<page>/index.html.                    │
│    • Renders each section in isolation via the                      │
│      embed-build/[page]/[section].astro dynamic route               │
│      → dist/embed-build/<page>/<section>/index.html.                │
│    • Copies public/ → dist/ (so public/css → dist/css).             │
└────────────────────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3 — scripts/extract-embeds.mjs                                │
│    For each dist/embed-build/<page>/<section>/index.html:           │
│      • Strip <html>/<head>/<body>/<!doctype>.                       │
│      • Discard Astro's bundled per-route CSS (contains every        │
│        sibling section's styles; would blow past Webflow cap).      │
│      • Read the source .astro's own <style is:global> block,        │
│        minify via css-tree, prepend to body innerHTML.              │
│      • Fail build if forbidden markup or Astro scope leaks slip in. │
│                                                                     │
│  Output: dist/_embeds/<page>/<section-kebab>.html                   │
└────────────────────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4 — scripts/assemble-confirmations.mjs                        │
│    For each src/pages/*.astro:                                      │
│      • Parse frontmatter for `import '../styles/X.css'` → CSS to    │
│        inline as <style> blocks.                                    │
│      • Parse frontmatter for `import Name from '../sections/...'`   │
│        → component map (name → folder).                             │
│      • Walk template for <Name /> tags in order, look up the        │
│        matching dist/_embeds/<folder>/<section>.html, inline it.    │
│                                                                     │
│  Output: dist/preview/<page>.html (browser-openable mirror of       │
│          what the Webflow page will look like after pasting)        │
└─────────────────────────────────────────────────────────────────────┘
```

## What you paste into Webflow

After `npm run build`:

| Webflow target | Source file |
|---|---|
| Page `<head>` `<style>` block #1 | `public/css/shared.css` |
| Page `<head>` `<style>` block #2 | `public/css/<page>.css` (or `<page>-1.css` + `<page>-2.css` if split) |
| Each Webflow Embed element on the page | `dist/_embeds/<folder>/<section-kebab>.html` |

`dist/preview/<page>.html` is local-only — open in browser to verify before pasting.

`public/css/fonts.css` is **never** pasted into Webflow. Webflow injects Nohemi + Gilroy via Project Settings → Fonts. The local `fonts.css` exists only so `npm run dev` and `dist/preview/*.html` render fonts correctly.

## File-by-file walkthrough

### `src/styles/shared.css`

Tiny universal bundle (~5 KB). Contains:
- `@import './tokens.css'` — design-token CSS variables in `:root`.
- Element reset (`*, body, h1…h6, a, img`) at **top level** (unlayered).
- Custom helpers (`.tw-block`, `.tw-grid`, `.text-gilroy`, `.bg-grad-recon`, animation classes) at top level (unlayered).

No Tailwind utility compilation here. No `@source`. No `@layer` wrappers.

Loaded into every Webflow page's `<head>` so the helpers and tokens are available everywhere. See [docs/responsive-no-overlap-rule.md](./responsive-no-overlap-rule.md) for the cascade context behind keeping everything unlayered.

### `src/styles/<page>.css`

Per-page Tailwind entry. Contains:
- `@import 'tailwindcss/theme.css' layer(theme)` — Tailwind v4 design tokens (spacing, breakpoints, color scale).
- `@import 'tailwindcss/utilities.css' source(none)` — the unscoped Tailwind utility set. `source(none)` disables the default workspace-wide scan; only files in explicit `@source` directives are scanned.
- `@source '../pages/<page>.astro'` and `@source '../sections/<page>/**/*.astro'` — what to scan for utility classes.
- `@config '../../tailwind.config.js'` — JS config for plugins/presets.
- Optional: page-specific raw CSS at the bottom (e.g. `.live-flag-grid` in `global-mandate.css`).

What's **not** here: `@source` lines for `_shared` components. Those are added at build time — see step 1 below.

### `src/sections/<folder>/<Section>.astro`

One section per file. Three parts:

```astro
---
// optional typed props
interface Props { … }
---

<section class="…tailwind utilities…">
  <!-- markup -->
</section>

<style is:global>
  /* CSS that can't be expressed as utilities. is:global so no
     Astro scope hashes leak into the output. */
</style>

<script is:inline>
  // vanilla DOM JS, attached on page load
</script>
```

The `is:global` flag is the critical convention — without it Astro injects scope-hash attributes (`data-astro-cid-XXX`) on every element and prefixes the CSS selectors with those hashes. `extract-embeds.mjs` fails the build if it sees any scope-hash residue.

`_shared/` vs `<page>/` only controls which page CSS bundle picks up the utilities for this component — there's no other semantic difference. Move a section between folders to change its scoping.

## The build pipeline in detail

### Step 1 — CSS bundling

`scripts/build-css.mjs` reads the `TARGETS` array:

```js
{ name: 'global-mandate', input: 'src/styles/global-mandate.css', page: 'src/pages/global-mandate.astro' }
```

For each target with a `page` field:

1. **Discover shared imports** — read the page astro file, regex its frontmatter for
   ```
   import <Capitalized> from '../sections/_shared/<File>.astro'
   ```
   Returns the set of `_shared` component names imported by the page.

2. **Generate a temp entry** at `src/styles/.build/<name>.css`:
   ```css
   /* AUTO-GENERATED by scripts/build-css.mjs. Do not edit. */
   @import '../global-mandate.css';
   @source '../../sections/_shared/NavbarGlobalV2.astro';
   @source '../../sections/_shared/Footer.astro';
   /* …one @source per discovered _shared import… */
   ```
   The `../../sections/...` path is two `..`s because the generated file is one level deeper than the original entry (`src/styles/.build/` vs `src/styles/`). Tailwind resolves `@source` paths relative to the file the directive is declared in.

3. **Run Tailwind CLI** on the generated entry. Tailwind scans every file listed in any `@source` (both the original entry's `@source` for `sections/<page>/**` and the auto-injected `@source` for `sections/_shared/*`), collects utility class strings, and emits the matching utility CSS. Output goes to `public/css/<name>.css`.

4. **Auto-split if over 49 KB**. Webflow caps each `<style>` paste at ~50 KB. The script finds the first top-level rule boundary past the midpoint and writes `<name>-1.css` + `<name>-2.css`. Both halves are valid standalone CSS; paste in order.

Targets without a `page` field (currently `shared` and `fonts`) skip steps 1-3 and run Tailwind directly on the original entry. `shared.css` compiles no utilities (no `@import 'tailwindcss/utilities.css'`), so it just passes through tokens + reset + helpers.

### Step 2 — Astro build

`astro build` does two things relevant to this pipeline:

1. **Static-renders each page** in `src/pages/` to `dist/<page>/index.html`. These full-page HTMLs aren't pasted into Webflow — Webflow owns the page chrome. They exist for completeness and as input to step 4.

2. **Renders each section in isolation** via the dynamic route `src/pages/embed-build/[page]/[section].astro`. That route uses `import.meta.glob('../../../sections/**/*.astro', { eager: true })` plus a `getStaticPaths` that lists every section. Output: `dist/embed-build/<page>/<section>/index.html`, one per section, with the section as the only body content.

Astro also bundles per-route CSS (`dist/_astro/<hash>.css`) — every section in the embed-build route gets sibling section CSS folded into its bundle. This is **discarded** in step 3 because it would multiply per-embed paste size and isn't needed (the page-level `<head>` CSS covers all utilities).

`build.inlineStylesheets: 'always'` in [astro.config.mjs](../astro.config.mjs) inlines stylesheet `<link>`s into each page's `<head>`, which simplifies the rest of the pipeline.

### Step 3 — Embed extraction

`scripts/extract-embeds.mjs` walks `dist/embed-build/<page>/<section>/index.html` files:

1. **Strip page chrome** — regex removes `<!doctype>`, `<html>`, `<head>`, `<body>` tags. The parser then extracts `body.innerHTML`.
2. **Drop Astro's bundled `<style>` blocks** before parsing — they're the per-route CSS bundles that include every sibling section's styles, plus utility CSS that's already covered by the page's `<head>` paste.
3. **Read the source .astro file's own `<style is:global>` block** directly from disk. Minify via `css-tree` so the paste is compact. This is the only CSS that travels *with* the section embed.
4. **Combine** into one HTML blob:
   ```
   <!-- banner with section name in ASCII art -->
   <style>...minified section CSS...</style>
   ...section body HTML...
   ```
5. **Validate** — fail build if the blob contains `<html>`, `<head>`, `<body>`, `<!doctype>`, or any `data-astro-cid-*` / `astro-XXXXXX` markers. The latter would indicate a section forgot `is:global` on its `<style>`.

Output: `dist/_embeds/<page>/<section-kebab>.html`. This is the file you paste into a Webflow Embed element.

Section naming: PascalCase astro filename → kebab-case output filename. Intermediate directories under `sections/<page>/` flatten into the kebab prefix (e.g. `sections/global/v2/NavbarGlobalV2.astro` → `dist/_embeds/global/v2-navbar-global-v2.html`).

The `dist/embed-build/` directory is deleted after extraction — it's a build-only staging area.

### Step 4 — Preview assembly

`scripts/assemble-confirmations.mjs` produces a browser-openable preview of each page that mirrors what Webflow will render after you paste:

1. **Parse the page astro's frontmatter** for:
   - `import '../styles/X.css'` → list of CSS bundles to inline.
   - `import Capitalized from '../sections/<folder>/<File>.astro'` → map of component name → source folder.

2. **Walk the page's template** for `<ComponentName />` tags in document order. For each, look up the matching `dist/_embeds/<folder>/<section-kebab>.html` and inline its contents.

3. **Inline the CSS bundles** as `<style>` blocks in the assembled `<head>`. If a bundle was split (`<name>-1.css` + `<name>-2.css`), inline both blocks in order. The `fonts.css` block gets a "PREVIEW-ONLY — DO NOT PASTE INTO WEBFLOW" banner.

4. **Write** to `dist/preview/<page>.html`. Open in any browser — what you see is what Webflow will render once you paste the same CSS into the page `<head>` and the section embeds into Webflow Embed elements.

## How a change propagates

### Edit a utility class in a section

1. Save the `.astro` file.
2. `npm run build:css` (or `npm run build:css -- --watch` keeps it running).
3. Tailwind re-scans the file via its `@source` membership, recompiles `public/css/<page>.css`.
4. `npm run build` regenerates `dist/preview/<page>.html` with the updated CSS inlined.
5. Re-paste the page's CSS bundle into Webflow `<head>`.

### Add a new section to an existing page

1. Create `src/sections/<page>/<Section>.astro`.
2. Add `import <Section> from '../sections/<page>/<Section>.astro'` to the page astro's frontmatter and `<Section />` in the template body.
3. `npm run build`.
4. The embed-build route picks up the new section automatically via `import.meta.glob` — no registry edit needed.
5. New embed lands at `dist/_embeds/<page>/<section-kebab>.html`. Paste into a new Webflow Embed element on the page.

### Add a new shared section used on an existing page

1. Create `src/sections/_shared/<Section>.astro`.
2. Add `import <Section> from '../sections/_shared/<Section>.astro'` to the page astro frontmatter.
3. `npm run build`. The build script picks up the new import, auto-injects an `@source` for it, recompiles the page's CSS bundle to include utilities for the new section.
4. No CSS file edit, no `TARGETS` edit.

### Add an entirely new page

See [docs/adding-a-new-page.md](./adding-a-new-page.md). The short version: create page astro, sections folder, `<page>.css`, and append a `TARGETS` entry in `scripts/build-css.mjs`.

## Key contracts the pipeline relies on

These are the "magic strings" the build scripts pattern-match on. Don't deviate from them.

### Page frontmatter imports

```astro
import '../styles/<name>.css';                              // ✓ assemble-confirmations finds this
import <Capitalized> from '../sections/<folder>/<File>.astro'; // ✓ build-css + assemble-confirmations
```

Single quotes or double quotes both work for both regexes. The component name must be a valid PascalCase identifier (matches `[A-Z][a-zA-Z0-9]*`).

### Section `<style>` blocks

```astro
<style is:global>
  /* … */
</style>
```

Always `is:global`. Without it Astro adds scope hashes that the extractor refuses.

### Filename → key mapping

- PascalCase `Section.astro` → kebab `section.html` for the embed output.
- Intermediate folders under `src/sections/<page>/` flatten into a kebab prefix on the section name (e.g. `sections/global/v2/HeroGlobalV2.astro` → embed key `global/v2-hero-global-v2`).

## Cascade strategy (why the output looks this way)

Tailwind utilities and the shared bundle's reset/helpers are all emitted **unlayered** (no `@layer base { … }` or `@layer utilities { … }` wrappers). This matters because of CSS spec:

> Unlayered styles always win against layered styles at the same specificity, regardless of declaration order.

Webflow's element-level defaults are unlayered. If we wrapped our utilities in a named layer, every Webflow `.w-nav-link` rule (specificity 0,1,0) would beat our `.flex` (also 0,1,0 but layered). By keeping everything unlayered, our utilities compete with Webflow on equal terms and win on cascade source order (our embed paste lands after Webflow's default stylesheet in `<head>`).

The `@layer theme { … }` block in each per-page bundle is harmless — it contains only `:root` CSS variables (no element-targeting rules), so it doesn't compete with anything.

## Useful URLs during `npm run dev`

| URL | What it shows |
|---|---|
| `http://localhost:4321/<page>` | full page preview rendered by Astro |
| `http://localhost:4321/embed-build/<page>/<section>` | one section in isolation (mirrors the embed-build output) |
| `http://localhost:4321/test` | the cascade test page (utilities vs fake-Webflow defaults) |

Open `dist/preview/<page>.html` in a browser for the post-build mirror of what Webflow will render.
