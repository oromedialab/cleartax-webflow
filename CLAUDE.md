# Cleartax Webflow — agent context

Authoring workspace for Cleartax landing pages. Sections are written as Astro components, compiled to per-section HTML blobs, and **pasted by hand into Webflow Embed elements**. Nothing here is deployed — the build's only job is to emit paste-ready HTML and CSS.

That target shapes every rule below. Read [docs/adding-a-new-page.md](docs/adding-a-new-page.md) in full before scaffolding a page, and [docs/brand/](docs/brand/README.md) before writing any markup.

## Hard limits

Webflow caps each `<style>` paste and each Embed element at **~50 KB**. The build auto-splits over 49 KB into `-1`/`-2` parts, but a split means the user pastes twice, forever, on every change. **Bundle size is a feature, not an afterthought.**

- Never inline images as `data:` URIs — a single base64 PNG can exceed the whole Embed budget on its own. Upload to Webflow assets and reference by URL. (Current source is clean: only `NavbarGermany.astro` has one, at 112 chars.)
- Never widen a Tailwind `@source` glob to "just be safe". See below.

## The `@source` rule — the most expensive mistake in this repo

Page CSS entries must declare **only** their own sources:

```css
@source '../pages/<page>.astro';
@source '../sections/<page>/**/*.astro';
```

`scripts/css-entries.mjs` auto-injects one `@source` line per `_shared` component the page actually uses, plus `@import '../theme.css'`. It follows relative `.astro` imports **transitively**, so a primitive reached through a wrapper (`page → <page>/Navbar.astro → _shared/NavbarRb.astro`) is still found. Scanning only the page's own frontmatter used to miss those, and Tailwind silently dropped every utility used solely inside the primitive.

**Never write a `_shared` `@source` line yourself, and never the wildcard:**

```css
@source '../sections/_shared/**/*.astro';   /* ← compiles all 12 shared components */
```

Five entries had this. Removing it saved 5–12 KB per page and took `resources-overview` and `global-invoicing-delivery` from two Webflow pastes down to one. It is silent — the page still looks correct, it just costs double.

## Props never reach Webflow

**What you paste is the section rendered with its DEFAULT props.** `embed-build/[page]/[section].astro` renders each section standalone as `<Component />`, so anything a page passes is invisible to the build output:

```astro
<!-- page: looks right in dev and in dist/preview -->
<ContactForm sheetName="omanRAD" />
<!-- dist/_embeds/_shared/contact-form.html: still whatever the default says -->
```

This is silent and can be costly — `uae.astro` passes `sheetName="uaeRAD"`, and that only reaches production because the component's default happens to be the same string. A second page passing a different sheet would post leads to the wrong one with nothing failing.

**Props still work — just inside a section file, not from the page.** That is how components stay reusable:

```
_shared/IntegrationTabs.astro        primitive: props, styles, behaviour. Never pasted.
global-invoicing/Integrations.astro  <IntegrationTabs groups={…} />   <- the paste unit
uae/Integrations.astro               <IntegrationTabs groups={…} />   <- same primitive, other content
```

The wrapper renders standalone with the values it supplies itself, so the embed is correct. `extract-embeds.mjs` follows relative `.astro` imports when collecting `<style>`, so the primitive's CSS ships inside the wrapper's embed (imported styles first, so a wrapper can override).

Rules for that pattern:
- A **primitive takes props and is never pasted directly** — its own embed renders empty, which is fine and expected.
- A **wrapper supplies every prop it needs** and takes none itself.
- Give primitives an `idPrefix` prop if they emit `id`/`aria-controls`, so two wrappers on one page cannot collide.

For a section only one page will ever use, skip the indirection: put the content in that section's own defaults.

Verify with `dist/preview/<page>.html` — it is built from embeds, so a props leak shows up there as content reverting to defaults.

**Nothing outside a section file is pasted — including `<style>`.** The preview copies a page's `<head>`, so a `<style>` block written in a page renders in dev *and* in `dist/preview`, yet reaches no CSS bundle and no embed. Preview then looks right while Webflow differs, which defeats the one guarantee preview exists for. Page-level CSS belongs in `shared.css` (site-wide) or the page's own `.css` entry (that page only). Same for markup: the GTM `<noscript>` in a page body never ships, which is correct — it belongs in Webflow's page custom code.

## Styling rules

