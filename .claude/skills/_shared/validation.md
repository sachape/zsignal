# Matrice de validation (commandes RÉELLES)

Détectées dans `package.json`. Ne jamais inventer de commande absente.

| Validation | Commande | État |
|---|---|---|
| TypeScript | `npm run typecheck` | disponible (passe) |
| Lint (eslint) | `npm run lint` | disponible mais **échoue** (~105 erreurs legacy) → non bloquant |
| Garde-fou tokens | `npm run lint:tokens` | disponible (passe) |
| Tests unit + interaction + a11y | `npm run test` | disponible (vitest : projet `unit` + projet `storybook` navigateur) |
| Build Storybook | `npm run build-storybook` | disponible |
| Build production | `npm run build` | disponible |
| (Re)génération des tokens | `npm run tokens:build` | disponible (déterministe) |
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

## Ordre recommandé
`npm run typecheck` → `npm run lint:tokens` → `npm run test` → `npm run build-storybook`
→ (`npm run build` si la tâche touche le runtime app).
