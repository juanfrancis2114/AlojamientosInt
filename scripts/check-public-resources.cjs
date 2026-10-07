const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const failures = [];
    page.on('response', response => {
      if (response.status() >= 400) failures.push({ path: new URL(response.url()).pathname, status: response.status() });
    });
    page.on('pageerror', error => failures.push({ error: error.message }));
    await page.goto('https://booking-prototipo-alojamientos.vercel.app');
    await page.waitForLoadState('networkidle');
    const favicon = await page.request.get('https://booking-prototipo-alojamientos.vercel.app/favicon.ico');
    console.log(JSON.stringify({ failures, favicon: favicon.status() }));
    if (process.argv.includes('--expect-clean')) {
      assert.deepEqual(failures, []);
      assert.equal(favicon.status(), 200);
      console.log('OK Página pública sin solicitudes 401/404 ni errores JavaScript');
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
