// Prova nel browser headless con il Chromium di Playwright ("Chrome for Testing"), MAI con il Chrome dell utente (channel "chrome").
// Variabili: PLAYWRIGHT_DIR = cartella del pacchetto playwright (default: "playwright" da node_modules);
//            CHROME_TEST_BIN = eseguibile di Chrome for Testing (default: quello installato da `npx playwright install chromium`).
// Uso: node <file> [indirizzo base, default http://localhost:4173]
const { chromium } = require(process.env.PLAYWRIGHT_DIR || 'playwright');
const out = process.argv[3] || './tmp', base = process.argv[2] || 'http://localhost:4173'; require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_TEST_BIN || undefined });
  const results = {};
  for (const [vw, vh] of [[1440, 900], [1200, 800], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    const shot = async n => page.screenshot({ path: out + '/' + vw + '-' + n + '.png', fullPage: vw < 800 });
    await shot('01-hero');
    await page.click('button[data-act="sample"] >> nth=0'); await page.waitForTimeout(2500);
    await shot('02-analisi');
    await page.click('[data-rtab="consigli"]'); await page.waitForTimeout(300); await shot('03-consigli');
    await page.click('[data-rtab="motore"]'); await page.waitForTimeout(300); await shot('04-motore');
    await page.click('[data-view="confronto"]'); await page.waitForTimeout(1200); await shot('05-confronto');
    await page.click('[data-view="report"]'); await page.waitForTimeout(1200); await shot('06-report');
    await page.click('[data-view="analisi"]'); await page.waitForTimeout(300);
    if (vw === 1440) {
      await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js' });
      results.axe = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: ['wcag2a','wcag2aa','best-practice'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, ex: v.nodes.slice(0,3).map(n => n.target.join(' ') + ' :: ' + (n.any[0]?.message || n.failureSummary || '').slice(0,160)) })); });
      results.small = await page.evaluate(() => { const r = []; document.querySelectorAll('button, a, input, select, [role=tab]').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && b.height && (b.height < 32 || b.width < 32) && getComputedStyle(el).visibility !== 'hidden') r.push((el.textContent.trim() || el.getAttribute('aria-label') || el.id || el.tagName).slice(0,30) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)); }); return r; });
      results.fonts = await page.evaluate(() => { const m = {}; document.querySelectorAll('body *').forEach(el => { if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) m[fs] = (m[fs] || 0) + 1; }); return m; });
    }
    results['errs' + vw] = errs;
    await ctx.close();
  }
  const g = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const gp = await g.newPage();
  await gp.goto(base + '/guida', { waitUntil: 'networkidle' }); await gp.screenshot({ path: out + '/1440-07-guida.png' });
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } }); const mp = await m.newPage();
  await mp.goto(base + '/guida', { waitUntil: 'networkidle' }); await mp.screenshot({ path: out + '/390-07-guida.png' });
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
