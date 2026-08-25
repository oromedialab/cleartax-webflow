# Cleartax brand v2

Source of truth for the rebrand. Rewritten from the Figma design-system export; the raw export lives outside the repo.

Read this before writing any section.

| Doc | Covers |
|---|---|
| [colour.md](colour.md) | The four core colours, the 60/25/10/5 ratio, approved and forbidden pairings, all ramps 50–950 |
| [typography.md](typography.md) | Inter Tight + Google Sans, licensing and loading, the full type scale, numbers, do/don't |
| [spacing.md](spacing.md) | The 4px system and its 1:1 mapping onto Tailwind's default scale |
| [layout-grid.md](layout-grid.md) | Brand grid spec, and how this repo actually implements it |
| [accessibility.md](accessibility.md) | Contrast table, focus rings, alt text, reduced motion |
| [logo.md](logo.md) | Wordmark construction, clear space, colourways, available files |
| [open-questions.md](open-questions.md) | Unresolved items and known defects in the Figma export |

## The five rules that matter most

1. **Four colours, four jobs.** Ledger White holds the space, Vault Navy carries the brand, Nova Blue converts, Flux Lime highlights. Never introduce a fifth.
2. **Flux Lime once per screen.** Used once it's a spotlight; twice it's noise.
3. **The families never cross.** Headings are always Inter Tight, body is always Google Sans. Weights never exceed 700.
4. **Sentence case everywhere**, except overline, which is the only uppercase style.
5. **Never invent a spacing value.** Everything is a 4px multiple already on the scale.

## Where this lands in code

| Concern | File |
|---|---|
| Runtime CSS variables (`--palette-*`, `--color-*`, `--fs-*`, …) | [src/styles/tokens.css](../../src/styles/tokens.css) |
| Tailwind bindings (`bg-vault-navy`, `font-heading`) + `container` | [src/styles/theme.css](../../src/styles/theme.css) |
| Reset, focus ring, reduced motion, helpers | [src/styles/shared.css](../../src/styles/shared.css) |
| Breakpoints (`xl2`) | [tailwind.config.js](../../tailwind.config.js) |
| Live specimen / parity test | [src/pages/brand-test.astro](../../src/pages/brand-test.astro) |

`theme.css` is auto-imported into every per-page bundle by `scripts/css-entries.mjs`, so a new page cannot miss the design system.

**Adding a colour** means three lines: `--palette-x` and `--color-x` in `tokens.css`, plus `--color-x` in `theme.css`. All three, or the token only half-works.

## Checking your work

```bash
npm run build:css -- --watch    # terminal 1
npm run dev                     # terminal 2
```

Then open <http://localhost:4321/brand-test> and compare it against `dist/preview/brand-test.html` (produced by `npm run build`). The two must render identically — that page exercises every token through both the Tailwind-utility route and the hand-written-`var()` route, so a divergence means the pipeline is dropping something.
