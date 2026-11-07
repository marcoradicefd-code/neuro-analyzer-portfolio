# Vercel — checklist

Stato rilevato il 29/09/2026.

## Progetto

- **Team:** `tecnicoluxuryacademys-projects`, piano Hobby.
  ⚠️ Secondo i termini di Vercel il piano Hobby è solo per uso personale non commerciale: per Luxury Academy va valutato il piano Pro.
- **Progetto:** `luxury-analyzer`, ID `prj_MpWVa3hoGcv2Bxdut8PQtubCIJ0u`. In origine si chiamava `luxury-academy-neuro-analyzer`, rinominato il 28/09/2026.
- **Repo collegata:** `TecnicoLuxuryAcademy/Luxury-Analyzer`, branch di produzione `main`.
- **Build and Deployment:**
  - Framework Preset: Other
  - Build Command: vuoto (override attivo)
  - Output Directory: `.`
  - Install Command: vuoto

## Domini

- `luxury-analyzer.vercel.app` — principale, aggiunto dal responsabile il 29/09/2026.
- `luxury-academy-neuro-analyzer.vercel.app` — storico, resta attivo finché non si toglie da Settings → Domains.

## Protezione

- Deployment Protection: Standard Protection. La produzione è pubblica; gli URL dei singoli deployment chiedono il login Vercel (302).

## Cache e intestazioni (`vercel.json`)

- Su tutto: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `/modelli/(.*)`: `Cache-Control: public, max-age=31536000, immutable`.
- `modelli.json`: default di Vercel (`max-age=0, must-revalidate`), così gli aggiornamenti si vedono subito.

## Note

- Il connettore Vercel di Claude (MCP) in questa sessione non vedeva questo progetto: le verifiche si fanno con `curl` e con lo stato dei commit su GitHub (`gh api repos/TecnicoLuxuryAcademy/Luxury-Analyzer/commits/<sha>/status`).
- La CLI `vercel` non è installata: il responsabile gestisce il progetto dalla dashboard.
