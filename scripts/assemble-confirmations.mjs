#!/usr/bin/env node
/**
 * Assembles full-page previews from extracted embeds.
 * Uses frontmatter imports to find the correct folder for each component.
 * Outputs to dist/preview/<page>.html.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml } from 'node-html-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const EMBEDS_DIR = resolve(DIST, '_embeds');
const PAGES_DIR = resolve(ROOT, 'src/pages');
const CSS_DIR = resolve(DIST, 'css');
const OUT_DIR = resolve(DIST, 'preview');

if (!existsSync(EMBEDS_DIR)) {
  console.error('[assemble-preview] _embeds not found — run extract-embeds first.');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

function kebab(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase();
}

/**
 * Reads a section embed's content. If extract-embeds.mjs split the section
 * into <base>-1.html, <base>-2.html, ... (over Webflow's paste limit), reads
 * and concatenates the parts in order instead — this mirrors what the page
 * looks like once all part-Embeds are pasted in sequence in Webflow.
 * Returns null if neither the single file nor any parts exist.
 *
 * A split section is wrapped in HTML comment markers naming the part file and
 * its char count. Concatenated output renders identically either way (comments
 * are inert), but the preview then shows exactly where one Webflow Embed ends
 * and the next begins — otherwise the boundaries are invisible here and the
 * only way to find them is to open dist/_embeds/ and count.
 */
function partBanner(text) {
  return `<!-- ${'='.repeat(6)} ${text} ${'='.repeat(6)} -->`;
}

function readEmbedContent(basePath) {
  if (existsSync(basePath)) return readFileSync(basePath, 'utf8');
  const base = basePath.replace(/\.html$/, '');
  const name = basePath.slice(basePath.replace(/\\/g, '/').lastIndexOf('/') + 1).replace(/\.html$/, '');
  const parts = [];
  let idx = 1;
  while (existsSync(`${base}-${idx}.html`)) {
    parts.push(readFileSync(`${base}-${idx}.html`, 'utf8'));
    idx++;
  }
  if (!parts.length) return null;

  const total = parts.length;
  return parts
    .map((part, i) => {
      const n = i + 1;
      const label = `WEBFLOW EMBED ${n} OF ${total} — ${name}-${n}.html — ${part.length.toLocaleString('en-US')} chars`;
      return [
        partBanner(`${label} — PASTE START`),
        part.replace(/\n$/, ''),
        partBanner(`END EMBED ${n} OF ${total}`),
      ].join('\n');
    })
    .join('\n');
}

/**
 * Inlines dist/css/<bundle>.css files as <style> blocks in preview head,
 * one per CSS import found in the page's Astro frontmatter.
 *
 * If a bundle has been split by build-css.mjs (over Webflow's ~50k paste
 * limit), emit one <style> block per part so the preview mirrors the exact
 * shape the user will paste into Webflow.
 */
function makeStyleBlock(filename, css) {
  const indented = css.trim().split('\n').map(line => line ? `    ${line}` : line).join('\n');
  if (filename === 'fonts.css') {
    return [
      '  <!-- ============================================================',
      '       PREVIEW-ONLY - DO NOT PASTE INTO WEBFLOW',
      '       Webflow injects Nohemi + Gilroy via its own shared.css',
      '       (Project Settings -> Fonts). The <style> block below is',
      '       for local dev + dist/preview only; /fonts/* paths 404 in prod.',
      '  ============================================================ -->',
      `  <style>\n${indented}\n  </style>`,
    ].join('\n');
  }
  return `  <!-- ${filename} -->\n  <style>\n${indented}\n  </style>`;
}

