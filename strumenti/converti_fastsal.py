"""Converte FastSal A con i pesi SALICON (licenza Apache-2.0) in ONNX.

Uso: python converti_fastsal.py <cartella_lavoro>
Richiede: torch, torchvision, onnx, numpy, pillow e il repository
github.com/feiyanhu/FastSal clonato in <cartella_lavoro>/FastSal.
L'involucro accetta un'immagine 1x3xAxL normalizzata ImageNet e restituisce la
probabilità di fissazione 1x1xAxL (sigmoide dell'uscita, come fastSal_predict.py).
Salva in riferimenti/fastsal_* le mappe calcolate da PyTorch.
"""
import sys, pathlib
import numpy as np, torch
from PIL import Image

W = pathlib.Path(sys.argv[1]); sys.path.insert(0, str(W / "FastSal"))
# FastSal usa nomi di torchvision 0.5; nelle versioni attuali stanno in mobilenetv2.
import torchvision.models.mobilenet as tvm, torchvision.models.mobilenetv2 as tvm2
from torchvision.ops.misc import Conv2dNormActivation
tvm.InvertedResidual = tvm2.InvertedResidual
tvm.ConvBNReLU = lambda i, o, kernel_size=3, stride=1, groups=1: Conv2dNormActivation(
    i, o, kernel_size=kernel_size, stride=stride, groups=groups, norm_layer=torch.nn.BatchNorm2d, activation_layer=torch.nn.ReLU6)
import torchvision.ops.misc as tvmisc
for n in ("Conv2d", "ConvTranspose2d", "BatchNorm2d", "interpolate"):
    if not hasattr(tvmisc, n): setattr(tvmisc, n, getattr(torch.nn, n, None) or torch.nn.functional.interpolate)
import model.fastSal as fastsal
from utils import load_weight

net = fastsal.fastsal(pretrain_mode=False, model_type="A")
state, _ = load_weight(str(W / "FastSal" / "weights" / "salicon_A.pth"), remove_decoder=False)
net.load_state_dict(state); net.eval()

class Probabilita(torch.nn.Module):
    def __init__(self, m): super().__init__(); self.m = m
    def forward(self, x): return torch.sigmoid(self.m(x))

wrap = Probabilita(net).eval()
out = W / "onnx" / "fastsal_fp32.onnx"; out.parent.mkdir(exist_ok=True)
with torch.no_grad():
    torch.onnx.export(wrap, torch.zeros(1, 3, 192, 256), str(out), input_names=["immagine"], output_names=["probabilita"],
                      dynamic_axes={"immagine": {2: "altezza", 3: "larghezza"}, "probabilita": {2: "altezza", 3: "larghezza"}},
                      opset_version=17, do_constant_folding=True, dynamo=False)

mean, std = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
ref = W / "riferimenti"; ref.mkdir(exist_ok=True)
for img in sorted((W / "test_img").iterdir()):
    if img.suffix.lower() not in (".jpg", ".jpeg", ".png"): continue
    for h, w in ((192, 256), (256, 192)):
        a = (np.asarray(Image.open(img).convert("RGB").resize((w, h), Image.LANCZOS), np.float32) / 255 - mean) / std
        x = torch.from_numpy(a.transpose(2, 0, 1)[None].copy())
        with torch.no_grad(): y = wrap(x).numpy()
        np.save(ref / f"fastsal_{img.stem}_{h}x{w}.npy", y); np.save(ref / f"fastsal_{img.stem}_{h}x{w}_in.npy", x.numpy())
print("ok", out, out.stat().st_size)
