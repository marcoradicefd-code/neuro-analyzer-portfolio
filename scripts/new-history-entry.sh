#!/usr/bin/env bash
# new-history-entry.sh — creates docs/history/YYYY-MM-DD-<slug>.md with the standard header.
# Usage: bash new-history-entry.sh <slug> "<Titolo>" [PR number]
# The index docs/history.md is NOT touched: run `pnpm history:index` in a separate chore(docs).

set -eu
slug="${1:?slug mancante (es. seo-editoriale)}"
title="${2:?titolo mancante}"
pr="${3:-}"
day=$(date +%F)
dir="docs/history"
file="$dir/$day-$slug.md"

# Italian long date for the header line, e.g. "17 settembre 2026"
mesi=(gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre)
d=$(date +%-d); m=$(date +%-m); y=$(date +%Y)
data_it="$d ${mesi[$((m-1))]} $y"

mkdir -p "$dir"
if [ -e "$file" ]; then echo "ERRORE: $file esiste già"; exit 1; fi

if [ -n "$pr" ]; then intestazione="> $data_it · PR #$pr"; else intestazione="> $data_it · —"; fi

cat > "$file" <<ENTRY
# $title

$intestazione

Cosa si è fatto, in due righe.

## Perché così

Il motivo, e le alternative scartate con il numero o il fatto che le ha scartate.

## Cosa si è misurato

I numeri, e da dove vengono (comando, file, ambiente). Se un numero contraddice
la Baseline di CLAUDE.md, si aggiorna lì nel chore(docs), non qui.

## Cosa resta aperto

## Cosa è cambiato, file per file

- \`percorso/file\`: cosa e perché.
ENTRY

echo "creata $file"
echo "ricorda: l'indice si rigenera con 'pnpm history:index' nel chore(docs), non ora"
