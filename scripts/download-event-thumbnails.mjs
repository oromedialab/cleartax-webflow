/**
 * Downloads every Google Drive thumbnail used by src/data/events.ts into
 * webflow-import/thumbnails/<slug>.<ext>, ready to drag into Webflow Assets.
 *
 *   npm run download:event-thumbnails
 *
 * Workflow: sync events -> run this -> upload the folder to Webflow Assets ->
 * paste each file's CDN URL into the sheet's "Thumbnail (16:9)" cell -> sync
 * again. CDN URLs pass through the sync untouched.
 *
 * Uses curl rather than fetch: curl honours the system proxy, Node's fetch
 * does not, so this also works where Node cannot resolve Drive.
 */
import { readFile, mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SRC = new URL('../src/data/events.ts', import.meta.url);
const OUT = new URL('../webflow-import/thumbnails/', import.meta.url);

const src = await readFile(SRC, 'utf8');
// Each event block has `slug:` followed (later) by `image:`; pair them in order.
const jobs = [];
let slug = null;
for (const line of src.split('\n')) {
  const s = line.match(/^ {4}slug: '([^']+)'/);
  if (s) slug = s[1];
  const i = line.match(/^ {4}image: '(https:\/\/drive\.google\.com\/[^']+)'/);
  if (i && slug) { jobs.push({ slug, url: i[1] }); slug = null; }
}
if (!jobs.length) { console.log('No Drive thumbnails in events.ts — nothing to download.'); process.exit(0); }

const extOf = (b) =>
  b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png'
  : b[0] === 0xff && b[1] === 0xd8 ? 'jpg'
  : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp'
  : null;

await mkdir(OUT, { recursive: true });
let ok = 0;
const failed = [];
for (const { slug, url } of jobs) {
  try {
    const { stdout } = await run('curl', ['-sSL', '--fail', '--max-time', '60', url], { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 });
    const ext = extOf(stdout);
    // A Drive error/login page is HTML, not an image: refuse to save it.
    if (!ext) throw new Error('not an image (file not shared "anyone with the link"?)');
    for (const old of await readdir(OUT)) if (old.startsWith(`${slug}.`)) await unlink(new URL(old, OUT));
    await writeFile(new URL(`${slug}.${ext}`, OUT), stdout);
    console.log(`ok   ${slug}.${ext} (${(stdout.length / 1024).toFixed(0)} KB)`);
    ok++;
  } catch (e) {
    failed.push(slug);
    console.warn(`FAIL ${slug}: ${String(e.message).split('\n')[0]}`);
  }
}
console.log(`\n${ok}/${jobs.length} downloaded to webflow-import/thumbnails/`);
if (failed.length) process.exit(1);
