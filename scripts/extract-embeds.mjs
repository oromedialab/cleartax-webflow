#!/usr/bin/env node
/**
 * Post-build step.
 *
 * Reads dist/embed/<page>/<section>/index.html produced by Astro's dynamic
 * embed route and writes the body's inner HTML to dist/_embeds/<page>/<section>.html
 * along with ONLY the inlined <style> CSS rules that target this section's
 * own data-astro-cid attributes — discarding sibling sections' CSS that
 * Astro would otherwise bundle into the same page.
 *
 * Without this filtering each embed inlines every sibling section's styles
 * and quickly blows past Webflow's 50KB-per-Embed limit.
 *
 * Fails if the output still contains page chrome (<html>, <head>, <!doctype>).
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

if (!existsSync(SRC_DIR)) {
  console.error(`[extract-embeds] ${SRC_DIR} not found — run astro build first.`);
  process.exit(1);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const FORBIDDEN = /<html[\s>]|<\/html>|<head[\s>]|<\/head>|<!doctype|<body[\s>]|<\/body>/i;
const CID_ATTR = /data-astro-cid-([a-z0-9]+)/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (s.isFile() && name === 'index.html') out.push(p);
  }
  return out;
}

/**
 * Filter bundled Astro CSS down to rules that reference at least one of the
 * section's own component cids. Always keeps @keyframes (used by animations
 * referenced from filtered rules), font-faces, and CSS custom property defs.
 */
function filterCssToCids(css, cids) {
  if (!css.trim()) return '';
  const cidSet = new Set(cids);
  const ast = csstree.parse(css);

  csstree.walk(ast, {
    visit: 'Rule',
    enter(node, item, list) {
      if (!list) return;
      const selectorList = node.prelude;
      if (!selectorList || selectorList.type !== 'SelectorList') return;

      // Keep only selectors that reference one of our cids.
      const kept = [];
      csstree.walk(selectorList, {
        visit: 'Selector',
        enter(sel) {
          let hit = false;
          csstree.walk(sel, {
            visit: 'AttributeSelector',
            enter(attr) {
              if (!attr.name || !attr.name.name) return;
              const m = /^data-astro-cid-([a-z0-9]+)$/.exec(attr.name.name);
              if (m && cidSet.has(m[1])) hit = true;
            },
          });
          if (hit) kept.push(sel);
        },
      });

      if (kept.length === 0) {
        list.remove(item);
        return;
      }
      // Replace selectorList children with the kept selectors.
      selectorList.children = new csstree.List().fromArray(kept);
    },
  });

  // Drop empty @media / @supports wrappers left behind.
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node, item, list) {
      if (!list) return;
      if (!node.block) return;
      if (node.name === 'keyframes' || node.name === '-webkit-keyframes' || node.name === 'font-face') return;
      const hasChildren = node.block.children && node.block.children.first;
      if (!hasChildren) list.remove(item);
    },
  });

  return csstree.generate(ast);
}

const files = walk(SRC_DIR);
let errorCount = 0;

for (const file of files) {
  const rel = file.slice(SRC_DIR.length + 1);
  const parts = rel.split('/');
  parts.pop();
  if (parts.length < 2) continue;
  const page = parts[0];
  const section = parts[1];

  const html = readFileSync(file, 'utf8');
  const root = parseHtml(html);
  const body = root.querySelector('body');
  if (!body) {
    console.error(`[extract-embeds] no <body> in ${file}`);
    errorCount++;
    continue;
  }

  // Discover this section's own cids by scanning the body markup.
  const bodyHtml = body.innerHTML.trim();
  const cids = new Set();
  for (const m of bodyHtml.matchAll(CID_ATTR)) cids.add(m[1]);

  // Pull <style> blocks from <head>, filter each, drop preview <link> tags.
  const head = root.querySelector('head');
  const styleBlocks = [];
  if (head) {
    for (const el of head.querySelectorAll('style')) {
      const raw = el.text || el.innerHTML || '';
      const filtered = cids.size > 0 ? filterCssToCids(raw, [...cids]) : raw;
      if (filtered.trim()) styleBlocks.push(`<style>${filtered}</style>`);
    }
  }

  const combined = [...styleBlocks, bodyHtml].filter(Boolean).join('\n');

  if (FORBIDDEN.test(combined)) {
    console.error(`[extract-embeds] forbidden markup found in ${page}/${section}`);
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
