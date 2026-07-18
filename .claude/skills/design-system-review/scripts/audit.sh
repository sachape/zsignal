#!/usr/bin/env bash
# Orchestration LECTURE SEULE des outils DS EXISTANTS (ne les réécrit pas).
# Garantie : le dépôt est byte-identique après exécution. inventory.mjs régénère
# design-system/artifacts/manifest.json (fichier suivi) → on le sauvegarde et on
# le restaure (ou on le supprime s'il n'existait pas).
# Distingue « erreur de script » (exit 2) de « violations trouvées » (exit 1).
#
#   bash .claude/skills/design-system-review/scripts/audit.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 2

[ -f design-system/tools/lint-tokens.mjs ] || { echo "outil absent: lint-tokens.mjs"; exit 2; }
[ -f design-system/tools/inventory.mjs ]  || { echo "outil absent: inventory.mjs"; exit 2; }

MANIFEST="design-system/artifacts/manifest.json"
BAK="$(mktemp)"; had_manifest=0
[ -f "$MANIFEST" ] && { had_manifest=1; cp "$MANIFEST" "$BAK"; }
restore() { # remet le dépôt dans son état initial
  if [ "$had_manifest" = "1" ]; then cp "$BAK" "$MANIFEST"; else rm -f "$MANIFEST"; fi
  rm -f "$BAK"
}
trap restore EXIT INT TERM

echo "== Garde-fou tokens (src/components/ui/ strict) =="
if npm run --silent lint:tokens; then tokens_ok=1; else tokens_ok=0; fi

echo ""
echo "== Inventaire composants / tokens (drift, usedBy) — manifeste régénéré puis RESTAURÉ =="
node design-system/tools/inventory.mjs 2>&1 | tail -14

echo ""
if [ "$tokens_ok" = "1" ]; then
  echo "→ Garde-fou tokens : PASS (voir l'inventaire ci-dessus pour la dette hors-cœur)."
  code=0
else
  echo "→ Garde-fou tokens : VIOLATIONS dans le cœur DS (voir ci-dessus)."
  code=1
fi
# restore() est appelé par le trap EXIT → dépôt inchangé.
exit "$code"
