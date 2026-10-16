import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.addInitScript(() => {
  window.addEventListener('unhandledrejection', (e) => {
    console.error('unhandledrejection: ' + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
  });
  window.addEventListener('error', (e) => {
    console.error('windowerror: ' + (e.error && e.error.stack ? e.error.stack : e.message));
  });
});

await page.goto('http://localhost:4321/about-us', { waitUntil: 'load' });

const box = page.locator('.au-presence-globe').first();
await box.scrollIntoViewIfNeeded();

await page.waitForTimeout(300);
const beforeState = await box.evaluate((el) => ({
  posterHidden: el.querySelector('.au-presence-globe-poster')?.classList.contains('au-presence-globe-hidden'),
  stageVisible: el.querySelector('.au-presence-globe-stage')?.classList.contains('au-presence-globe-visible'),
}));
await box.screenshot({ path: '__globe-before.png' });

try {
  await page.waitForFunction(() => {
    const el = document.querySelector('.au-presence-globe-stage');
    return el && el.classList.contains('au-presence-globe-visible') && el.querySelector('canvas');
  }, undefined, { timeout: 15000 });
} catch (e) {
  console.log('TIMEOUT waiting for globe to mount:', e.message);
}

await page.waitForTimeout(500);
const afterState = await box.evaluate((el) => ({
  posterHidden: el.querySelector('.au-presence-globe-poster')?.classList.contains('au-presence-globe-hidden'),
  stageVisible: el.querySelector('.au-presence-globe-stage')?.classList.contains('au-presence-globe-visible'),
  hasCanvas: !!el.querySelector('canvas'),
  canvasSize: (() => {
    const c = el.querySelector('canvas');
    return c ? { w: c.width, h: c.height, cssW: c.style.width, cssH: c.style.height } : null;
  })(),
  tagCount: el.querySelectorAll('.au-presence-globe-tag-wrapper').length,
  visibleTagCount: el.querySelectorAll('.au-presence-globe-tag-wrapper.au-presence-globe-visible').length,
}));
await box.screenshot({ path: '__globe-after.png' });

console.log('BEFORE:', JSON.stringify(beforeState));
console.log('AFTER:', JSON.stringify(afterState));
console.log('CONSOLE ERRORS:', errors.length ? errors : 'none');

await browser.close();
