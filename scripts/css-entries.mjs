/**
 * Helpers for generating the per-page Tailwind entry files at
 * src/styles/.build/<name>.css from each page's _shared imports.
 *
 * Shared between scripts/build-css.mjs (build-time generation + Tailwind
 * compile) and astro.config.mjs (Vite dev plugin that regenerates entries
 * when a page's frontmatter changes).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Per-page Tailwind targets. Each entry produces public/css/<name>.css and
 * gets its `_shared` @sources auto-injected from the page's frontmatter.
 */
export const PAGE_TARGETS = [
  { name: 'brand-test', input: 'src/styles/brand-test.css', page: 'src/pages/brand-test.astro' },
  { name: 'v1-uae', input: 'src/styles/v1-uae.css', page: 'src/pages/v1-uae.astro' },
  { name: 'v1-uaev2', input: 'src/styles/v1-uaev2.css', page: 'src/pages/v1-uaev2.astro' },
  { name: 'v1-oman-e-invoicing', input: 'src/styles/v1-oman-e-invoicing.css', page: 'src/pages/v1-oman-e-invoicing.astro' },
  { name: 'v1-global-mandate', input: 'src/styles/v1-global-mandate.css', page: 'src/pages/v1-global-mandate.astro' },
  { name: 'v1-global-mandate-v2', input: 'src/styles/v1-global-mandate-v2.css', page: 'src/pages/v1-global-mandate-v2.astro' },
  { name: 'v1-scale-and-security', input: 'src/styles/v1-scale-and-security.css', page: 'src/pages/v1-scale-and-security.astro' },
  { name: 'v1-erp-connectivity', input: 'src/styles/v1-erp-connectivity.css', page: 'src/pages/v1-erp-connectivity.astro' },
  { name: 'v1-clear-compliance-cloud', input: 'src/styles/v1-clear-compliance-cloud.css', page: 'src/pages/v1-clear-compliance-cloud.astro' },
  { name: 'v1-recon-ai-agent', input: 'src/styles/v1-recon-ai-agent.css', page: 'src/pages/v1-recon-ai-agent.astro' },
  { name: 'v1-germany-product', input: 'src/styles/v1-germany-product.css', page: 'src/pages/v1-germany-product.astro' },
  { name: 'test', input: 'src/styles/test.css', page: 'src/pages/test.astro' },
  { name: 'v1-france-product', input: 'src/styles/v1-france-product.css', page: 'src/pages/v1-france-product.astro' },
  { name: 'v1-philippines-product', input: 'src/styles/v1-philippines-product.css', page: 'src/pages/v1-philippines-product.astro' },
  { name: 'v1-oman-product', input: 'src/styles/v1-oman-product.css', page: 'src/pages/v1-oman-product.astro' },
  { name: 'v1-spain-product', input: 'src/styles/v1-spain-product.css', page: 'src/pages/v1-spain-product.astro' },
  { name: 'v1-blog', input: 'src/styles/v1-blog.css', page: 'src/pages/v1-blog.astro' },
  { name: 'v1-global-invoicing-delivery', input: 'src/styles/v1-global-invoicing-delivery.css', page: 'src/pages/v1-global-invoicing-delivery.astro' },
  { name: 'global-invoicing', input: 'src/styles/global-invoicing.css', page: 'src/pages/global-invoicing.astro' },
  { name: 'blog-listing', input: 'src/styles/blog-listing.css', page: 'src/pages/blog-listing.astro' },
  // Detail route. It uses no utilities beyond `container` — the design is
  // element selectors in blog-detail.css so a Webflow Rich Text body styles
  // itself — but it still goes through the pipeline so the paste-ready bundle
  // lands in public/css/ like every other page.
  { name: 'blog-detail', input: 'src/styles/blog-detail.css', page: 'src/pages/blog-listing/[slug].astro' },
  { name: 'v1-resources-overview', input: 'src/styles/v1-resources-overview.css', page: 'src/pages/v1-resources-overview.astro' },
  { name: 'v1-home-page', input: 'src/styles/v1-home-page.css', page: 'src/pages/v1-home-page.astro' },
  { name: 'v1-global-invoicing-wip', input: 'src/styles/v1-global-invoicing-wip.css', page: 'src/pages/v1-global-invoicing-wip.astro' },
];

