"""Copia i modelli ONNX verificati nella repo e scrive il catalogo modelli.json.

Uso: python pubblica_modelli.py <cartella_lavoro> <repo>
Legge <cartella_lavoro>/onnx/<id>_fp16w.onnx (prodotti da converti_*.py e
pesi_fp16.py e controllati con verifica_onnx.py), li copia in
<repo>/modelli/<id>/<sha8>/<id>.onnx e aggiorna <repo>/modelli.json.
Il percorso contiene l'impronta: un file pubblicato non cambia mai, quindi può
restare in cache per sempre. Le versioni non più nel catalogo vanno rimosse a mano.
"""
import sys, json, hashlib, shutil, pathlib, datetime

W, R = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
unisal_sizes = sorted({(a * 32, b * 32) for a in range(7, 14) for b in range(7, 14) if 100 <= a * b <= 120})
MODELLI = [
    dict(id="unisal", nome="UNISAL", ruolo="Consigliato", consigliato=True,
         descrizione="Il più preciso tra i modelli con licenza commerciale sulla classifica MIT300 con eye-tracker. Leggero e adatto a ogni dispositivo.",
         versione="2020 · pesi affinati su MIT1003", licenza="Apache-2.0", fonte="https://github.com/rdroste/unisal",
         ingresso=dict(sizes=[list(s) for s in unisal_sizes], fit="stretch", layout="nchw", norm="imagenet"), uscita="log-densità"),
    dict(id="msinet", nome="MSI-Net", ruolo="Seconda opinione", consigliato=False,
         descrizione="Architettura diversa, precisione vicina a UNISAL. Utile per confermare una lettura o confrontare due varianti.",
         versione="2020 · pesi SALICON", licenza="MIT", fonte="https://github.com/alexanderkroner/saliency",
         ingresso=dict(sizes=[[240, 320], [320, 240], [320, 320]], fit="pad", layout="nhwc", norm="255"), uscita="densità"),
    dict(id="fastsal", nome="FastSal", ruolo="Veloce", consigliato=False,
         descrizione="Il più rapido: pensato per computer poco potenti e per i video. Meno preciso degli altri due.",
         versione="2020 · pesi SALICON", licenza="Apache-2.0", fonte="https://github.com/feiyanhu/FastSal",
         ingresso=dict(sizes=[[192, 256], [256, 192]], fit="stretch", layout="nchw", norm="imagenet"), uscita="probabilità"),
]
ESCLUSI = [
    dict(nome="UMSI", motivo="Addestrato su pubblicità e grafica, ma la licenza vieta l'uso commerciale."),
    dict(nome="DeepGaze IIE, III e MSDB", motivo="Primi in classifica, ma senza licenza e troppo pesanti per il browser."),
    dict(nome="SUM (2024)", motivo="Ha una modalità per e-commerce, ma pesa 230 MB e richiede una GPU NVIDIA."),
    dict(nome="TempSAL, SalNAS, SimpleNet", motivo="Licenza ambigua o guadagno di precisione minimo rispetto al peso."),
]
out = []
for m in MODELLI:
    src = W / "onnx" / f"{m['id']}_fp16w.onnx"
    data = src.read_bytes(); sha = hashlib.sha256(data).hexdigest()
    rel = f"modelli/{m['id']}/{sha[:8]}/{m['id']}.onnx"
    dst = R / rel; dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists(): shutil.copyfile(src, dst)
    out.append({**m, "file": dict(url="/" + rel, size=len(data), sha256=sha)})
cat = dict(schema=1, aggiornato=datetime.date.today().isoformat(), modelli=out, esclusi=ESCLUSI)
(R / "modelli.json").write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
for m in out: print(f"{m['id']:8s} {m['file']['size']/1048576:6.1f} MB  {m['file']['url']}")
