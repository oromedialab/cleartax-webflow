#!/usr/bin/env node
/**
 * Post-build step.
 *
 * Reads dist/embed-build/<page>/<section>/index.html produced by Astro's dynamic
 * embed route and writes the body's inner HTML to dist/_embeds/<page>/<section>.html
 * along with the section's own <style> block read directly from the source
 * .astro file. Astro's bundled per-route CSS is discarded entirely — it
 * contains every sibling section's styles and would blow past Webflow's
 * 50KB-per-Embed limit.
 *
 * Assumes every section's <style> is declared `<style is:global>`, i.e. no
 * scope hashing. Coder owns class-name uniqueness within a page.
 *
 * Fails if output contains page chrome (<html>, <head>, <!doctype>) or any
 * residual Astro scope markers.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync, unlinkSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml } from 'node-html-parser';
import * as csstree from 'css-tree';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const SRC_DIR = resolve(DIST, 'embed-build');
const OUT_DIR = resolve(DIST, '_embeds');
const SECTIONS_DIR = resolve(ROOT, 'src/sections');

// Webflow's Embed field caps a paste at ~50k chars. Mirrors SPLIT_LIMIT in
// build-css.mjs. Sections over this are auto-split into <section>-1.html,
// <section>-2.html, ... at safe boundaries (see splitHtml below).
const SPLIT_LIMIT = 49000;

if (!existsSync(SRC_DIR)) {
  console.error(`[extract-embeds] ${SRC_DIR} not found — run astro build first.`);
  process.exit(1);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const FORBIDDEN = /<html[\s>]|<\/html>|<head[\s>]|<\/head>|<!doctype|<body[\s>]|<\/body>/i;
const ASTRO_SCOPE_LEAK = /\bdata-astro-cid-|\bastro-[a-z0-9]{6,}\b/;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

function kebab(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase();
}

function titleWords(s) {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toUpperCase();
}

function walk(dir, predicate) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, predicate));
    else if (s.isFile() && predicate(name)) out.push(p);
  }
  return out;
}

// Build map: "<page>/<section>" -> source .astro path.
// Top-level folder under sections/ = page. Any intermediate folders (e.g. v2)
// flatten into the section kebab prefix so output stays one-file-per-section:
// sections/global/v2/NavbarGlobalV2.astro -> global/v2-navbar-global-v2.
const sourceMap = new Map();
for (const file of walk(SECTIONS_DIR, (n) => n.endsWith('.astro'))) {
  const rel = file.slice(SECTIONS_DIR.length + 1).replace(/\\/g, '/');
  const parts = rel.split('/');
  const stem = parts.pop().replace(/\.astro$/, '');
  const pageFolder = parts.shift();
  const nested = parts;
  const section = nested.length ? `${nested.join('-')}-${kebab(stem)}` : kebab(stem);
  sourceMap.set(`${pageFolder}/${section}`, { path: file, name: stem });
}

function minify(css) {
  try {
    return csstree.generate(csstree.parse(css));
  } catch (e) {
    console.warn(`[extract-embeds] css-tree parse failed, keeping raw: ${e.message}`);
    return css;
  }
}

/**
 * Walks raw HTML and returns every offset that falls strictly between
 * top-level constructs (tags, comments, <script>/<style> bodies) — i.e.
 * points where slicing the string never cuts through a tag, an attribute
 * value, a comment, or inline script/style content. Concatenating slices
 * taken at these offsets reproduces the original text byte-for-byte, which
 * is what lets a section be split across sibling Webflow Embed elements
 * without corrupting the DOM they render.
 */
function findSafeBoundaries(html) {
  const boundaries = [0];
  const n = html.length;
  let i = 0;
  while (i < n) {
    if (html[i] !== '<') { i++; continue; }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? n : end + 3;
      boundaries.push(i);
      continue;
    }
    const tagMatch = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(i));
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : null;
    let j = i + 1;
    let quote = null;
    while (j < n) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        j++;
        break;
      }
      j++;
    }
    if (tagName === 'script' || tagName === 'style') {
      const selfClosing = html.slice(i, j).trimEnd().endsWith('/>');
      if (!selfClosing) {
        const closeTag = `</${tagName}>`;
        const closeIdx = html.toLowerCase().indexOf(closeTag, j);
        j = closeIdx === -1 ? n : closeIdx + closeTag.length;
      }
    }
    i = j;
    boundaries.push(i);
  }
  if (boundaries[boundaries.length - 1] !== n) boundaries.push(n);
  return boundaries;
}

