# Licenze dei modelli inclusi

I file in `modelli/` sono conversioni in ONNX dei pesi pubblicati dagli autori. La conversione non cambia i valori, salvo l'arrotondamento dei pesi a 16 bit (correlazione della mappa ≥ 0,999 con l'originale, vedi `strumenti/verifica_onnx.py`).

| Modello | Autori | Fonte | Licenza | File |
|---|---|---|---|---|
| UNISAL | Richard Droste, Jianbo Jiao, J. Alison Noble (ECCV 2020) | github.com/rdroste/unisal | Apache-2.0 | `UNISAL-Apache-2.0.txt` |
| MSI-Net | Alexander Kroner e altri (Neural Networks 2020) | github.com/alexanderkroner/saliency, huggingface.co/alexanderkroner/MSI-Net | MIT | `MSI-Net-MIT.txt` |
| FastSal | Feiyan Hu, Kevin McGuinness (2020) | github.com/feiyanhu/FastSal | Apache-2.0 | `FastSal-Apache-2.0.txt` |

Modifiche rispetto agli originali: esportazione in ONNX; involucro per immagini singole (UNISAL, con dominio SALICON e pesi affinati su MIT1003); sigmoide finale (FastSal); operazioni Concat divise per rispettare i limiti di WebGPU; pesi salvati in float16.

Non verificato: la licenza dei dataset con cui gli autori hanno addestrato i pesi (SALICON, MIT1003, DHF1K e altri). Per un uso commerciale va controllata.
