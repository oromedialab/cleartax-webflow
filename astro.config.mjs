import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { PAGE_TARGETS, writeGeneratedEntry } from './scripts/css-entries.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Dev-only Vite plugin. Watches each page astro listed in PAGE_TARGETS and
 * regenerates the corresponding src/styles/.build/<name>.css when the page
 * frontmatter's _shared imports change. Without this, adding a new _shared
 * component to a page requires `npm run dev` restart for utilities to
 * compile. Production build runs the same generation via predev/prebuild
 * scripts in package.json.
 */
function autoSharedEntries() {
  const pageToTarget = new Map(
    PAGE_TARGETS.map((t) => [resolve(ROOT, t.page), t])
  );

  function regenFor(absPath) {
    const target = pageToTarget.get(absPath);
    if (!target) return;
    try {
      const { sources, changed } = writeGeneratedEntry(target, ROOT);
      if (changed) {
        console.log(`[css:${target.name}] regenerated entry (_shared: ${sources.join(', ') || 'none'})`);
      }
    } catch (err) {
      console.error(`[css:${target.name}] regen failed:`, err.message);
    }
  }

  return {
    name: 'cleartax-auto-shared-entries',
    apply: 'serve',
    configureServer(server) {
      // Tell Vite to watch the page astro files explicitly. They're inside
      // src/ which Vite already watches, but `add` is idempotent and makes
      // the dependency explicit.
      for (const t of PAGE_TARGETS) {
        server.watcher.add(resolve(ROOT, t.page));
      }
      server.watcher.on('change', regenFor);
    },
  };
}

export default defineConfig({
  integrations: [react()],
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar', 'fr'],
  },
  devToolbar: { enabled: false },
  // Every section uses <style is:global> — no scope hashes in output.
  // Coder owns class-name uniqueness across sections sharing a page.
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [autoSharedEntries(), tailwindcss()],
    // Dev only. The blog API's dev host sends no CORS header for localhost, so
    // blog-listing's scripts call `/blog-api/...` here and Vite forwards it
    // server-side (VPN required). Ignored by `astro build`.
    server: {
      proxy: {
        '/blog-api': {
          target: 'https://wg-finfo-cleartax-com-b2c-mum-dev-http.internal.cleartax.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/blog-api/, '/f/content_management/blog'),
        },
      },
    },
  },
});
