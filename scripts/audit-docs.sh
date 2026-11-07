#!/usr/bin/env bash
# audit-docs.sh — measures the documentation layer of a repo before touching it.
# Read-only. Prints a report; exit code 0 always (the report is the result).
# Usage: bash audit-docs.sh [repo-root]   (default: current directory)

set -u
ROOT="${1:-.}"
cd "$ROOT" || { echo "ERRORE: cartella non trovata: $ROOT"; exit 0; }

MAX_LINES=200
MAX_BYTES=20000
today=$(date +%F)
errors=0
warnings=0

err()  { errors=$((errors+1));   printf 'ERRORE   %s\n' "$*"; }
warn() { warnings=$((warnings+1)); printf 'AVVISO   %s\n' "$*"; }
ok()   { printf 'OK       %s\n' "$*"; }
hdr()  { printf '\n== %s ==\n' "$*"; }

echo "Audit dei documenti — $today — $(pwd)"

# ---------------------------------------------------------------- inventory
hdr "Inventario .md (righe · byte · file)"
find . -name '*.md' \
  -not -path './node_modules/*' -not -path './.git/*' -not -path './.next/*' \
  -not -path './docs/history/*' -not -path './tmp/*' \
  | sort | while read -r f; do
    printf '%6d %8d  %s\n' "$(wc -l < "$f")" "$(wc -c < "$f")" "$f"
  done
