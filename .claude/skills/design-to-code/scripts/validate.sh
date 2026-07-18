#!/usr/bin/env bash
# Lance la matrice de validation RÉELLE de Streamnco et rapporte chaque étape.
# N'invente aucune commande : chacune existe dans package.json (voir ../_shared/validation.md).
#
#   bash .claude/skills/design-to-code/scripts/validate.sh          # bloquantes
#   bash .claude/skills/design-to-code/scripts/validate.sh --full   # + build prod
#
# Sortie : code 0 si toutes les validations BLOQUANTES passent, 1 sinon.
# eslint est rapporté mais NON bloquant (dette legacy connue).
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 2
log="$(mktemp)"; blocking_fail=0

run() { # <label> <bloquant:0/1> <cmd...>
  local label="$1" blocking="$2"; shift 2
  printf '  %-26s ' "$label"
  if "$@" >"$log" 2>&1; then
    echo "PASS"
  else
    if [ "$blocking" = "1" ]; then echo "FAIL (bloquant)"; blocking_fail=1
    else echo "FAIL (non bloquant)"; fi
    sed 's/^/      /' "$log" | tail -4
  fi
}

echo "Validation Streamnco :"
run "typecheck (tsc)"        1 npm run typecheck
run "garde-fou tokens"       1 npm run lint:tokens
run "tests (vitest)"         1 npm run test
run "build-storybook"        1 npm run build-storybook
[ "${1:-}" = "--full" ] && run "build production (vite)" 1 npm run build
run "eslint (dette legacy)"  0 npm run lint

rm -f "$log"
echo ""
if [ "$blocking_fail" = "0" ]; then echo "→ Validations bloquantes : PASS"; exit 0
else echo "→ Validations bloquantes : FAIL"; exit 1; fi
