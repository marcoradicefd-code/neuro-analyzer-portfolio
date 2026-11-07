// Prova nel browser headless con il Chromium di Playwright ("Chrome for Testing"), MAI con il Chrome dell utente (channel "chrome").
// Variabili: PLAYWRIGHT_DIR = cartella del pacchetto playwright (default: "playwright" da node_modules);
//            CHROME_TEST_BIN = eseguibile di Chrome for Testing (default: quello installato da `npx playwright install chromium`).
// Uso: node <file> [indirizzo base, default http://localhost:4173]
const { chromium } = require(process.env.PLAYWRIGHT_DIR || 'playwright');
(async () => { const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_TEST_BIN || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto((process.argv[2] || 'http://localhost:4173') + '/', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => /UNISAL/.test(document.querySelector('#status').textContent), null, { timeout: 60000 });
  console.log('prima apertura:', await p.evaluate(() => document.querySelector('#status').innerText));
  await p.click('button[data-act="sample"] >> nth=0'); await p.waitForTimeout(3000);
  for (const i of [0, 1]) { await p.click('[data-asset] >> nth=' + i); await p.waitForTimeout(600);
    console.log('esempio', i ? 'B' : 'A', await p.evaluate(() => document.querySelector('.cluster').innerText.replace(/\s+/g, ' ').slice(0, 150))) }
  await p.screenshot({ path: './tmp/primo_avvio.png', clip: { x: 288, y: 64, width: 784, height: 836 } });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  console.log('riapertura:', await p.evaluate(() => document.querySelector('#status').innerText));
  await p.click('[data-rtab="motore"]'); await p.click('#catList [data-act="catRemove"][data-id="unisal"]'); await p.click('#catList [data-act="catRemove"][data-id="unisal"]'); await p.waitForTimeout(1500);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
  console.log('dopo rimozione e riapertura:', await p.evaluate(() => document.querySelector('#status').innerText), '(non deve reinstallare)');
  console.log('errori', JSON.stringify(errs)); await b.close() })().catch(e => { console.error('FALLITO', e.message); process.exit(1) });
