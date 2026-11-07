# Strumenti per i modelli

Script per rigenerare i modelli ONNX di `modelli/`. Servono Python 3.11 e due ambienti separati, perché TensorFlow 2.15 e PyTorch recente richiedono versioni diverse di NumPy.

```bash
uv venv -p 3.11 .venv    && uv pip install -p .venv/bin/python torch torchvision onnx onnxruntime numpy pillow opencv-python-headless scipy tensorboardX
uv venv -p 3.11 .venv-tf && uv pip install -p .venv-tf/bin/python "tensorflow==2.15.1" tf2onnx "onnx==1.16.2" "numpy<2" huggingface_hub pillow
git clone https://github.com/rdroste/unisal && git clone https://github.com/feiyanhu/FastSal
mkdir test_img   # qualche immagine JPG o PNG per il controllo
```

Poi, dalla cartella di lavoro:

```bash
.venv-tf/bin/python converti_msinet.py .
.venv/bin/python converti_unisal.py .
.venv/bin/python converti_fastsal.py .
for m in unisal msinet fastsal; do
  .venv/bin/python compat_webgpu.py onnx/${m}_fp32.onnx onnx/${m}_compat.onnx
  .venv/bin/python pesi_fp16.py onnx/${m}_compat.onnx onnx/${m}_fp16w.onnx
  .venv/bin/python verifica_onnx.py onnx/${m}_fp16w.onnx riferimenti $m   # deve dire ≥ 0,999
done
.venv/bin/python pubblica_modelli.py . <percorso della repo>
```
