# Prove nel browser

Le prove girano in un browser headless con Playwright, **sempre con Chrome for Testing**, mai con il Chrome dell'utente: niente `channel: 'chrome'`.

## Preparazione (una volta)

```bash
npx playwright install chromium      # scarica Chrome for Testing in ~/Library/Caches/ms-playwright
export PLAYWRIGHT_DIR=<cartella del pacchetto playwright>              # es. …/node_modules/playwright
export CHROME_TEST_BIN="<…>/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
```

Sul Mac del responsabile il 29/09/2026 erano già presenti:

- `PLAYWRIGHT_DIR=/Users/mrc1/.npm/_npx/9833c18b2d85bc59/node_modules/playwright`
- `CHROME_TEST_BIN=/Users/mrc1/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

## Giro completo

```bash
npx serve -l 4173 . &                                   # sito locale
node strumenti/test-browser/check.cjs                   # esempi, guida e ritorno, errori in console
node strumenti/test-browser/primo_avvio.cjs             # UNISAL alla prima apertura, riapertura, rimozione
node strumenti/test-browser/kb.cjs                      # frecce nelle schede, etichette sulla mappa
node strumenti/test-browser/shots.cjs                   # axe, testi < 12 px, bersagli piccoli, screenshot in tmp/
```

Dopo il push, lo stesso giro sul sito online: aggiungere `https://luxury-analyzer.vercel.app` come primo argomento.

## Cosa deve uscire

- `errori []` in tutti gli script.
- `axe: []` in `shots.cjs`.
- In `primo_avvio.cjs`:
  - «prima apertura: RETE NEURALE · UNISAL»;
  - dopo la rimozione e la riapertura, «MOTORE CLASSICO · INDICATIVO».

## Prove non incluse qui

- **Aggiornamento, versione precedente e file danneggiato** (28/09/2026): richiedono un catalogo di prova servito da un sito separato. Il procedimento è nella voce di history `2026-09-28-modelli-inclusi`.
