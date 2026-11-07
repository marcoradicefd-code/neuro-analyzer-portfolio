"""Confronta le mappe di un modello ONNX con quelle del framework originale.

Uso: python verifica_onnx.py <modello.onnx> <cartella_riferimenti> <prefisso>
Per ogni riferimenti/<prefisso>_<nome>_in.npy esegue il modello e confronta
l'uscita con riferimenti/<prefisso>_<nome>.npy. Stampa la correlazione di
Pearson e lo scarto massimo; esce con errore se una correlazione è < 0,999.
"""
import sys, pathlib
import numpy as np, onnxruntime as ort

model, ref, pre = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3]
s = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
name = s.get_inputs()[0].name
worst = 1.0
for fin in sorted(ref.glob(f"{pre}_*_in.npy")):
    y0 = np.load(str(fin).replace("_in.npy", ".npy")).ravel()
    y1 = s.run(None, {name: np.load(fin)})[0].ravel()
    cc = float(np.corrcoef(y0, y1)[0, 1]); worst = min(worst, cc)
    print(f"{fin.stem[len(pre)+1:-3]:40s} correlazione {cc:.6f}  scarto max {np.abs(y0 - y1).max():.2e}")
print(f"peggiore {worst:.6f}")
sys.exit(0 if worst >= 0.999 else 1)
