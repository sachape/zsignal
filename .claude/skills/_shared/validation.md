# Matrice de validation (commandes RÉELLES)

Détectées dans `package.json`. Ne jamais inventer de commande absente.

| Validation | Commande | État |
|---|---|---|
| TypeScript | `npm run typecheck` | disponible |
| Lint (eslint) | `npm run lint` | disponible ; peut exposer de la dette legacy hors périmètre → non bloquant (voir `repo-map.md`) |
| Garde-fou tokens | `npm run lint:tokens` | disponible (bloque hex/arbitraire/primitive dans le cœur `ui/`) |
| Tests unit + interaction + a11y | `npm run test` | disponible (vitest : projet `unit` + projet `storybook` navigateur) |
| Build Storybook | `npm run build-storybook` | disponible |
| Build production | `npm run build` | disponible |
| (Re)génération des tokens | `npm run tokens:build` | disponible (déterministe) |
| Audit Health complet (read-only) | `npm run audit:health` | régénère **TOUT** le dashboard `reports/design-system/*` (adoption, dette composants, fondations, spacing) — moteur `design-system/health/run.mjs` |
| Garde-fou global (umbrella) | `npm run check:health` | lance `check:spacing` + `check:foundations` + `check:components` en un seul appel |
| Garde-fou spacing (ratchet) | `npm run check:spacing` | échoue si la dette **spacing** AUGMENTE vs baseline (voir règle ci-dessous) |
| Garde-fou fondations (ratchet) | `npm run check:foundations` | échoue si régression **fondations** (radius/ombres/motion/couleurs) |
| Garde-fou composants (ratchet) | `npm run check:components` | échoue si la dette **composants** (`<button/input/select/textarea>` bruts) AUGMENTE par balise vs baseline |
| Relever une baseline (manuel) | `npm run baseline:spacing` · `baseline:foundations` · `baseline:components` · `baseline:health` | **manuel**, uniquement pour accepter volontairement une dette — jamais pour faire passer une régression |
| Régression visuelle | `chromatic` (workflow `.github/workflows/chromatic.yml`) | CI, nécessite un token projet |
| Tests e2e | — | **absent** (ne pas inventer) |

## Règles
- Ne jamais écrire « tout passe » sans avoir exécuté la commande et lu sa sortie.
- Distinguer un **échec préexistant** (ex. eslint legacy) d'une **régression introduite**
  par les modifications en cours.
- Une tâche ne peut pas être « terminée » si une validation obligatoire échoue à cause
  des modifications.
- Si une capacité manque (ex. e2e), le signaler comme **absente** et recommander, sans
  installer de stack sans nécessité démontrée.
- Ne jamais présenter un résultat historique à la place d'une validation réelle du run courant.

## Baseline ratchet (spacing) — décision : ADR `docs/adr/0002-spacing-check-compact-allowance.md`
- `check:spacing` **n'exige pas zéro** : il échoue seulement si les **violations OU le
  compact-allowed AUGMENTENT** au-dessus de la baseline figée (`reports/design-system/history/spacing-baseline.json`).
- Une **baisse** est autorisée sans mise à jour.
- **Ne JAMAIS** relever la baseline (`baseline:spacing`) pour faire passer une régression :
  la corriger, ou l'accepter explicitement en commit justifié après validation humaine.

## Ordre recommandé
`npm run typecheck` → `npm run lint:tokens` → `npm run check:health` → `npm run test`
→ `npm run build-storybook` → (`npm run build` si la tâche touche le runtime app).
