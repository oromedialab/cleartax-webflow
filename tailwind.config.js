/**
 * Tailwind v4 still supports JS config via the `@config` directive in CSS.
 * Most theme work in v4 is done in CSS (see src/styles/tokens.css);
 * this file hosts screen registrations and any plugin/preset work that is
 * easier in JS than in CSS.
 *
 * `content` is intentionally empty — content scoping in v4 is done per-bundle
 * via `@source` directives in each CSS file (see src/styles/shared.css etc).
 *
 * NOTE: `theme.container` is NOT configured here. Tailwind v4 removed the
 * container plugin's config options; leaving a v3-style `container.screens`
 * block in place emitted a broken second `.container` rule
 * (`max-width: none` at xl2, plus two invented breakpoints). The container is
 * now defined correctly via `@utility container` in src/styles/shared.css.
 */
export default {
  content: [],
  theme: {
    extend: {
      screens: {
        // Extra breakpoint above xl (1280). Windows laptops cluster around
        // ~1328px wide while the team's MacBooks report ~1470px, so xl2 lets
        // us tune the small-laptop case without touching the MacBook range.
        xl2: "1400px",
      },
    },
  },
  plugins: [],
};
