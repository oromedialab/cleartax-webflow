# Responsive utilities — no-overlap rule

## TL;DR

When two Tailwind utilities target the **same CSS property** on the same element, their `@media` ranges must be **mutually exclusive**. Never mix a base utility with a breakpoint-prefixed variant of the same property.

## Why

We embed Tailwind v4 output as raw CSS inside Webflow pages. To stop Webflow's element defaults from beating our utilities, the project's CSS bundles are generated without `@layer utilities` wrapping. Once layered cascade is gone, the **only** thing deciding which rule wins between two same-specificity declarations is source order.

Tailwind's emit order is not something we want to rely on for visual correctness. The reliable fix is to make sure no two same-property utilities ever match the same viewport at once — then cascade order is irrelevant.

## The rule

For every CSS property an element touches:

- **Value constant across all viewports** → one **base** utility, no variant. (No second rule, no conflict.)
- **Value changes per viewport** → **only** variant-prefixed utilities, each prefix covering an **exclusive** screen range. No base utility on that property.

If you ever write `<prop-utility> <breakpoint>:<other-value-of-same-prop>`, rewrite as `<rangeA>:<v1> <rangeB>:<v2>`.

## Patterns

### Two-range (one breakpoint)

Project's `lg` breakpoint is 1024px.

| Range | Variant | Width |
|---|---|---|
| Mobile / tablet | `max-lg:` | 0 → 1023.98px |
| Desktop | `lg:` | ≥ 1024px |

```html
<!-- BAD: base padding + max-lg override -> both fire at mobile -->
<a class="px-10 py-3 max-lg:px-3 max-lg:py-1.5">…</a>

<!-- GOOD: each viewport owns exactly one rule -->
<a class="lg:px-10 max-lg:px-3 lg:py-3 max-lg:py-1.5">…</a>
```

```html
<!-- BAD: hidden (always) + max-lg:tw-block -> overlap at mobile -->
<button class="hidden max-lg:tw-block">…</button>

<!-- GOOD -->
<button class="lg:hidden max-lg:tw-block">…</button>
```

### Three-range (two breakpoints)

When you need a middle band — e.g. value changes at `sm` and again at `lg`:

| Range | Variant | Width |
|---|---|---|
| Small phone | `max-sm:` | 0 → 639.98px |
| Tablet | `sm:max-lg:` | 640 → 1023.98px |
| Desktop | `lg:` | ≥ 1024px |

```html
<h2 class="max-sm:text-base sm:max-lg:text-lg lg:text-xl">…</h2>
```

### Properties that genuinely don't change

Stay as a single base utility. No variant. No conflict possible.

```html
<div class="flex items-center justify-between rounded-2xl bg-white">…</div>
```

## When base + variant on same property is OK

Only when the variant is **state-scoped**, not screen-scoped:

```html
<!-- group-state variant -> deterministically toggled by JS, not by viewport -->
<div class="hidden group-[.active]/item:tw-block">…</div>
```

Here `.active` is mutually exclusive with the "not active" state by intent, and `.tw-block` carries `!important` so it wins when applied. This is fine.

Hover, focus, `aria-*`, `data-*`, `[&.open]:` style variants are all in the same category.

## Pseudo-`!important` helpers — use these, not the plain utilities

The project defines display helpers in [src/styles/shared.css](../src/styles/shared.css):

```css
.tw-block { display: block !important; }
.tw-grid  { display: grid  !important; }
```

**Always use `.tw-block` instead of `block`, and `.tw-grid` instead of `grid`.** Webflow injects its own `display` rules on `<a>`, `<div>`, and other elements; plain `block` / `grid` from Tailwind lose that fight because we emit utilities without `@layer utilities` wrapping. The `!important` in the helpers guarantees the utility wins regardless of cascade order.

`hidden` (display:none) is fine without the helper — Tailwind's `hidden` has high enough specificity to beat Webflow defaults in practice. But for **show** states (`block`, `grid`), always go through the helpers.

They're still subject to the no-overlap rule — pair them with a non-overlapping range partner (`lg:tw-block` + `max-lg:hidden`, `lg:tw-grid` + `max-lg:hidden`, etc.).

For other displays (`flex`, `inline-flex`, `inline`, …) where no helper exists, use Tailwind v4's `!` modifier when Webflow defaults override (`flex!`, `inline-flex!`). Reach for this only when you actually see a Webflow override beating you; default to plain utilities first.

## Quick checklist when writing a class

1. List the props this element needs.
2. For each prop: same value at every viewport, or different?
3. **Same** → one base utility.
4. **Different** → variants only, ranges chosen so they don't overlap.
5. Sanity-check: at every viewport width, exactly one rule matches per prop.

## Reference rewrite

The [Navbar global v2](../src/sections/_shared/NavbarGlobalV2.astro) component was the first to follow this rule. Use its class strings as a working example.

## Open follow-up

Removing `@layer utilities` was meant to stop Webflow defaults from beating our utilities. It worked for a while then stopped — root cause still pending. Whatever the resolution, the no-overlap rule above is cheap to keep, makes responsive behavior deterministic regardless of cascade quirks, and should remain the convention.