- **Tailwind first. Writing a custom class is a decision to go global.** Page- and section-specific styling is Tailwind utilities. Only write a custom class when it is genuinely reusable, and then it goes in `shared.css` **once** — never copy-pasted into each section's `<style>`.
- **Section `<style>` must be `is:global`.** The build fails otherwise (`residual Astro scope marker`). The extractor discards Astro's compiled CSS and re-reads the raw `<style>` from source, so source CSS must equal shipped CSS byte for byte.
- **Section CSS is unscoped and shared per page.** Every section on a page lives in one namespace; two sections defining `.card` fight, and the embed pasted later wins. Prefix per section (`.erp-grid-card`, not `.card`). There are 10 real same-page collisions today — worst is `erp-connectivity`, where 6 of 8 sections each carry an identical `.gradient-text` and 5 redefine `.premium-reveal` / `.is-visible` which already exist in `shared.css`. Don't add more.
- **Never hand-name a class after a Tailwind utility** (`flex`, `grid`, `container`, `w-full`, `text-*`).
- **Never use `@layer`** in page CSS or section styles. Layered rules always lose to Webflow's unlayered element defaults.
- **Page width is the `container` utility only.** No `max-w-[…]` for page width, no hand-rolled wrapper. It's defined once in `src/styles/theme.css`.

## Design tokens

Brand v2 — see [docs/brand/](docs/brand/README.md). Four colours, and Flux Lime appears **once per screen**.

Adding a token takes **three lines in two files**, or it only half-works:

| File | What goes there |
|---|---|
| `src/styles/tokens.css` | `--palette-x: #hex;` (raw) and `--color-x: var(--palette-x);` (alias for hand-written CSS) |
| `src/styles/theme.css` | `--color-x: var(--palette-x);` inside `@theme inline` — this is what generates `bg-x` utilities |

`@theme inline` is deliberate. A plain `@theme` tree-shakes tokens no utility references, which silently breaks `var(--color-x)` lookups in hand-written CSS. A plain `:root` block is never shaken.

`theme.css` is separate from `tokens.css` because per-page bundles never import `shared.css` — anything Tailwind must see at compile time (`@theme`, `@utility`) has to live where every page entry picks it up.

**v1 token names still resolve, but to v2 values.** `--color-dark` → Vault Navy, `--color-purple`/`--grad-btn` → Nova Blue, `--color-white`/`--color-offwhite` → Ledger White, `--color-gray-*` → the Neutral ramp, `--font-gilroy` → Google Sans. That is a deliberate compatibility shim at the bottom of `tokens.css`: a v1 section pasted into a v2 page renders in the new brand immediately. Consequence: v1 page previews render in v2 colours and no longer match what is live in Webflow — git history is the reference for that. Never use the v1 names in new work; delete each as its last section is rewritten.

`--container-max` is 1328px because 1328 − 24×2 gutters = **1280px content**, the width the Figma mockups are drawn to. Change it and `--spacing-x-big` together or that identity breaks.

## Portability

Sections are `.astro` but must port to React mechanically. No `set:html`, no named `<slot />`, no `client:*`, no `astro:assets`, no `Astro.glob`. Frontmatter is a typed `interface Props` plus trivial destructuring. Interactivity goes in vanilla `<script>` blocks using `querySelector`.

## Known traps

- **`src/pages/embed-build/[page]/[section].astro` imports no CSS, deliberately.** It exists so `extract-embeds.mjs` can lift each section's body HTML; the extractor strips every `<style>` from that render anyway, so imports there cannot affect output — they only styled a browsable view that loaded *every* page's bundle and could hide a scoping bug. Don't re-add them. (`import.meta.glob` on CSS is also broken in Astro 4.16 frontmatter — dangling reference, `i is not defined`.)
- **Builds are not reproducible.** `TrustedLeaders`, `TrustedLeadersV2`, `TrustedOman` and `CaseStudies` call `Math.random()` to pick background colours at build time, so those four embeds change on every build. Don't use `Math.random()` in a section.
- **`fonts.css` is v1 only** (self-hosted Nohemi/Gilroy) and is preview-only — never paste it into Webflow. Brand v2 pages don't import it; they load Inter Tight + Google Sans from Google Fonts via a `<link>` in the page head.

## Verifying

```bash
npm run build:css -- --watch --page=<page>   # terminal 1
npm run dev                                  # terminal 2
```

`localhost:4321/<page>` (Astro render) and `dist/preview/<page>.html` (Webflow-paste simulation) must render identically — that equivalence is the whole point of the pipeline. `src/pages/brand-test.astro` is the token specimen that exercises both the utility route and the hand-written `var()` route.

`/embed-build/<page>/<section>` is **not** verification — it carries no CSS and renders unstyled. It exists only to generate embeds. `dist/preview/<page>.html` is the accurate mirror of the Webflow paste.
