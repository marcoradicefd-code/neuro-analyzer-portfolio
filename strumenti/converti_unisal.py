"""Converte UNISAL (licenza Apache-2.0) in ONNX per immagini statiche.

Uso: python converti_unisal.py <cartella_lavoro>
Richiede: torch, onnx, numpy, pillow e il repository github.com/rdroste/unisal
clonato in <cartella_lavoro>/unisal. Usa i pesi affinati su MIT1003
(weights_ft_mit1003.pth) con il dominio SALICON, come fa l'autore per il
benchmark MIT300. L'involucro accetta un'immagine 1x3xAxL normalizzata ImageNet
e restituisce la log-densità 1x1xAxL. Altezza e larghezza sono libere
(multipli di 32). Salva in riferimenti/unisal_* le mappe calcolate da PyTorch.
"""
import sys, json, pathlib
import numpy as np, torch
from PIL import Image

W = pathlib.Path(sys.argv[1]); sys.path.insert(0, str(W / "unisal"))
from unisal.model import UNISAL

run = W / "unisal" / "training_runs" / "pretrained_unisal"
cfg = json.loads((run / "UNISAL.json").read_text()); cfg["cnn_cfg"]["pretrained"] = False; cfg["verbose"] = 0
net = UNISAL(**cfg)
net.load_state_dict(torch.load(run / "weights_ft_mit1003.pth", map_location="cpu"))
net.eval()

class Immagine(torch.nn.Module):
    def __init__(self, m): super().__init__(); self.m = m
    def forward(self, x):
        y = self.m(x.unsqueeze(1), source="SALICON", static=True)
        return y[:, 0]

wrap = Immagine(net).eval()
out = W / "onnx" / "unisal_fp32.onnx"; out.parent.mkdir(exist_ok=True)
with torch.no_grad():
    torch.onnx.export(wrap, torch.zeros(1, 3, 288, 384), str(out), input_names=["immagine"], output_names=["log_densita"],
                      dynamic_axes={"immagine": {2: "altezza", 3: "larghezza"}, "log_densita": {2: "altezza", 3: "larghezza"}},
                      opset_version=17, do_constant_folding=True, dynamo=False)

mean, std = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
ref = W / "riferimenti"; ref.mkdir(exist_ok=True)
for img in sorted((W / "test_img").iterdir()):
    if img.suffix.lower() not in (".jpg", ".jpeg", ".png"): continue
    for h, w in ((288, 384), (384, 288), (320, 320), (384, 320)):
        a = (np.asarray(Image.open(img).convert("RGB").resize((w, h), Image.LANCZOS), np.float32) / 255 - mean) / std
        x = torch.from_numpy(a.transpose(2, 0, 1)[None].copy())
        with torch.no_grad(): y = wrap(x).numpy()
        np.save(ref / f"unisal_{img.stem}_{h}x{w}.npy", y); np.save(ref / f"unisal_{img.stem}_{h}x{w}_in.npy", x.numpy())
print("ok", out, out.stat().st_size)
