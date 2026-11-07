**English** · [Italiano](README.md)

# Neuro Analyzer — where the eye lands

A web app that **predicts where people look** on a creative (ad, social post, banner), measures how much the **logo, product and call to action** stand out, and **compares several variants** so you can pick the strongest before publishing.

**Live:** [luxury-analyzer.vercel.app](https://luxury-analyzer.vercel.app/) · [guide (Italian)](https://luxury-analyzer.vercel.app/guida)

> Conceived and developed by **Marco Radice** for Luxury Academy, with Claude Code.
> This is a **public portfolio copy**: the commit history and internal notes have been removed.

## How it works

- The analysis uses **visual saliency prediction** neural networks that run **directly in the browser** with ONNX Runtime Web: on WebGPU when available, otherwise on the CPU.
- **Privacy**: images are never sent to a server or stored. The only things kept on the device are the models the user chooses to cache.
- Models are versioned with a SHA-256 fingerprint: when a new version ships, the app shows "Update available".

## Included models

| Model | Role | Licence | Size |
|---|---|---|---|
| UNISAL | recommended | Apache-2.0 | 6.2 MB |
| MSI-Net | second opinion | MIT | 47.7 MB |
| FastSal | fast | Apache-2.0 | 7.0 MB |

Each model was **converted to ONNX** and checked against the original: the saliency maps correlate at 0.999 or higher. Licences are in `modelli/licenze/`.

## Stack

- Static HTML and JavaScript, **no build step**.
- ONNX Runtime Web (WebGPU / WASM).
- Python scripts to convert, optimise (fp16 weights, WebGPU compatibility), verify and publish the models.
- Hosted on Vercel with security headers and model caching.

## Structure

```
index.html      the app
guida.html      user guide (/guida)
modelli/        ONNX models, in fingerprinted folders
modelli.json    model list: version, size, licence, SHA-256
strumenti/      conversion, verification, score calibration, browser tests
docs/           code map, decisions, guides, deployment
```

## Running locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

The interface is in Italian.
