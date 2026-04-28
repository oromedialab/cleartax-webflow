#!/usr/bin/env node
/**
 * Tailwind v4 CSS bundles — one shared, one per page.
 * v4 reads config (theme tokens, content scope) from CSS via @theme / @source /
 * @config, so this script just runs the CLI once per input file. No per-target
 * config generation needed.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPLIT_LIMIT = 49000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TARGETS = [
  { name: 'shared', input: 'src/styles/shared.css' },
  { name: 'fonts',  input: 'src/styles/fonts.css' },
  { name: 'uae',    input: 'src/styles/uae.css' },
  { name: 'global', input: 'src/styles/global.css' },
];

const OUT_DIR = resolve(ROOT, 'public/css');
mkdirSync(OUT_DIR, { recursive: true });

const WATCH = process.argv.includes('--watch');
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
 * If a built bundle exceeds SPLIT_LIMIT, emit two parts (-1.css/-2.css) that
 * together preserve cascade. The combined <name>.css stays in place.
 *
 * Layout we expect from Tailwind v4 minified output:
 *   [banner][@layer properties{…}][@layer theme{…}][@layer utilities{…}][trailing custom CSS + @property]
 * Split happens inside @layer utilities at the first top-level rule boundary
 * past the midpoint. An explicit `@layer properties, theme, utilities;` order
 * declaration is prepended to both parts so cascade works regardless of which
 * Webflow field they land in.
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

  const marker = '@layer utilities{';
  const startIdx = css.indexOf(marker);
  if (startIdx === -1) {
    console.warn(`[css:${name}] over ${SPLIT_LIMIT} chars but no @layer utilities found — skipping split`);
    return;
  }
  const bodyStart = startIdx + marker.length;

  let depth = 1;
  let bodyEnd = -1;
  for (let i = bodyStart; i < css.length; i++) {
    const c = css[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { bodyEnd = i; break; }
    }
  }
  if (bodyEnd === -1) {
    console.warn(`[css:${name}] unmatched braces in @layer utilities — skipping split`);
    return;
  }

  const preamble = css.slice(0, startIdx);
  const utilsBody = css.slice(bodyStart, bodyEnd);
  const trailing = css.slice(bodyEnd + 1);

  const target = Math.floor(utilsBody.length / 2);
  let d = 0;
  let splitAt = -1;
  for (let i = 0; i < utilsBody.length; i++) {
    const c = utilsBody[i];
    if (c === '{') d++;
    else if (c === '}') {
      d--;
      if (d === 0 && i + 1 >= target) { splitAt = i + 1; break; }
    }
  }
  if (splitAt === -1) {
    console.warn(`[css:${name}] no clean rule boundary near midpoint — skipping split`);
    return;
  }

  const layerOrder = '@layer properties,theme,utilities;';
  const part1 = layerOrder + preamble + marker + utilsBody.slice(0, splitAt) + '}';
  const part2 = layerOrder + marker + utilsBody.slice(splitAt) + '}' + trailing;

  writeFileSync(partA, part1, 'utf8');
  writeFileSync(partB, part2, 'utf8');

  const kb = (n) => (n / 1024).toFixed(1);
  console.log(`[css:${name}] split: ${kb(css.length)} KB -> ${kb(part1.length)} KB + ${kb(part2.length)} KB`);
}

function runTailwind(target) {
  const out = resolve(OUT_DIR, `${target.name}.css`);
  const args = [
    '@tailwindcss/cli',
    '-i', resolve(ROOT, target.input),
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

if (WATCH) {
  console.log(`[css] watch mode (page=${PAGE}) — targets: ${ACTIVE.map(t => t.name).join(', ')}`);
  for (const target of ACTIVE) runTailwind(target);
} else {
  for (const target of TARGETS) await runTailwind(target);
  console.log('All CSS bundles built.');
}
