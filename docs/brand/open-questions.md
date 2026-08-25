# Open questions for Cleartax design

Tracked until answered. Delete a row once it's resolved and the fix has landed in `src/styles/tokens.css`.

## Blocking nothing right now, but wrong in the source

### 1. Ledger White's core hex is not in its own ramp

The core palette defines Ledger White as `#F2F1F0`. The ramp defines 50 as `#FAFAF9` and 100 as `#F5F5F4`. `#F2F1F0` appears at no step.

Every contrast ratio published in the brand docs is computed against `#F2F1F0` — verified:

| Claimed | Against `#F2F1F0` | Against ramp 100 `#F5F5F4` | Against ramp 50 `#FAFAF9` |
|---|---|---|---|
| Vault Navy 17.75 : 1 | **17.75** ✓ | 18.36 | 19.18 |
| Nova Blue 5.44 : 1 (labelled "on Ledger White 50") | 5.04 | 5.20 | **5.44** ✓ |

So the pairing frames label swatches inconsistently — "Ledger White 100" in the accessibility frame means `#F2F1F0`, while "Ledger White 50" in the Nova Blue pairing means `#FAFAF9`.

**Ask:** should `#F2F1F0` become ramp step 100 (replacing `#F5F5F4`), or is it a separate brand constant sitting outside the ramp? This repo currently treats it as a separate constant.

### 2. Vault Navy 400 and 500 are identical

Both `#2123FF`. One of them is wrong.

### 3. Vault Navy ramp is non-monotonic

Step 600 `#1200FF` is darker (L = 0.0735) than step 700 `#1600FF` (L = 0.0739). A ramp should darken continuously.

Separately: steps 50–900 are a pure blue ramp, and 950 jumps to `#05022A`, a near-black violet. Step 900 `#0F07A8` → 950 `#05022A` is a large hue and lightness jump. If 950 is meant to be the brand navy, the ramp above it should be built from that colour, not from `#2123FF`.

### 4. Destructive 300, 400 and 500 are identical

All `#EF4444`.

### 5. The mockups spend Flux Lime twice per page

`docs/brand/colour.md` is explicit: *"one instance per screen. If a designer needs two, one of them isn't important."* The Global Invoicing mockup marks **two** phrases in Flux Lime — "Compliance" in the hero and "Without Limits?" in the closing CTA.

`src/sections/global-invoicing/` currently implements both, to match the design. **Ask which one survives**, or whether the one-per-screen rule is being relaxed to one-per-viewport. Whichever way it lands, the rule and the mockups should agree.

### 6. Wordmark SVG missing

Only PNGs at 279 × 64 and 349 × 80 are available — too small for retina headers. Need SVG at the master 218 × 50 ratio, Vault Navy and Ledger White versions.

## Not yet specified

| Item | Status |
|---|---|
| Border radius scale | Not supplied. Using Tailwind defaults until specified. |
| Shadow / elevation scale | Not final per Cleartax. Not implemented. |
| Icon set | Not supplied. |
| Motion / easing specs | Not supplied. Using the repo's existing `--transition-*` tokens. |
| Component library (buttons, cards, inputs, nav, footer) | Not supplied. Building components per page as designs arrive. |
| Weights for H3, H4 and H6 | The type table only names Display/H1 (Bold), H2 (Semibold) and H5 (Medium). We assumed H3 Semibold, H4 Medium, H6 Medium. Confirm. |

## Resolved

- **Google Sans licensing** — resolved 2026-08-24. Google Sans is on Google Fonts under SIL OFL 1.1 (`isOpenSource: true`, `license: ofl` per `fonts.google.com/metadata/fonts/Google%20Sans`), following Google's open-sourcing of Google Sans Flex in November 2025. Free to self-host, redistribute and use commercially. No licence to acquire.
- **"Google Sans Text"** referenced in the brand doc does not exist on Google Fonts. The reading cut is the `opsz` axis (17–18) on Google Sans; `font-optical-sizing: auto` covers it.