function buildCssStyleBlocks(cssImports) {
  const blocks = [];
  for (const filename of cssImports) {
    const base = filename.replace(/\.css$/, '');
    const part1 = join(CSS_DIR, `${base}-1.css`);
    const part2 = join(CSS_DIR, `${base}-2.css`);

    if (existsSync(part1) && existsSync(part2)) {
      blocks.push(makeStyleBlock(`${base}-1.css`, readFileSync(part1, 'utf8')));
      blocks.push(makeStyleBlock(`${base}-2.css`, readFileSync(part2, 'utf8')));
      continue;
    }

    const cssPath = join(CSS_DIR, filename);
    if (!existsSync(cssPath)) {
      console.warn(`[assemble-preview] CSS not found for inlining: ${cssPath}`);
      continue;
    }
    blocks.push(makeStyleBlock(filename, readFileSync(cssPath, 'utf8')));
  }
  return blocks.join('\n');
}

/**
 * DETAIL ROUTES — `src/pages/<folder>/[slug].astro`.
 *
 * These need their own assembly path and would otherwise get no preview at
 * all, which is exactly the trap they were: every other page in the repo
 * produces `dist/preview/<page>.html`, these two quietly did not, and nothing
 * in the build said so.
 *
 * Two reasons the section-based loop above cannot reach them:
 *   1. it only reads top-level `.astro` files in `src/pages/`, and these sit a
 *      directory down;
 *   2. they have no sections. The body is authored in the page itself, so
 *      there are no embeds to stitch back together.
 *
 * So the source here is the BUILT page rather than `dist/_embeds/*`. That is
 * also the honest source: for a detail route the rendered page IS the paste
 * unit, the same way a section's embed is.
 *
 * `sample` is the slug the preview is rendered from — the markup is identical
 * across every item in the collection and only the content differs. Each one
 * below is chosen to exercise the most of the design: the event sample is an
 * upcoming session with five speakers, so the Swiper carousel, the lime
 * Upcoming badge and the live Register button all appear. Pick a past
 * single-speaker event instead and the preview silently stops covering them.
 */
const DETAIL_ROUTES = [
  {
    name: 'event-detail',
    page: 'src/pages/events/[slug].astro',
    builtDir: 'events',
    sample: 'confidence-vs-control-ai-led-tax-compliance',
  },
  {
    name: 'blog-detail',
    page: 'src/pages/blog-listing/[slug].astro',
    builtDir: 'blog-listing',
    sample: 'uae-invoicing-readiness-list',
  },
];