/** Greedily chunks html at safe boundaries, each chunk <= limit chars. */
function splitHtml(html, limit) {
  const boundaries = findSafeBoundaries(html);
  const parts = [];
  let start = 0;
  let bi = 0;
  while (start < html.length) {
    while (bi < boundaries.length && boundaries[bi] <= start) bi++;
    let chosen = -1;
    let k = bi;
    while (k < boundaries.length && boundaries[k] - start <= limit) {
      chosen = boundaries[k];
      k++;
    }
    if (chosen === -1) chosen = boundaries[bi] ?? html.length;
    parts.push(html.slice(start, chosen));
    start = chosen;
    bi = k;
  }
  return parts;
}

/**
 * Writes a section's combined HTML to outPath, splitting into
 * <base>-1.html, <base>-2.html, ... if it exceeds SPLIT_LIMIT. Clears stale
 * part files (or a stale single file) left over from a previous build shape.
 */
function writeSectionOutput(outPath, combined) {
  const base = outPath.replace(/\.html$/, '');

  let idx = 1;
  while (existsSync(`${base}-${idx}.html`)) {
    unlinkSync(`${base}-${idx}.html`);
    idx++;
  }

  if (combined.length <= SPLIT_LIMIT) {
    writeFileSync(outPath, combined + '\n', 'utf8');
    return [{ path: outPath, size: combined.length + 1 }];
  }

  if (existsSync(outPath)) unlinkSync(outPath);
  const parts = splitHtml(combined, SPLIT_LIMIT);
  return parts.map((part, i) => {
    const text = i === parts.length - 1 ? part + '\n' : part;
    const p = `${base}-${i + 1}.html`;
    writeFileSync(p, text, 'utf8');
    return { path: p, size: text.length };
  });
}

function readSectionStyles(sourcePath) {
  const src = readFileSync(sourcePath, 'utf8');
  const blocks = [];
  for (const m of src.matchAll(STYLE_BLOCK)) {
    const css = m[1].trim();
    if (css) blocks.push(`<style>${minify(css)}</style>`);
  }
  return blocks.join('');
}

const files = walk(SRC_DIR, (n) => n === 'index.html');
let errorCount = 0;

for (const file of files) {
  const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
  const parts = rel.split('/');
  parts.pop();
  if (parts.length < 2) continue;
  const page = parts[0];
  const section = parts[1];
  const key = `${page}/${section}`;

  const entry = sourceMap.get(key);
  if (!entry) {
    console.error(`[extract-embeds] no source .astro for ${key}`);
    errorCount++;
    continue;
  }
  const { path: sourcePath, name: sectionName } = entry;

  const html = readFileSync(file, 'utf8');
  const cleanHtml = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const root = parseHtml(cleanHtml);
  const body = root.querySelector('body');
  if (!body) {
    console.error(`[extract-embeds] no <body> in ${file}`);
    errorCount++;
    continue;
  }

  const bodyHtml = body.innerHTML.trim();
  const styleBlock = readSectionStyles(sourcePath);
  const title = titleWords(sectionName);
  const banner = `<!-----------------------------------------\n                   ${title}\n-------------------------------------------->`;
  const combined = [banner, styleBlock, bodyHtml].filter(Boolean).join('\n');

  if (FORBIDDEN.test(combined)) {
    console.error(`[extract-embeds] forbidden markup found in ${key}`);
    errorCount++;
    continue;
  }
  if (ASTRO_SCOPE_LEAK.test(combined)) {
    console.error(`[extract-embeds] residual Astro scope marker in ${key} — ensure <style is:global> on the section`);
    errorCount++;
    continue;
  }

  const outPath = join(OUT_DIR, page, `${section}.html`);
  mkdirSync(dirname(outPath), { recursive: true });
  const written = writeSectionOutput(outPath, combined);
  if (written.length > 1) {
    const kbs = written.map((w) => (w.size / 1024).toFixed(2)).join(' KB + ');
    console.log(`[extract-embeds] ${page}/${section} split into ${written.length} parts (${kbs} KB) — total ${(combined.length / 1024).toFixed(2)} KB`);
  } else {
    console.log(`[extract-embeds] ${page}/${section}.html (${(written[0].size / 1024).toFixed(2)} KB)`);
  }
}

if (errorCount > 0) {
  console.error(`[extract-embeds] ${errorCount} error(s)`);
  process.exit(1);
}
console.log(`[extract-embeds] wrote ${files.length} file(s) to ${OUT_DIR}`);
rmSync(SRC_DIR, { recursive: true, force: true });
console.log(`[extract-embeds] removed intermediate ${SRC_DIR}`);
