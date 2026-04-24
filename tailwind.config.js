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
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  // theme.extend is honored when this file is loaded via @config in CSS,
  // but prefer @theme in tokens.css for new tokens.
  theme: { extend: {} },
  plugins: [],
};
