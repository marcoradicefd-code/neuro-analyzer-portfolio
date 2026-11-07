// Prova nel browser headless con il Chromium di Playwright ("Chrome for Testing"), MAI con il Chrome dell utente (channel "chrome").
// Variabili: PLAYWRIGHT_DIR = cartella del pacchetto playwright (default: "playwright" da node_modules);
//            CHROME_TEST_BIN = eseguibile di Chrome for Testing (default: quello installato da `npx playwright install chromium`).
// Uso: node <file> [indirizzo base, default http://localhost:4173]
const { chromium } = require(process.env.PLAYWRIGHT_DIR || 'playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:4173';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_TEST_BIN || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text() + ' @ ' + (m.location().url||'')); });
  const r1 = await page.goto(base + '/', { waitUntil: 'networkidle' });
  console.log('/ status', r1.status());
  await page.click('button:has-text("Carica due esempi")');
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => ({
    creative: document.body.innerText.match(/CREATIVITÀ\s*(\d+)/i)?.[1],
    gauges: ['Neuro Impact','Focus','Carico cognitivo','Chiarezza','Coinvolgimento','Memorabilità'].filter(t => document.body.innerText.toLowerCase().includes(t.toLowerCase())),
    store: document.documentElement.innerHTML.includes("Memoria del browser")
  }));
  console.log('dopo esempi', JSON.stringify(info));
  await page.click('a[href="/guida"] >> nth=0'); await page.waitForLoadState('networkidle');
  console.log('guida url', page.url(), await page.title());
  await page.click('a[href="/"]:has-text("Apri l\'app") >> nth=0'); await page.waitForLoadState('networkidle');
  console.log('ritorno url', page.url(), await page.title());
  console.log('errori', JSON.stringify(errs));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
