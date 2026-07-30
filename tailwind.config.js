/**
 * Tailwind v4 still supports JS config via the `@config` directive in CSS.
 * Most theme work in v4 is done via `@theme` blocks in CSS (see tokens.css);
 * this file is kept to demonstrate v4's backwards compatibility and to host
 * any plugin or preset registrations that are easier in JS than in CSS.
 *
 * `content` is intentionally empty — content scoping in v4 is done per-bundle
 * via `@source` directives in each CSS file (see src/styles/shared.css etc).
 */
export default {
  content: [],
  // theme.extend is honored when this file is loaded via @config in CSS,
  // but prefer @theme in tokens.css for new tokens.
  theme: {
    extend: {
      // Custom breakpoint above xl (1280) — enables `xl2:` variants on all pages.
      screens: {
        xl2: "1400px",
      },
      container: {
        screens: {
          xl: "1280px",
          // Keep the container locked to 1328px from the new 1400px breakpoint up.
          xl2: "1328px",
        },
      },
    },
  },
  plugins: [],
};
