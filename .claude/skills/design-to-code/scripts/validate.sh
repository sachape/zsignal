#!/usr/bin/env bash
# Lance la matrice de validation RÉELLE de Streamnco et rapporte chaque étape.
# N'invente aucune commande : chacune existe dans package.json (voir ../_shared/validation.md).
#
#   bash .claude/skills/design-to-code/scripts/validate.sh          # bloquantes
#   bash .claude/skills/design-to-code/scripts/validate.sh --full   # + build prod
#
# ESLint : la dette HISTORIQUE reste un warning ; toute NOUVELLE erreur introduite
# dans un fichier modifié (vs HEAD) est BLOQUANTE. Aucune régression ne peut passer PASS.
#
# Sortie : 0 si toutes les validations bloquantes passent (dont « 0 nouvelle erreur eslint »), 1 sinon.
# Sans effet de bord sur les fichiers suivis (les builds écrivent des artefacts gitignorés).
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 2
log="$(mktemp)"; blocking_fail=0
ESLINT="./node_modules/.bin/eslint"

run() { # <label> <bloquant:0/1> <cmd...>
  local label="$1" blocking="$2"; shift 2
  printf '  %-26s ' "$label"
  if "$@" >"$log" 2>&1; then echo "PASS"; else
    if [ "$blocking" = "1" ]; then echo "FAIL (bloquant)"; blocking_fail=1; else echo "FAIL (non bloquant)"; fi
    sed 's/^/      /' "$log" | tail -4
  fi
}

# Total errorCount d'une sortie eslint JSON lue sur stdin.
sum_json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).reduce((a,f)=>a+(f.errorCount||0),0))}catch{console.log(0)}})'; }
# errorCount d'un contenu de fichier (stdin) linté SOUS son chemin réel (résolution de config).
file_errors() { "$ESLINT" --stdin --stdin-filename "$1" -f json 2>/dev/null | sum_json; }

eslint_gate() {
  echo "  ESLint (diff-scoped) :"
  if [ ! -x "$ESLINT" ] || ! git rev-parse HEAD >/dev/null 2>&1; then
    echo "      (eslint ou HEAD indisponible → gate advisory, non bloquant)"; return
  fi
  local changed new_total=0 now base d f
  changed="$( { git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx';
                git ls-files --others --exclude-standard -- '*.ts' '*.tsx'; } 2>/dev/null | sort -u )"
  while IFS= read -r f; do
    [ -z "$f" ] && continue; [ -f "$f" ] || continue
    now="$(cat "$f" | file_errors "$f")"
    if git cat-file -e "HEAD:$f" 2>/dev/null; then base="$(git show "HEAD:$f" | file_errors "$f")"; else base=0; fi
    d=$(( now - base )); [ "$d" -lt 0 ] && d=0; new_total=$(( new_total + d ))
  done <<< "$changed"
  local total_now legacy
  total_now="$("$ESLINT" . -f json 2>/dev/null | sum_json)"
  legacy=$(( total_now - new_total )); [ "$legacy" -lt 0 ] && legacy=0
  echo "      Legacy issues (dette préexistante)        : $legacy  [warning]"
  echo "      New issues introduced (fichiers modifiés) : $new_total"
  if [ "$new_total" -gt 0 ]; then echo "      Verdict ESLint : FAIL (nouvelle régression → bloquant)"; blocking_fail=1
  else echo "      Verdict ESLint : PASS (aucune nouvelle erreur ; dette = warning)"; fi
}

echo "Validation Streamnco :"
run "typecheck (tsc)"        1 npm run typecheck
run "garde-fou tokens"       1 npm run lint:tokens
run "tests (vitest)"         1 npm run test
run "build-storybook"        1 npm run build-storybook
[ "${1:-}" = "--full" ] && run "build production (vite)" 1 npm run build
eslint_gate

rm -f "$log"
echo ""
if [ "$blocking_fail" = "0" ]; then echo "→ Validations bloquantes : PASS"; exit 0
else echo "→ Validations bloquantes : FAIL"; exit 1; fi
