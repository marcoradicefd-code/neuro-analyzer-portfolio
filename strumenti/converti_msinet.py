"""Converte MSI-Net (SavedModel Keras, licenza MIT) in ONNX e salva le mappe di riferimento.

Uso: python converti_msinet.py <cartella_lavoro>
Richiede: tensorflow 2.15, tf2onnx, onnx 1.16, huggingface_hub, pillow.
Scarica alexanderkroner/MSI-Net da Hugging Face, esporta ONNX con altezza e
larghezza libere e salva in riferimenti/msinet_*.npy la mappa calcolata da
TensorFlow su ogni immagine di test_img/, per il confronto con ONNX.
"""
import sys, pathlib, subprocess
import numpy as np, tensorflow as tf
from PIL import Image
from huggingface_hub import snapshot_download

W = pathlib.Path(sys.argv[1])
src = snapshot_download(repo_id="alexanderkroner/MSI-Net", local_dir=str(W / "msinet_hf"))
out = W / "onnx" / "msinet_fp32.onnx"; out.parent.mkdir(exist_ok=True)
subprocess.run([sys.executable, "-m", "tf2onnx.convert", "--saved-model", src, "--output", str(out), "--opset", "17"], check=True)

ref = W / "riferimenti"; ref.mkdir(exist_ok=True)
model = tf.saved_model.load(src).signatures["serving_default"]
for img in sorted((W / "test_img").iterdir()):
    if img.suffix.lower() not in (".jpg", ".jpeg", ".png"): continue
    for h, w in ((240, 320), (320, 240), (320, 320)):
        x = np.asarray(Image.open(img).convert("RGB").resize((w, h), Image.BILINEAR), dtype=np.float32)[None]
        y = model(input_1=tf.constant(x))["layer_from_saved_model"].numpy()
        np.save(ref / f"msinet_{img.stem}_{h}x{w}.npy", y)
        np.save(ref / f"msinet_{img.stem}_{h}x{w}_in.npy", x)
print("ok", out, out.stat().st_size)
