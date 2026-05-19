#!/usr/bin/env node
/**
 * Tailwind v4 CSS bundles — one shared, one per page.
 *
 * Per-page bundles auto-inject `@source` directives for the `_shared/*`
 * components the page imports, by parsing the page .astro frontmatter.
 * Generated entries land in `src/styles/.build/` (gitignored) so the original
 * entry CSS files stay free of hand-maintained source lists.
 *
 * `shared.css` is a tokens + reset + helpers bundle with no Tailwind utility
 * compilation; it runs through the CLI unchanged.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_TARGETS, writeGeneratedEntry } from './css-entries.mjs';

const SPLIT_LIMIT = 49000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Full target list = non-page (shared, fonts) + page targets (imported from
 * css-entries.mjs so the Vite dev plugin in astro.config.mjs sees the same
 * list).
 */
const TARGETS = [
  { name: 'shared', input: 'src/styles/shared.css' },
  { name: 'fonts',  input: 'src/styles/fonts.css' },
  ...PAGE_TARGETS,
];

const OUT_DIR = resolve(ROOT, 'public/css');
const BUILD_ENTRY_DIR = resolve(ROOT, 'src/styles/.build');
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(BUILD_ENTRY_DIR, { recursive: true });

const WATCH = process.argv.includes('--watch');
const GEN_ONLY = process.argv.includes('--gen-only');
const PAGE = process.argv.find((a) => a.startsWith('--page='))?.split('=')[1] || 'all';

const ACTIVE = WATCH && PAGE !== 'all'
  ? TARGETS.filter((t) => t.name === 'shared' || t.name === 'fonts' || t.name === PAGE)
  : TARGETS;

if (WATCH && PAGE !== 'all' && ACTIVE.length === 1) {
  console.error(`[css] unknown page "${PAGE}". Valid: ${TARGETS.filter(t => t.name !== 'shared').map(t => t.name).join(', ')}`);
  process.exit(1);
}

/**
 * Webflow page custom-code field caps each <style> paste at ~50k chars.
 * If a built bundle exceeds SPLIT_LIMIT, emit two parts (-1.css/-2.css)
 * by slicing at the first top-level rule boundary past the file midpoint.
 *
 * Both parts are valid standalone CSS — utilities are emitted unlayered
 * so cascade is purely "later in document wins", and the user pastes both
 * parts in order on the same Webflow page.
 */
function splitIfOverLimit(outPath, name) {
  const partA = outPath.replace(/\.css$/, '-1.css');
  const partB = outPath.replace(/\.css$/, '-2.css');
  const css = readFileSync(outPath, 'utf8');

  if (css.length <= SPLIT_LIMIT) {
    if (existsSync(partA)) unlinkSync(partA);
    if (existsSync(partB)) unlinkSync(partB);
    return;
  }

  const target = Math.floor(css.length / 2);
  let depth = 0;
  let splitAt = -1;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0 && i + 1 >= target) { splitAt = i + 1; break; }
    }
  }
  if (splitAt === -1) {
    console.warn(`[css:${name}] no clean top-level rule boundary near midpoint — skipping split`);
    return;
  }

  const part1 = css.slice(0, splitAt);
  const part2 = css.slice(splitAt);

  writeFileSync(partA, part1, 'utf8');
  writeFileSync(partB, part2, 'utf8');

  const kb = (n) => (n / 1024).toFixed(1);
  console.log(`[css:${name}] split: ${kb(css.length)} KB -> ${kb(part1.length)} KB + ${kb(part2.length)} KB`);
}

function runTailwind(target) {
  const out = resolve(OUT_DIR, `${target.name}.css`);

  let inputPath;
  if (target.page) {
    const { entryPath, sources } = writeGeneratedEntry(target, ROOT);
    inputPath = entryPath;
    console.log(`[css:${target.name}] _shared sources: ${sources.join(', ') || '(none)'}`);
  } else {
    inputPath = resolve(ROOT, target.input);
  }

  const args = [
    '@tailwindcss/cli',
    '-i', inputPath,
    '-o', out,
  ];
  if (WATCH) args.push('-w');
  else args.push('--minify');

  const child = spawn('npx', args, {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
    shell: true,
  });

  if (WATCH) {
    console.log(`[css:${target.name}] watching -> ${out}`);
    child.on('exit', (code) => {
      console.log(`[css:${target.name}] watcher exited (code ${code})`);
    });
    return;
  }

  return new Promise((res, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`[css:${target.name}] built -> ${out}`);
        splitIfOverLimit(out, target.name);
        res();
      } else {
        reject(new Error(`[css:${target.name}] exited with code ${code}`));
      }
    });
  });
}

if (GEN_ONLY) {
  for (const target of TARGETS) {
    if (target.page) {
      const { sources } = writeGeneratedEntry(target, ROOT);
      console.log(`[css:${target.name}] gen-only entry written (_shared: ${sources.join(', ') || 'none'})`);
    }
  }
  console.log('Generated entry CSS files written. Skipping Tailwind compile.');
} else if (WATCH) {
  console.log(`[css] watch mode (page=${PAGE}) — targets: ${ACTIVE.map(t => t.name).join(', ')}`);
  for (const target of ACTIVE) runTailwind(target);
} else {
  for (const target of TARGETS) await runTailwind(target);
  console.log('All CSS bundles built.');
}
