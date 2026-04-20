#!/usr/bin/env node
/**
 * Assembles full-page previews from extracted embeds.
 * Uses frontmatter imports to find the correct folder for each component.
 * Outputs to dist/confirmation/<page>.html.
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
const OUT_DIR = resolve(DIST, 'confirmation');

if (!existsSync(EMBEDS_DIR)) {
  console.error('[assemble-confirmations] _embeds not found — run extract-embeds first.');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

function kebab(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase();
}

/**
 * Normalizes head metadata for confirmation pages.
 */
function normalizeHead(head) {
  // Use relative paths for CSS so confirm pages work via file://
  return head.replace(/href="\/css\//g, 'href="../css/');
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
  
  // 2. Build Component Map from imports
  // Example: import HeroGlobal from '../sections/global/HeroGlobal.astro';
  const componentMap = new Map();
  const importRegex = /import\s+([A-Z][a-zA-Z0-9]+)\s+from\s+['"](.+?)['"]/g;
  let importMatch;
  while ((importMatch = importRegex.exec(frontmatter)) !== null) {
    const name = importMatch[1];
    const compPath = importMatch[2];
    
    if (compPath.includes('/sections/')) {
      const pathParts = compPath.split('/');
      // Expected: ['..', 'sections', 'folder', 'Component.astro']
      const sIdx = pathParts.indexOf('sections');
      if (sIdx !== -1 && sIdx < pathParts.length - 1) {
        componentMap.set(name, pathParts[sIdx + 1]);
      }
    }
  }

  const root = parseHtml(template);
  const head = root.querySelector('head')?.innerHTML.trim() || '';
  
  let assembledHtml = '';
  
  // 3. Find and assemble components in order from template
  const componentRegex = /<([A-Z][a-zA-Z0-9]+)\b/g;
  let match;
  while ((match = componentRegex.exec(template)) !== null) {
    const componentName = match[1];
    const componentKebab = kebab(componentName);
    
    // Determine folder from import map or fall back to pageName or _shared
    const folder = componentMap.get(componentName);
    let pathsToTry = [];
    if (folder) pathsToTry.push(join(EMBEDS_DIR, folder, `${componentKebab}.html`));
    pathsToTry.push(join(EMBEDS_DIR, pageName, `${componentKebab}.html`));
    pathsToTry.push(join(EMBEDS_DIR, '_shared', `${componentKebab}.html`));

    let found = false;
    for (const p of pathsToTry) {
        if (existsSync(p)) {
            console.log(`[assemble-confirmations] Adding ${componentName} to ${pageName} (from ${p.includes('_shared') ? '_shared' : folder || pageName})`);
            assembledHtml += `<!-- Section: ${componentName} -->\n`;
            assembledHtml += readFileSync(p, 'utf8') + '\n';
            found = true;
            break;
        }
    }

    if (!found) {
      console.warn(`[assemble-confirmations] Could not find embed for <${componentName}> (kebab: ${componentKebab}) in ${pageName}`);
    }
  }

  const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${normalizeHead(head)}
</head>
<body>
${assembledHtml}
</body>
</html>`;

  const outPath = join(OUT_DIR, `${pageName}.html`);
  writeFileSync(outPath, finalHtml, 'utf8');
}

console.log(`[assemble-confirmations] Done. wrote ${pages.length} page(s) to ${OUT_DIR}`);
