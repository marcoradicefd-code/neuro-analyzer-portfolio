# Mappa del codice (overview)

Riferimento strutturale, tenuto fuori da `CLAUDE.md` per non caricarlo a ogni sessione.
**Leggi questo prima di esplorare.** Storia e debito: `docs/history.md`.

Qui non ci sono numeri: stanno in `CLAUDE.md` § Baseline, con la data.

## File

- `index.html` — l'app intera: HTML, CSS e JavaScript inline, nessuna build.
- `guida.html` — la guida all'uso, servita su `/guida` (`cleanUrls` in `vercel.json`). Riproduce alcuni componenti dell'app (schede aree, consigli): se cambia lo stile dell'app, va allineata.
- `modelli.json` — catalogo dei modelli inclusi: id, nome, ruolo, versione, licenza, fonte, file (url, dimensione, sha256), ingresso (dimensioni possibili, adattamento `stretch` o `pad`, disposizione, normalizzazione), esclusi con motivo.
- `modelli/<id>/<sha8>/<id>.onnx` — i file dei modelli, mai modificati dopo la pubblicazione. `modelli/licenze/` — testi di licenza e `LEGGIMI.md`, linkato dall'app.
- `vercel.json` — URL puliti, intestazioni di sicurezza, cache `immutable` su `/modelli/`.
- `strumenti/` — conversione dei modelli (Python), taratura (`tara_focus.cjs` con `app_core.cjs`, che esegue lo script di `index.html` in Node con un DOM finto), prove nel browser (`test-browser/`).
- `scripts/` — strumenti dei documenti (skill docs-progetto): indice della history, audit, nuova voce.

## Sezioni di `index.html`

Il JavaScript è un'unica funzione autoeseguita, divisa da commenti `/* ---------- nome ---------- */`:

- **utilità, palette** — funzioni generiche, scale di colore.
- **elaborazione immagine** — `classic()`, il motore classico (contrasto, colore, bordi, bias centrale), `prior()`, `toProb()`, `hotspots()` (sequenza degli sguardi con inibizione del ritorno), `analyzeCanvas()`.
- **punteggi** — `concentration()`, `FOCUS_CAL`, `focusScore()`, `basic()`, `scores()`, `recommend()` (consigli).
- **reti neurali** — `runTF()`, `pickSize()` e `runOnnx()` (dimensione e adattamento per modello), `activateModel()`, caricamento da file o indirizzo.
- **memoria dell'app** — IndexedDB (`window.storage`) per i modelli caricati dall'utente, in blocchi base64.
- **modelli inclusi** — catalogo, download con avanzamento, verifica SHA-256, `catSession()` (WebGPU poi CPU, prova e ascolto degli errori GPU), install, usa, versione precedente, rimuovi, «Aggiorna modelli».
- **controllo aggiornamenti** — per i modelli caricati dall'utente (GitHub, Hugging Face, indirizzo diretto).
- **diagnostica e avvio librerie** — cdnjs per TensorFlow.js e ONNX Runtime.
- **caricamento creatività, esempi, disegno, quadranti, render, esportazioni, eventi, avvio**.

## Flusso dei dati

Creatività (file, incolla, esempi) → canvas ridotto (lato lungo ≤ 1600 px) → griglia di analisi (lato lungo 128) → mappa del motore attivo (classico o rete neurale) → `toProb` → sequenza degli sguardi, punteggi, aree, consigli → disegno sul canvas, report, esportazioni PNG e CSV. Niente esce dal browser.

Modelli: `modelli.json` (sempre ricontrollato) → download da `/modelli/…` → verifica impronta → prova → Cache API `neuro-modelli` → alla riapertura si riattiva `cat:active` dalla cache.

## Integrazioni esterne

- cdnjs: ONNX Runtime Web, TensorFlow.js. Google Fonts: Roboto e Roboto Condensed. jsDelivr: axe-core, solo negli script di prova.
- Nessun servizio con credenziali.

## Ambienti

| | locale | produzione |
|---|---|---|
| Sito | `npx serve -l 4173 .` | Vercel, push su `main` |
| Cache dei modelli | come in produzione | `immutable` da `vercel.json` |

## Orizzonte

Cantieri aperti, ciascuno con la data in cui è stato scritto qui.

- 29/09/2026 — Taratura dei modelli sui poster: temperatura, bias centrale e componente uniforme stimati su fissazioni tenute fuori. Sui poster i modelli sono troppo sicuri. Da decidere: cambierebbe le mappe.
- 29/09/2026 — Eye-tracking proprietario su circa 50 creatività di lusso, la leva più forte secondo la letteratura (Kümmerer e altri 2025).
- 29/09/2026 — Analisi video con la memoria temporale di UNISAL; oggi i video sono fotogrammi singoli.
- 29/09/2026 — Service worker per aprire l'app senza rete. Oggi l'uso offline funziona solo con la pagina già aperta.
- 29/09/2026 — Fasce consigliate per piattaforma e misure di carico, coinvolgimento e memorabilità: ancora euristiche, non tarate su dati reali.
