#!/usr/bin/env bash
# Orchestration lecture seule des outils DS EXISTANTS (ne les réécrit pas).
# Distingue « erreur de script » (exit 2) de « violations trouvées » (exit 1).
#
#   bash .claude/skills/design-system-review/scripts/audit.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 2

[ -f design-system/tools/lint-tokens.mjs ] || { echo "outil absent: lint-tokens.mjs"; exit 2; }
[ -f design-system/tools/inventory.mjs ]  || { echo "outil absent: inventory.mjs"; exit 2; }

echo "== Garde-fou tokens (src/components/ui/ strict) =="
if npm run --silent lint:tokens; then tokens_ok=1; else tokens_ok=0; fi

echo ""
echo "== Inventaire composants / tokens (drift, usedBy) =="
node design-system/tools/inventory.mjs 2>&1 | tail -14

echo ""
if [ "$tokens_ok" = "1" ]; then
  echo "→ Garde-fou tokens : PASS (voir l'inventaire ci-dessus pour la dette hors-cœur)."
  exit 0
else
  echo "→ Garde-fou tokens : VIOLATIONS dans le cœur DS (voir ci-dessus)."
  exit 1
fi
