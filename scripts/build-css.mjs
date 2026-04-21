#!/usr/bin/env node
/**
 * Tailwind v4 CSS bundles — one shared, one per page.
 * v4 reads config (theme tokens, content scope) from CSS via @theme / @source /
 * @config, so this script just runs the CLI once per input file. No per-target
 * config generation needed.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