hist_n=$(ls docs/history/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "voci in docs/history/: $hist_n"

# ---------------------------------------------------------------- CLAUDE.md
hdr "CLAUDE.md"
if [ -f CLAUDE.md ]; then
  # $(( )) strips the leading spaces that BSD wc (macOS) puts before the number.
  l=$(( $(wc -l < CLAUDE.md) )); b=$(( $(wc -c < CLAUDE.md) ))
  if [ "$l" -le "$MAX_LINES" ] && [ "$b" -le "$MAX_BYTES" ]; then
    ok "CLAUDE.md: $l righe, $b byte (limiti $MAX_LINES / $MAX_BYTES)"
  else
    err "CLAUDE.md: $l righe, $b byte — sopra i limiti $MAX_LINES righe / $MAX_BYTES byte: la prima cosa da spostare è la mappa (Reference docs → docs/overview.md), poi le decisioni di area in .claude/rules/"
  fi
  # imports: lines starting with @ outside fenced code blocks.
  # ⚠️ The slash inside the bracket expression MUST be escaped: BSD awk (macOS) ends the
  # /regex/ at the first unescaped slash, fails with «nonterminated character class», prints
  # nothing, and an empty result used to read as «no imports» — a false alarm on every Mac.
  # An awk failure is now reported as such, never mistaken for an empty result.
  if ! imports=$(awk '/^```/{fence=!fence; next} !fence && /^@[A-Za-z0-9_.\/~-]+/{print $1}' CLAUDE.md 2>&1); then
    err "awk non è riuscito a leggere gli import di CLAUDE.md: $imports"
  elif [ -z "$imports" ]; then
    warn "CLAUDE.md non importa @AGENTS.md (se AGENTS.md esiste: con un CLAUDE.md presente Claude Code lo salta, e il ponte @AGENTS.md è l'unico modo che vale per chiunque cloni il repo)"
  else
    for i in $imports; do
      if [ "$i" = "@AGENTS.md" ]; then ok "import $i"; else warn "import $i: gli @import si caricano all'avvio e non alleggeriscono nulla; preferire un rimando in prosa"; fi
    done
  fi
  grep -q '^## Baseline' CLAUDE.md && ok "sezione Baseline presente" || warn "manca la sezione '## Baseline' (i numeri con la data stanno solo lì)"
  grep -qiE '^## (Firme e trappole|Trappole)' CLAUDE.md && ok "sezione Firme e trappole presente" || warn "manca la sezione '## Firme e trappole'"
else
  err "CLAUDE.md assente"
fi

# ---------------------------------------------------------------- ancestors
# Every CLAUDE.md / CLAUDE.local.md in a directory ABOVE the repo loads at the start of every
# session, whole, on top of the repo's own: its weight counts and its rules compete.
hdr "CLAUDE.md nelle cartelle sopra il repo (si caricano a ogni sessione)"
found=0
dir=$(cd .. && pwd)
while :; do
  for f in "$dir/CLAUDE.md" "$dir/CLAUDE.local.md"; do
    [ -f "$f" ] || continue
    found=1
    warn "$f: $(( $(wc -l < "$f") )) righe, $(( $(wc -c < "$f") )) byte, caricato a ogni sessione. Se non serve a questo repo: claudeMdExcludes, poi verifica con /context"
  done
  [ "$dir" = "/" ] && break
  dir=$(dirname "$dir")
done
[ "$found" = 0 ] && ok "nessun CLAUDE.md nelle cartelle sopra il repo"

# ---------------------------------------------------------------- AGENTS.md
hdr "AGENTS.md"
if [ -f AGENTS.md ]; then
  l=$(( $(wc -l < AGENTS.md) ))
  [ "$l" -le 60 ] && ok "AGENTS.md: $l righe" || warn "AGENTS.md: $l righe — lo standard vuole 20–30 righe alla radice"
  grep -q 'BEGIN:nextjs-agent-rules' AGENTS.md && ok "blocco Next auto-generato presente (si committa, non si rimuove dal diff)"
else
  warn "AGENTS.md assente (facoltativo se legge il repo solo Claude Code; se esiste va importato da CLAUDE.md)"
fi

# ---------------------------------------------------------------- rules
hdr ".claude/rules/"
if [ -d .claude/rules ]; then
  for r in .claude/rules/*.md; do
    [ -e "$r" ] || continue
    if head -20 "$r" | grep -q '^paths:'; then ok "$r ha paths: (caricata solo sui file dell'area)"; else warn "$r senza paths: si carica sempre, come CLAUDE.md"; fi
  done
else
  echo "nessuna rule di area (normale in un repo piccolo)"
fi

# ---------------------------------------------------------------- history
hdr "docs/history"
if [ -f docs/history.md ]; then
  if grep -qF '| data | voce | PR |' docs/history.md && grep -qF '|---|---|---|' docs/history.md; then
    ok "docs/history.md ha l'ancora della tabella"
  else
    err "docs/history.md senza l'ancora '| data | voce | PR |' + '|---|---|---|': history-index.mjs non può rigenerarlo"
  fi
else
  err "docs/history.md assente"
fi
if [ -d docs/history ]; then
  bad=0
  for v in docs/history/*.md; do
    [ -e "$v" ] || continue
    base=$(basename "$v")
    echo "$base" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md$' || { warn "$v: il nome non è AAAA-MM-GG-slug.md"; bad=1; }
    head -1 "$v" | grep -q '^# ' || { warn "$v: la prima riga non è '# Titolo'"; bad=1; }
    grep -qE '^> [0-9]{1,2}(-[0-9]{1,2})? [a-z]+ [0-9]{4}' "$v" || { warn "$v: manca la riga '> giorno mese anno · PR #N' (senza PR: '· nessuna PR: motivo')"; bad=1; }
  done
  [ "$bad" = 0 ] && ok "tutte le voci hanno nome, titolo e riga di intestazione"
fi

# ---------------------------------------------------------------- living docs
hdr "Documenti vivi: numeri e rassicurazioni (da verificare, non da correggere qui)"
for d in docs/overview.md ARCHITECTURE.md; do
  [ -f "$d" ] || continue
  n=$(grep -nE '\b[0-9]{2,}\b[[:space:]]+(test|file|righe|voci|query|modelli|documenti|pagine|rotte|componenti|alert)\b' "$d" | wc -l | tr -d ' ')
  [ "$n" = 0 ] && ok "$d: nessun conteggio al presente" || { warn "$d: $n righe con un conteggio (i numeri stanno solo in CLAUDE.md § Baseline)"; grep -nE '\b[0-9]{2,}\b[[:space:]]+(test|file|righe|voci|query|modelli|documenti|pagine|rotte|componenti|alert)\b' "$d" | head -8 | sed 's/^/           /'; }
  m=$(grep -niE '\b(resta|restano|rimane|rimangono|esiste ancora|esistono ancora|è ancora|sono ancora)\b' "$d" | wc -l | tr -d ' ')
  [ "$m" = 0 ] && ok "$d: nessuna rassicurazione" || { warn "$d: $m rassicurazioni («resta», «ancora»): verificarle per prime"; grep -niE '\b(resta|restano|rimane|rimangono|esiste ancora|esistono ancora|è ancora|sono ancora)\b' "$d" | head -8 | sed 's/^/           /'; }
done

# ---------------------------------------------------------------- two maps
hdr "Mappe"
if [ -f ARCHITECTURE.md ] && [ -f docs/overview.md ]; then
  head -8 ARCHITECTURE.md | grep -qiE 'stale|si aggiorna a ogni' && ok "ARCHITECTURE.md porta la regola di freschezza in testa" || warn "ARCHITECTURE.md e docs/overview.md convivono: uno è la mappa, l'altro il perché; ARCHITECTURE.md deve dire in testa se è aggiornato o stale"
elif [ -f docs/overview.md ]; then ok "una mappa sola: docs/overview.md"
else warn "docs/overview.md assente"; fi

# ---------------------------------------------------------------- genres
hdr "Generi (docs/ e dintorni)"
find docs scripts .claude -name '*.md' 2>/dev/null \
  -not -path 'docs/history/*' -not -path 'docs/archive/*' | sort | while read -r f; do
  g="SENZA GENERE"
  head -12 "$f" | grep -qi 'DOCUMENTO STORICO' && g="spec superata a metà (resta al suo posto)"
  case "$f" in
    docs/overview.md|docs/history.md) g="nucleo" ;;
    docs/TAXONOMY.md) [ "$g" = "SENZA GENERE" ] && g="spec — verificare se superata: serve il riquadro in testa" ;;
    docs/manutenzione-log.md) g="registro interventi" ;;
    docs/deploy/*) g="deploy" ;;
    docs/guide/*|docs/guida-*|docs/procedura-*) g="guida operativa" ;;
    docs/cantieri/*|docs/*-design.md) g="cantiere" ;;
    docs/design-specs/*) g="spec di design" ;;
    docs/specs/PROMPT-*) g="prompt come specifica" ;;
    docs/audit/*) g="audit" ;;
    docs/content/*) g="riferimento dati" ;;
    docs/decisions/*) g="decisione (ADR)" ;;
    docs/runbook/*) g="runbook" ;;
    docs/*-PLAN.md|docs/*-plan.md) g="piano datato — NON SE NE CREANO PIÙ (un piano nuovo è un cantiere)" ;;
    docs/*-report.md) g="report di lavoro — NON SE NE CREANO PIÙ (un report è una voce di history)" ;;
    docs/TODO*|docs/todo*) g="TODO tracker — VIETATO (archiviare con triage)" ;;
    scripts/*-apply-log.md|scripts/*-log.md) g="log one-shot" ;;
    .claude/agents/*) g="subagente" ;;
    .claude/rules/*) g="rule di area" ;;
    .claude/skills/*) g="skill" ;;
  esac
  printf '%-44s %s\n' "$g" "$f"
done

# ---------------------------------------------------------------- gitignore
hdr ".gitignore"
if [ -f .gitignore ]; then
  for p in '/tmp/' 'CLAUDE.local.md' '.env'; do
    grep -qF "$p" .gitignore && ok "ignora $p" || warn ".gitignore non copre $p"
  done
  grep -qF '!.env.example' .gitignore && ok "tiene .env.example" || warn ".env.example non è escluso dall'ignore"
else
  warn ".gitignore assente"
fi

# ---------------------------------------------------------------- summary
hdr "Riepilogo"
echo "errori: $errors · avvisi: $warnings · data: $today"
echo "Prossimo passo: le righe SENZA GENERE e gli ERRORE vanno decisi con il responsabile prima di spostare qualsiasi cosa."
exit 0
