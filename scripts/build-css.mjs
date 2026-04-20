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
  { name: 'uae',    input: 'src/styles/uae.css' },
  { name: 'global', input: 'src/styles/global.css' },
];

const OUT_DIR = resolve(ROOT, 'public/css');
mkdirSync(OUT_DIR, { recursive: true });

function runTailwind(target) {
  const out = resolve(OUT_DIR, `${target.name}.css`);
  const args = [
    '@tailwindcss/cli',
    '-i', resolve(ROOT, target.input),
    '-o', out,
    '--minify',
  ];
  const child = spawn('npx', args, {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
    shell: true,
  });
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

for (const target of TARGETS) {
  await runTailwind(target);
}
console.log('All CSS bundles built.');
