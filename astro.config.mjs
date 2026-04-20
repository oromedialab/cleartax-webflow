import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar', 'fr'],
  },
  devToolbar: { enabled: false },
  // Force all component-scoped styles to be inlined in <style> tags within the
  // rendered HTML. extract-embeds.mjs relies on this so the pasted Webflow
  // embed carries its own styles and does not depend on any /_astro/*.css file.
  build: {
    inlineStylesheets: 'always',
  },
});
