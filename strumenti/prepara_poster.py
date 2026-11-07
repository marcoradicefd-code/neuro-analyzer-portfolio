"""Prepara i poster di UEyes (CC BY 4.0) per tarare e verificare i punteggi dell'app.

Uso: python prepara_poster.py <cartella UEyes_dataset> <repo> <uscita> [immagini extra...]
Per ogni poster salva: pixel RGBA alla griglia dell'app (lato lungo 128), mappa
di calore umana a 3 s, fissazioni umane a 3 s (pesi per cella) e l'uscita dei
tre modelli del catalogo con lo stesso preprocessing dell'app (dimensione con la
proporzione più vicina, adattamento stretch o pad, normalizzazione).
"""
import sys, json, pathlib, math
import numpy as np, onnxruntime as ort
from PIL import Image
U, R, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]); OUT.mkdir(parents=True, exist_ok=True)
cat = json.load(open(R / 'modelli.json'))
sess = {m['id']: (ort.InferenceSession(str(R / m['file']['url'].lstrip('/')), providers=['CPUExecutionProvider']), m['ingresso']) for m in cat['modelli']}
MEAN, SD, GRID = np.array([.485, .456, .406], np.float32), np.array([.229, .224, .225], np.float32), 128
def pick(cfg, w, h): return min(cfg['sizes'], key=lambda s: abs(math.log(s[0] / s[1] / (h / w))))
def run(mid, img):
    s, cfg = sess[mid]; ih, iw = pick(cfg, *img.size); box = None
    if cfg['fit'] == 'pad':
        k = min(iw / img.width, ih / img.height); dw, dh = max(1, round(img.width * k)), max(1, round(img.height * k)); ox, oy = (iw - dw) // 2, (ih - dh) // 2
        can = Image.new('RGB', (iw, ih)); can.paste(img.resize((dw, dh), Image.BILINEAR), (ox, oy)); box = (ox / iw, oy / ih, dw / iw, dh / ih)
    else: can = img.resize((iw, ih), Image.BILINEAR)
    a = np.asarray(can, np.float32); a = a if cfg['norm'] == '255' else a / 255 if cfg['norm'] == '01' else (a / 255 - MEAN) / SD
    x = a.transpose(2, 0, 1)[None] if cfg['layout'] == 'nchw' else a[None]
    y = s.run(None, {s.get_inputs()[0].name: np.ascontiguousarray(x, np.float32)})[0]; d = y.shape
    oh, ow = (d[1], d[2]) if len(d) == 4 and d[3] == 1 else (d[-2], d[-1]); y = y.reshape(oh, ow)
    if box: x0, y0, cw, ch = round(box[0] * ow), round(box[1] * oh), max(1, round(box[2] * ow)), max(1, round(box[3] * oh)); y = y[y0:y0 + ch, x0:x0 + cw]
    return y.astype(np.float32)
rows = [l.split(';') for l in (U / 'image_types.csv').read_text().strip().split('\n')[1:]]
posters = [(r[0], r[3].strip()) for r in rows if r[1].strip() == 'poster']
items = []
todo = [(U / 'images' / n, U / 'saliency_maps' / 'heatmaps_3s' / n, U / 'saliency_maps' / 'fixmaps_3s' / n, split) for n, split in posters] + [(pathlib.Path(e), None, None, 'extra') for e in sys.argv[4:]]
for i, (p, hm, fm, split) in enumerate(todo):
    if not p.exists() or (hm is not None and not (hm.exists() and fm.exists())): continue
    img = Image.open(p).convert('RGB'); w, h = img.size
    mw, mh = (GRID, max(16, round(GRID * h / w))) if w >= h else (max(16, round(GRID * w / h)), GRID)
    rec = dict(id=i, nome=p.stem, mw=mw, mh=mh, umano=hm is not None, split=split)
    np.asarray(img.convert('RGBA').resize((mw, mh), Image.BILINEAR), np.uint8).tofile(OUT / f'{i}_px.bin')
    if hm is not None:
        np.asarray(Image.open(hm).convert('L').resize((mw, mh), Image.BILINEAR), np.float32).tofile(OUT / f'{i}_umano.bin')
        f = np.asarray(Image.open(fm).convert('L'), np.float32); ys, xs = np.nonzero(f)
        g = np.zeros((mh, mw), np.float32); np.add.at(g, (np.minimum(mh - 1, ys * mh // f.shape[0]), np.minimum(mw - 1, xs * mw // f.shape[1])), f[ys, xs]); g.tofile(OUT / f'{i}_fix.bin')
    for mid in sess: y = run(mid, img); y.tofile(OUT / f'{i}_{mid}.bin'); rec[mid] = [y.shape[1], y.shape[0]]
    items.append(rec)
json.dump(items, open(OUT / 'indice.json', 'w')); print('ok', len(items), 'immagini')
