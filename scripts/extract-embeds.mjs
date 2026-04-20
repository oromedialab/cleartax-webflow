#!/usr/bin/env node
/**
 * Post-build step.
 *
 * Reads dist/embed/<page>/<section>/index.html produced by Astro's dynamic
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
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml } from 'node-html-parser';
import * as csstree from 'css-tree';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const SRC_DIR = resolve(DIST, 'embed');
const OUT_DIR = resolve(DIST, '_embeds');
const SECTIONS_DIR = resolve(ROOT, 'src/sections');

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
const sourceMap = new Map();
for (const file of walk(SECTIONS_DIR, (n) => n.endsWith('.astro'))) {
  const rel = file.slice(SECTIONS_DIR.length + 1);
  const parts = rel.split('/');
  const fileName = parts.pop().replace(/\.astro$/, '');
  const pageFolder = parts.pop();
  sourceMap.set(`${pageFolder}/${kebab(fileName)}`, file);
}

function minify(css) {
  try {
    return csstree.generate(csstree.parse(css));
  } catch (e) {
    console.warn(`[extract-embeds] css-tree parse failed, keeping raw: ${e.message}`);
    return css;
  }
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
  const rel = file.slice(SRC_DIR.length + 1);
  const parts = rel.split('/');
  parts.pop();
  if (parts.length < 2) continue;
  const page = parts[0];
  const section = parts[1];
  const key = `${page}/${section}`;

  const sourcePath = sourceMap.get(key);
  if (!sourcePath) {
    console.error(`[extract-embeds] no source .astro for ${key}`);
    errorCount++;
    continue;
  }

  const html = readFileSync(file, 'utf8');
  const root = parseHtml(html);
  const body = root.querySelector('body');
  if (!body) {
    console.error(`[extract-embeds] no <body> in ${file}`);
    errorCount++;
    continue;
  }

  const bodyHtml = body.innerHTML.trim();
  const styleBlock = readSectionStyles(sourcePath);
  const combined = [styleBlock, bodyHtml].filter(Boolean).join('\n');

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
  writeFileSync(outPath, combined + '\n', 'utf8');
  const sizeKb = (combined.length / 1024).toFixed(2);
  console.log(`[extract-embeds] ${page}/${section}.html (${sizeKb} KB)`);
}

if (errorCount > 0) {
  console.error(`[extract-embeds] ${errorCount} error(s)`);
  process.exit(1);
}
console.log(`[extract-embeds] wrote ${files.length} file(s) to ${OUT_DIR}`);
