# Progetto: modelli di salienza inclusi nell'app

Data: 28 settembre 2026. Ramo: `modelli`. Approvato dall'utente il 28/09/2026: esecuzione fino alla pubblicazione.

## Obiettivo

Chi apre Neuro Analyzer può installare con un clic i migliori modelli di salienza utilizzabili commercialmente nel browser, e aggiornarli con il pulsante "Aggiorna modelli". I file dei modelli sono pubblicati insieme al sito. Le creatività restano nel browser.

## Scelta dei modelli (ricerca del 28/09/2026)

| Modello | Ruolo | Licenza | Perché |
|---|---|---|---|
| UNISAL (pesi affinati su MIT1003) | Consigliato | Apache-2.0 | Il migliore con licenza commerciale sulla classifica MIT300 con eye-tracker (AUC 0,877, NSS 2,369, IG 0,951). Leggero: 3,7 M parametri |
| MSI-Net | Seconda opinione | MIT | Appena sotto UNISAL su MIT300 (AUC 0,874, NSS 2,305). Architettura diversa, utile per confronto |
| FastSal A (pesi SALICON) | Veloce | Apache-2.0 | 14 MB, pensato per la CPU. Meno preciso (SALICON CC 0,874), ma adatto ai dispositivi deboli |

Esclusi: UMSI (licenza non commerciale), DeepGaze ed EML-Net (senza licenza), SUM (richiede CUDA, 230 MB), TempSAL (licenza ambigua), SalNAS e SimpleNet (guadagno marginale). Fonti: saliency.tuebingen.ai/results.html, arXiv 2406.17815 e 2407.20062.

Da verificare a cura dell'azienda: la licenza dei dataset di addestramento dei pesi (SALICON, MIT1003).

## Architettura

- **Un solo runtime per i modelli del catalogo:** ONNX Runtime Web 1.30 da cdnjs, con WebGPU dove disponibile e WASM come riserva. TensorFlow.js resta solo per i modelli caricati a mano.
- **File nella repo:** `modelli/<id>/<sha8>/<id>.onnx`. Il percorso contiene l'impronta, quindi un file pubblicato non cambia mai. `modelli/catalogo.json` descrive ogni modello: id, nome, ruolo, versione, licenza, fonte, file (url, dimensione, sha256), ingresso (dimensioni possibili, adattamento, normalizzazione), uscita.
- **Cache HTTP (vercel.json):** file dei modelli `immutable` per un anno; catalogo `no-cache`.
- **Conservazione nel browser:** Cache API (`neuro-modelli`) per i file, più un indice piccolo nella memoria già esistente. Richiesta `navigator.storage.persist()` alla prima installazione. Se il browser cancella i file, l'app li riscarica.
- **Installazione:** download con avanzamento, verifica SHA-256, apertura della sessione ONNX, prova su un'immagine, poi salvataggio in cache e attivazione.
- **Aggiorna modelli:** rilegge il catalogo; per ogni modello installato con impronta diversa scarica e verifica la nuova versione, la prova e solo allora la sostituisce. La versione precedente resta come riserva; quelle più vecchie vengono cancellate.
- **All'apertura:** controllo silenzioso del catalogo e segnalazione "Aggiornamento disponibile". Nessun download senza clic.
- **Preparazione dell'immagine:** ogni modello dichiara nel catalogo le dimensioni d'ingresso e il modo di adattarle (`pad` con bordo nero come fa MSI-Net, `stretch` come fanno UNISAL e FastSal). L'app sceglie la dimensione con la proporzione più vicina a quella della creatività.

## Conversione e controllo di correttezza

- Script riproducibili in `strumenti/`: esportano ogni modello dal formato originale (PyTorch per UNISAL e FastSal, SavedModel per MSI-Net) in ONNX.
- **Controllo di correttezza:** su immagini di prova, la mappa ONNX deve coincidere con quella del framework originale (correlazione ≥ 0,999). Se un modello non supera il controllo, non entra nel catalogo.
- **Riduzione del peso:** pesi in float16 con calcolo in float32, solo se la correlazione con l'originale resta ≥ 0,999.

## Interfaccia

- Il riquadro "Catalogo" nel pannello Motore diventa vivo: nome, ruolo, peso, licenza, stato (Non installato, Installato, Aggiornamento disponibile, In uso) e pulsante Installa o Usa. Durante il download mostra l'avanzamento.
- Nell'intestazione del catalogo c'è il pulsante "Aggiorna modelli".
- La sezione dei modelli caricati a mano resta com'è, con il nome "Modelli caricati da te".
- Testi da aggiornare: riquadro "Perché i modelli non sono già dentro l'app", guida (sezioni Motore e Privacy), README.

## Verifiche prima della pubblicazione

1. Correttezza delle conversioni (script Python).
2. Browser headless: installazione dei 3 modelli, analisi dei due esempi con mappe valide, tempi, riapertura con modello ancora installato, aggiornamento simulato con un catalogo di prova, funzionamento senza rete dopo l'installazione, file danneggiato rifiutato.
3. Accessibilità (axe) e screenshot a 1440, 1200 e 390 px.
4. Dopo il push: stesse prove sul sito online.

## Fuori da questa fase

- Analisi video con la memoria temporale di UNISAL.
- Media delle mappe di più modelli.
- Riaddestramento su dati di sguardo raccolti dall'azienda: è la leva più forte per la pubblicità di lusso, ma richiede un set proprietario di 100-400 immagini con fissazioni.

## Risultati (28/09/2026)

**Correttezza delle conversioni** (`strumenti/verifica_onnx.py`, 4 immagini in 2–4 proporzioni ciascuna; nel browser un'immagine per modello)

| Modello | File | ONNX contro originale (Python) | Browser, GPU | Browser, CPU |
|---|---|---|---|---|
| UNISAL | 6,2 MB (era 12,8) | ≥ 0,999999 | 1,000000 | 1,000000 |
| MSI-Net | 47,7 MB (era 99,9) | 1,000000 | 1,000000 | 1,000000 |
| FastSal | 7,0 MB (era 14,6) | ≥ 0,999996 | 0,999998 | 0,999998 |

**Problema trovato e corretto:** UNISAL conteneva un Concat con 16 ingressi. Su WebGPU supera il limite garantito di 8 buffer: la GPU scartava l'operazione senza errore e la mappa usciva sbagliata (Focus 22 invece di 100 sull'esempio A). Ora `strumenti/compat_webgpu.py` divide i Concat lunghi. In più, l'app ascolta gli errori della GPU durante la prova e, se ne riceve uno, passa alla CPU.

**Tempi di prova** (Chrome headless su Mac, immagine 320×240)

| Modello | GPU | CPU |
|---|---|---|
| UNISAL | 55 ms | 94 ms |
| MSI-Net | 204 ms | 2.043 ms |
| FastSal | 17 ms | — |

**Flussi provati nel browser:** installazione dei tre modelli (1,8–2,8 s in locale); riapertura con il modello attivo ripreso dalla cache, senza download; uso di un altro modello senza rete; «Aggiorna modelli» con un catalogo di prova (scarica solo il file cambiato e tiene la versione precedente); ritorno alla versione precedente; file con impronta sbagliata rifiutato e non installato; computer senza WebGPU (tutto sulla CPU); telefono a 390 px. Console senza errori, accessibilità (axe) senza violazioni.