function assembleDetailRoute(route) {
  const pagePath = join(ROOT, route.page);
  if (!existsSync(pagePath)) {
    console.warn(`[assemble-preview] detail route page missing: ${route.page}`);
    return false;
  }

  const builtRoot = join(DIST, route.builtDir);
  if (!existsSync(builtRoot)) {
    console.warn(`[assemble-preview] ${route.name}: nothing built at dist/${route.builtDir}`);
    return false;
  }

  // Fall back to whatever was built rather than failing, so renaming a slug
  // degrades the preview instead of removing it — but say so, because a
  // fallback may not exercise the same states as the chosen sample.
  let slug = route.sample;
  if (!existsSync(join(builtRoot, slug, 'index.html'))) {
    const dirs = readdirSync(builtRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    if (!dirs.length) {
      console.warn(`[assemble-preview] ${route.name}: no built pages under dist/${route.builtDir}`);
      return false;
    }
    console.warn(
      `[assemble-preview] ${route.name}: sample slug '${route.sample}' was not built — ` +
        `falling back to '${dirs[0]}'. Update DETAIL_ROUTES in this file.`
    );
    slug = dirs[0];
  }

  const html = readFileSync(join(builtRoot, slug, 'index.html'), 'utf8');
  const root = parseHtml(html);
  const head = root.querySelector('head');
  const body = root.querySelector('body');
  if (!head || !body) {
    console.warn(`[assemble-preview] ${route.name}: built page has no <head>/<body>`);
    return false;
  }

  /* THE WHOLE POINT OF THIS STEP. Astro inlines its own Vite-processed copy of
     the page's CSS imports into the built <head>. That is NOT what gets pasted
     into Webflow — the paste bundles are the Tailwind-CLI output in
     `public/css/`, built by a separate command with different `@source`
     resolution. Leaving Astro's version in would make the preview agree with
     `astro build` and disagree with Webflow, which is the one thing preview
     exists to catch. Strip it and inline the real bundles below.

     Only LOCAL stylesheets go: the Google Fonts <link> is also
     `rel="stylesheet"` and has to survive. */
  head.querySelectorAll('style').forEach((el) => el.remove());
  head.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
    if (!/^https?:/i.test(el.getAttribute('href') || '')) el.remove();
  });

  const frontmatter = readFileSync(pagePath, 'utf8').split('---')[1] ?? '';
  const cssImports = [];
  // One `..` deeper than a top-level page, hence `(?:\.\.\/)+`.
  const detailCssRegex = /import\s+['"](?:\.\.\/)+styles\/(?:\.build\/)?([a-z0-9-]+\.css)['"]/g;
  let m;
  while ((m = detailCssRegex.exec(frontmatter)) !== null) cssImports.push(m[1]);

  // The built head is minified onto one line; one node per line reads better
  // and is safer than splitting on '><', which would also cut inside any
  // attribute value that happens to contain it.
  const headBody = head.childNodes
    .map((n) => n.toString().trim())
    .filter(Boolean)
    .map((s) => `  ${s}`)
    .join('\n');

  // Preserved, not dropped: this page sets `bg-generic-00` on <body> to
  // override the Ledger White that shared.css gives every page. Without it the
  // preview renders on the wrong background.
  const bodyClass = body.getAttribute('class');

  const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Preview of ${route.page} rendered from /${route.builtDir}/${slug}/ -->
${headBody}
${buildCssStyleBlocks(cssImports)}
</head>
<${bodyClass ? `body class="${bodyClass}"` : 'body'}>
${body.innerHTML}
</body>
</html>`;

  writeFileSync(join(OUT_DIR, `${route.name}.html`), finalHtml, 'utf8');
  console.log(`[assemble-preview] Adding ${route.name} (detail route, from ${route.builtDir}/${slug})`);
  return true;
}

// index.astro is the local dev navigation page, not a Webflow page — it has no
// sections to assemble, so skip it rather than emitting an empty preview.
const SKIP_PAGES = new Set(['index.astro']);

const pages = readdirSync(PAGES_DIR)
  .filter(f => f.endsWith('.astro') && f !== 'embed' && !SKIP_PAGES.has(f));

for (const pageFile of pages) {
  const pageName = pageFile.replace(/\.astro$/, '');
  const pagePath = join(PAGES_DIR, pageFile);
  const content = readFileSync(pagePath, 'utf8');
  
  // 1. Separate frontmatter and template
  const parts = content.split('---');
  const frontmatter = parts.length > 2 ? parts[1] : '';
  const template = parts.length > 2 ? parts[2] : content;
  
  // 2. Parse CSS imports from frontmatter. Page astros may import either
  // '../styles/<name>.css' (entries with no _shared deps, e.g. shared, fonts)
  // or '../styles/.build/<name>.css' (auto-generated per-page entries that
  // pull in _shared @sources). Either way we want the bundle name to look
  // up in dist/css/<name>.css.
  const cssImports = [];
  const cssImportRegex = /import\s+['"]\.\.\/styles\/(?:\.build\/)?([a-z0-9-]+\.css)['"]/g;
  let cssMatch;
  while ((cssMatch = cssImportRegex.exec(frontmatter)) !== null) {
    cssImports.push(cssMatch[1]);
  }

  // 3. Build Component Map from imports.
  // Top-level folder under /sections/ = page bucket. Any intermediate
  // folders (e.g. v2) get flattened into the section kebab prefix, so
  // sections/v1-global/v2/NavbarGlobalV2.astro -> page=global, section=v2-navbar-global-v2.
  const componentMap = new Map();
  const importRegex = /import\s+([A-Z][a-zA-Z0-9]+)\s+from\s+['"](.+?)['"]/g;
  let importMatch;
  while ((importMatch = importRegex.exec(frontmatter)) !== null) {
    const name = importMatch[1];
    const compPath = importMatch[2];

    if (compPath.includes('/sections/')) {
      const pathParts = compPath.split('/');
      const sIdx = pathParts.indexOf('sections');
      if (sIdx !== -1 && sIdx < pathParts.length - 1) {
        const folder = pathParts[sIdx + 1];
        const nested = pathParts.slice(sIdx + 2, -1); // intermediate dirs between folder and file
        const stem = pathParts[pathParts.length - 1].replace(/\.astro$/, '');
        componentMap.set(name, { folder, nested, stem });
      }
    }
  }

  const root = parseHtml(template);
  const head = root.querySelector('head')?.innerHTML.trim() || '';

  let assembledHtml = '';

  // 4. Find and assemble components in order from template
  const componentRegex = /<([A-Z][a-zA-Z0-9]+)\b/g;
  let match;
  while ((match = componentRegex.exec(template)) !== null) {
    const componentName = match[1];
    const entry = componentMap.get(componentName);
    const baseKebab = entry && entry.stem ? kebab(entry.stem) : kebab(componentName);

    const pathsToTry = [];
    if (entry) {
      const prefixedKebab = entry.nested.length
        ? `${entry.nested.join('-')}-${baseKebab}`
        : baseKebab;
      pathsToTry.push(join(EMBEDS_DIR, entry.folder, `${prefixedKebab}.html`));
    }
    pathsToTry.push(join(EMBEDS_DIR, pageName, `${baseKebab}.html`));
    pathsToTry.push(join(EMBEDS_DIR, '_shared', `${baseKebab}.html`));

    let found = false;
    for (const p of pathsToTry) {
        const content = readEmbedContent(p);
        if (content !== null) {
            console.log(`[assemble-preview] Adding ${componentName} to ${pageName} (from ${p})`);
            assembledHtml += `<!-- Section: ${componentName} -->\n`;
            assembledHtml += content + '\n';
            found = true;
            break;
        }
    }

    if (!found) {
      console.warn(`[assemble-preview] Could not find embed for <${componentName}> (kebab: ${baseKebab}) in ${pageName}`);
    }
  }

  // 5. Extract non-link head content (title, meta, preconnect, google fonts).
  //    Strip Astro-only directives that leak from raw template (is:inline,
  //    is:global, is:raw, set:html, define:vars, client:* etc.) — harmless
  //    in browsers but ugly in preview/Webflow paste.
  const stripAstroDirectives = (s) =>
    s.replace(/\s+(?:is|set|define|client|server|transition):[a-z-]+(?:="[^"]*")?/g, '');
  // Source page astro indents head children by 8 spaces. Re-indent to 2
  // spaces uniformly so preview head matches the style-block indent.
  const reindentHead = (s) => s.replace(/^ {8}/gm, '  ');
  const headMinusLinks = reindentHead(stripAstroDirectives(head))
    .split('\n')
    .filter(line => !/rel="stylesheet"\s+href="\/css\//.test(line))
    .join('\n')
    .replace(/\s+$/, '');
  // First line lost its leading whitespace because head.innerHTML preserves
  // it relative to the parent — prepend 2 spaces if missing.
  const headBody = /^\s/.test(headMinusLinks) ? headMinusLinks : `  ${headMinusLinks}`;

  const styleBlocks = buildCssStyleBlocks(cssImports);

  const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${headBody}
${styleBlocks}
</head>
<body>
${assembledHtml}
</body>
</html>`;

  const outPath = join(OUT_DIR, `${pageName}.html`);
  writeFileSync(outPath, finalHtml, 'utf8');
}

let detailCount = 0;
for (const route of DETAIL_ROUTES) {
  if (assembleDetailRoute(route)) detailCount++;
}

console.log(
  `[assemble-preview] Done. wrote ${pages.length + detailCount} page(s) to ${OUT_DIR} ` +
    `(${pages.length} section-assembled, ${detailCount} detail route(s))`
);
