# Spacing

## The 4px spacing system

All spacing for components and typography is done in increments of 4 pixels.

Because every value on the scale is a 4px multiple, **Tailwind's default spacing scale already matches this system 1:1** — `--spacing: 0.25rem` means `p-1` = 4px, `p-4` = 16px, `p-48` = 192px. No Tailwind config is required. Write utilities, not custom values.

The named CSS variables exist for hand-written CSS inside `<style is:global>` blocks. Prefer the utility.

| Step | Token | Size | Tailwind |
|---|---|---|---|
| 1 | `--spacing-xx-sm` | 4px | `1` |
| 2 | `--spacing-x-sm` | 8px | `2` |
| 3 | `--spacing-sm` | 12px | `3` |
| 4 | `--spacing-md` | 16px | `4` |
| 5 | `--spacing-big` | 20px | `5` |
| 6 | `--spacing-x-big` | 24px | `6` |
| 7 | `--spacing-xx-big` | 28px | `7` |
| 8 | `--spacing-xxx-big` | 32px | `8` |
| 10 | `--spacing-lg` | 40px | `10` |
| 12 | `--spacing-x-lg` | 48px | `12` |
| 16 | `--spacing-xx-lg` | 64px | `16` |
| 20 | `--spacing-xxx-lg` | 80px | `20` |
| 24 | `--spacing-huge` | 96px | `24` |
| 32 | `--spacing-x-huge` | 128px | `32` |
| 40 | `--spacing-xx-huge` | 160px | `40` |
| 48 | `--spacing-xxx-huge` | 192px | `48` |

## Guidelines

**Image and text spacing.** Images are visually heavier than text. Adding extra space helps balance vibrant imagery against the content, making it easier to read. More space also creates better contrast between a headline and tinted text.

**Component spacing.** Use less space between small components, or components that share a close functional relationship. Many components are sized in increments of 20px to match the line height of body text, which makes it easy to build harmonious arrangements.

**Do**

- Use values from the approved spacing scale consistently.
- Use smaller spacing within components and larger spacing between sections.
- Increase spacing for larger hierarchy jumps, such as between sections and major content groups.
- Use spacing to create clear relationships between related elements.
- Maintain consistent spacing between similar components throughout the interface.
- Repeat spacing values to create rhythm and visual consistency.
- Use spacing to improve readability rather than relying only on typography changes.

**Don't**

- Don't invent custom spacing values just to make an element fit.
- Don't use inconsistent gaps between similar elements or components.
- Don't give unrelated elements the same spacing when their hierarchy is different.
- Don't use excessive spacing that breaks the relationship between related content.
- Don't use typography changes to fix spacing problems.
- Don't adjust individual margins arbitrarily when the spacing system already provides an appropriate value.
- Don't let spacing vary unnecessarily across responsive breakpoints.
