[English](README.en.md) · **Italiano**

# Neuro Analyzer — dove cade lo sguardo

Web app che **stima dove cade lo sguardo** su una creatività (annuncio, post, banner), misura quanto emergono **logo, prodotto e call to action** e **confronta più varianti** tra loro, per scegliere la più efficace prima di pubblicarla.

**Online:** [luxury-analyzer.vercel.app](https://luxury-analyzer.vercel.app/) · [guida](https://luxury-analyzer.vercel.app/guida)

> Progetto ideato e sviluppato da **Marco Radice** per Luxury Academy, con Claude Code.
> Questa è una **copia pubblica per portfolio**: lo storico dei commit e le note interne sono stati rimossi.

## Come funziona

- L'analisi usa reti neurali di **predizione della salienza visiva** che girano **direttamente nel browser** con ONNX Runtime Web: su WebGPU quando è disponibile, altrimenti sulla CPU.
- **Privacy**: le immagini non vengono inviate a nessun server né salvate. Sul dispositivo restano solo i modelli che l'utente sceglie di tenere in memoria.
- I modelli sono versionati con impronta SHA-256: quando ne esce una versione nuova l'app mostra "Aggiornamento disponibile".

## Modelli inclusi

| Modello | Ruolo | Licenza | Peso |
|---|---|---|---|
| UNISAL | consigliato | Apache-2.0 | 6,2 MB |
| MSI-Net | seconda opinione | MIT | 47,7 MB |
| FastSal | veloce | Apache-2.0 | 7,0 MB |

Ogni modello è stato **convertito in ONNX** e verificato contro l'originale: la correlazione tra le mappe è almeno 0,999. Le licenze sono in `modelli/licenze/`.

## Stack

- HTML e JavaScript statici, **nessuna build**.
- ONNX Runtime Web (WebGPU / WASM).
- Script Python per convertire, ottimizzare (pesi fp16, compatibilità WebGPU), verificare e pubblicare i modelli.
- Deploy su Vercel con intestazioni di sicurezza e cache dei modelli.

## Struttura

```
index.html      l'app
guida.html      guida all'uso (/guida)
modelli/        modelli ONNX, in cartelle con l'impronta
modelli.json    elenco dei modelli: versione, peso, licenza, SHA-256
strumenti/      conversione, verifica, taratura dei punteggi, test nel browser
docs/           mappa del codice, decisioni, guide, deploy
```

## Avvio in locale

```bash
python3 -m http.server 8080
# apri http://localhost:8080
```