const SHARED_IMPORT_RE = /import\s+[A-Z][A-Za-z0-9]*\s+from\s+['"]\.\.\/sections\/_shared\/([A-Za-z0-9_-]+)\.astro['"]/g;

const ANY_SECTION_IMPORT_RE = /import\s+[A-Z][A-Za-z0-9]*\s+from\s+['"]\.\.\/sections\/([A-Za-z0-9_-]+)\/[^'"]+\.astro['"]/g;

function kebabName(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase();
}

/**
 * Maps a section back to the page bundle that compiles its utilities, so the
 * isolated dev view at /embed-build/<page>/<section> can load exactly that one
 * bundle — the same CSS the section gets on its real page, and nothing else.
 *
 * Returns { folders, shared }:
 *   folders[<sectionFolder>]      -> bundle name  (e.g. oman-invoicing -> oman-e-invoicing)
 *   shared[<kebab component>]     -> bundle name of the FIRST page importing it
 *
 * Dev-only concern. Build output never depends on this — extract-embeds.mjs
 * takes body.innerHTML and discards the head entirely.
 */
export function sectionBundleMap(root) {
  const folders = {};
  const shared = {};
  for (const target of PAGE_TARGETS) {
    let src;
    try { src = readFileSync(resolve(root, target.page), 'utf8'); } catch { continue; }
    const frontmatter = src.split('---')[1] ?? '';

    ANY_SECTION_IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = ANY_SECTION_IMPORT_RE.exec(frontmatter)) !== null) {
      const folder = m[1];
      if (folder === '_shared') continue;
      if (!folders[folder]) folders[folder] = target.name;
    }

    SHARED_IMPORT_RE.lastIndex = 0;
    while ((m = SHARED_IMPORT_RE.exec(frontmatter)) !== null) {
      const key = kebabName(m[1]);
      if (!shared[key]) shared[key] = target.name;
    }
  }
  return { folders, shared };
}

const RELATIVE_ASTRO_IMPORT = /import\s+[A-Z][A-Za-z0-9]*\s+from\s+['"](\.[^'"]+\.astro)['"]/g;

// Matches a _shared import from ANY depth. The page says
// '../sections/_shared/X.astro'; a wrapper inside src/sections/<page>/ says
// '../_shared/X.astro'. SHARED_IMPORT_RE only matches the first form, which is
// why the recursion below needs its own path-agnostic pattern.
const ANY_SHARED_IMPORT = /import\s+[A-Z][A-Za-z0-9]*\s+from\s+['"][^'"]*_shared\/([A-Za-z0-9_-]+)\.astro['"]/g;

/**
 * Parse a page for `_shared` component imports, following section imports
 * transitively. Returns deduped component names (e.g. ['NavbarRb', 'Footer']).
 *
 * The recursion matters. A page may not import a `_shared` primitive directly —
 * the reuse pattern is a thin per-page wrapper section that imports it:
 *
 *   page  ->  <page>/Navbar.astro  ->  _shared/NavbarRb.astro
 *
 * Scanning only the page's own frontmatter misses the primitive entirely, so
 * Tailwind never sees its markup and silently omits every utility used only
 * inside it. That failure is invisible at build time and shows up as a section
 * rendering unstyled — e.g. a navbar whose dropdowns are permanently open
 * because `opacity-0` / `invisible` were never emitted.
 *
 * Cycle-safe and depth-limited.
 */
export function discoverSharedSources(pagePath, root, seen = new Set(), depth = 0) {
  const abs = resolve(root, pagePath);
  if (seen.has(abs) || depth > 4) return [];
  seen.add(abs);

  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { return []; }
  const parts = src.split('---');
  const frontmatter = parts.length > 2 ? parts[1] : '';

  const names = new Set();

  ANY_SHARED_IMPORT.lastIndex = 0;
  let m;
  while ((m = ANY_SHARED_IMPORT.exec(frontmatter)) !== null) names.add(m[1]);

  // Follow every relative .astro import (wrappers, nested sections) and merge
  // whatever `_shared` components they pull in.
  RELATIVE_ASTRO_IMPORT.lastIndex = 0;
  while ((m = RELATIVE_ASTRO_IMPORT.exec(frontmatter)) !== null) {
    const dep = resolve(dirname(abs), m[1]);
    for (const n of discoverSharedSources(dep, root, seen, depth + 1)) names.add(n);
  }

  return Array.from(names);
}

/**
 * Write src/styles/.build/<name>.css for a page target.
 * Generated file `@imports` the original entry and appends `@source`
 * directives for each `_shared` import the page declares. `../../sections/`
 * has two `..`s because the generated file sits one level deeper than the
 * original entry (`src/styles/.build/` vs `src/styles/`).
 *
 * Returns { entryPath, sources, changed } where `changed` indicates whether
 * the file content differed from what was already on disk — useful for
 * skipping no-op writes during dev-server file watching.
 */
export function writeGeneratedEntry(target, root) {
  const names = discoverSharedSources(target.page, root);
  const buildDir = resolve(root, 'src/styles/.build');
  mkdirSync(buildDir, { recursive: true });
  const lines = [
    `/* AUTO-GENERATED by scripts/build-css.mjs. Do not edit. */`,
    // Page entry first — it carries the `@import 'tailwindcss/…'` lines, which
    // must lead. Brand theme bindings (@theme inline colour/font tokens +
    // @utility container) follow. Injected here rather than hand-imported in
    // each page entry so a new page can't silently miss the design system.
    `@import '../${target.input.split('/').pop()}';`,
    `@import '../theme.css';`,
    ...names.map((n) => `@source '../../sections/_shared/${n}.astro';`),
    '',
  ];
  const out = resolve(buildDir, `${target.name}.css`);
  const next = lines.join('\n');
  let prev = '';
  try { prev = readFileSync(out, 'utf8'); } catch { /* first run */ }
  const changed = next !== prev;
  if (changed) writeFileSync(out, next, 'utf8');
  return { entryPath: out, sources: names, changed };
}
