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
 * Inlines dist/css/<bundle>.css files as <style> blocks in preview head,
 * one per CSS import found in the page's Astro frontmatter.
 */
function buildCssStyleBlocks(cssImports) {
  const blocks = [];
  for (const filename of cssImports) {
    const cssPath = join(CSS_DIR, filename);
    if (!existsSync(cssPath)) {
      console.warn(`[assemble-preview] CSS not found for inlining: ${cssPath}`);
      continue;
    }
    const css = readFileSync(cssPath, 'utf8').trim();
    const indented = css.split('\n').map(line => line ? `    ${line}` : line).join('\n');
    if (filename === 'fonts.css') {
      blocks.push([
        '  <!-- ============================================================',
        '       PREVIEW-ONLY - DO NOT PASTE INTO WEBFLOW',
        '       Webflow injects Nohemi + Gilroy via its own shared.css',
        '       (Project Settings -> Fonts). The <style> block below is',
        '       for local dev + dist/preview only; /fonts/* paths 404 in prod.',
        '  ============================================================ -->',
        `  <style>\n${indented}\n  </style>`,
      ].join('\n'));
    } else {
      blocks.push(`  <!-- ${filename} -->\n  <style>\n${indented}\n  </style>`);
    }
  }
  return blocks.join('\n');
}

const pages = readdirSync(PAGES_DIR).filter(f => f.endsWith('.astro') && f !== 'embed');

for (const pageFile of pages) {
  const pageName = pageFile.replace(/\.astro$/, '');
  const pagePath = join(PAGES_DIR, pageFile);
  const content = readFileSync(pagePath, 'utf8');
  
  // 1. Separate frontmatter and template
  const parts = content.split('---');
  const frontmatter = parts.length > 2 ? parts[1] : '';
  const template = parts.length > 2 ? parts[2] : content;
  
  // 2. Parse CSS imports from frontmatter (e.g. import '../styles/global.css')
  const cssImports = [];
  const cssImportRegex = /import\s+['"]\.\.\/styles\/([a-z0-9-]+\.css)['"]/g;
  let cssMatch;
  while ((cssMatch = cssImportRegex.exec(frontmatter)) !== null) {
    cssImports.push(cssMatch[1]);
  }

  // 3. Build Component Map from imports.
  // Top-level folder under /sections/ = page bucket. Any intermediate
  // folders (e.g. v2) get flattened into the section kebab prefix, so
  // sections/global/v2/NavbarGlobalV2.astro -> page=global, section=v2-navbar-global-v2.
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
        componentMap.set(name, { folder, nested });
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
    const baseKebab = kebab(componentName);

    const entry = componentMap.get(componentName);
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
        if (existsSync(p)) {
            console.log(`[assemble-preview] Adding ${componentName} to ${pageName} (from ${p})`);
            assembledHtml += `<!-- Section: ${componentName} -->\n`;
            assembledHtml += readFileSync(p, 'utf8') + '\n';
            found = true;
            break;
        }
    }

    if (!found) {
      console.warn(`[assemble-preview] Could not find embed for <${componentName}> (kebab: ${baseKebab}) in ${pageName}`);
    }
  }

  // 5. Extract non-link head content (title, meta, preconnect, google fonts).
  const headMinusLinks = head
    .split('\n')
    .filter(line => !/rel="stylesheet"\s+href="\/css\//.test(line))
    .join('\n')
    .trim();

  const styleBlocks = buildCssStyleBlocks(cssImports);

  const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${headMinusLinks}
${styleBlocks}
</head>
<body>
${assembledHtml}
</body>
</html>`;

  const outPath = join(OUT_DIR, `${pageName}.html`);
  writeFileSync(outPath, finalHtml, 'utf8');
}

console.log(`[assemble-preview] Done. wrote ${pages.length} page(s) to ${OUT_DIR}`);
