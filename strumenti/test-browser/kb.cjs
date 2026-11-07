// Prova nel browser headless con il Chromium di Playwright ("Chrome for Testing"), MAI con il Chrome dell utente (channel "chrome").
// Variabili: PLAYWRIGHT_DIR = cartella del pacchetto playwright (default: "playwright" da node_modules);
//            CHROME_TEST_BIN = eseguibile di Chrome for Testing (default: quello installato da `npx playwright install chromium`).
// Uso: node <file> [indirizzo base, default http://localhost:4173]
const { chromium } = require(process.env.PLAYWRIGHT_DIR || 'playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_TEST_BIN || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto((process.argv[2] || 'http://localhost:4173') + '/', { waitUntil: 'networkidle' });
  await p.click('button[data-act="sample"] >> nth=0'); await p.waitForTimeout(2500);
  await p.screenshot({ path: './tmp/labels-A.png', clip: { x: 288, y: 160, width: 784, height: 560 } });
  await p.click('[data-asset] >> nth=1'); await p.waitForTimeout(800);
  await p.screenshot({ path: './tmp/labels-B.png', clip: { x: 288, y: 160, width: 784, height: 560 } });
  await p.focus('[data-rtab="aree"]'); const seq = [];
  for (const k of ['ArrowRight','ArrowRight','ArrowRight','ArrowLeft','End','Home']) { await p.keyboard.press(k); seq.push(await p.evaluate(() => document.activeElement.dataset.rtab + (document.querySelector('#tMotore').hidden ? '' : '*'))); }
  const tabidx = await p.evaluate(() => [...document.querySelectorAll('.rtabs button')].map(b => b.tabIndex).join(','));
  console.log('frecce', seq.join(' > '), '| tabindex', tabidx, '| errori', JSON.stringify(errs));
  await b.close();
})();
