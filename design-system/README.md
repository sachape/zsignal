# Streamnco Design System

Source de vérité du design system Streamnco (système **app**, dark + lime).
Construit par le pipeline AI Product Design — de l'audit à la surface
interrogeable par un designer **et** par un agent (MCP).

Méthode : *AI Product Design Handbook* (le manuel `designwithai`).

---

## Pourquoi ce dossier existe

Test décisif : *un designer qui rejoint demain peut-il répondre à ces quatre
questions sans demander à personne ?*

1. Combien de composants, et lesquels sont réutilisables ?
2. Comment chacun est construit — props, variants, états ?
3. Quels tokens existent, et que signifient-ils ?
4. Dans lequel des deux systèmes visuels suis-je ?

Aujourd'hui : non aux quatre. Ce dossier existe pour que la réponse devienne oui.

## Le pipeline

| Phase | Livrable | Outil | État |
|---|---|---|---|
| **0** Cadrage & preuves | `00-audit.md` | — | ✅ fait |
| **1** Inventaire & classification | `01-inventory.md` + `artifacts/manifest.json` | `tools/inventory.mjs` | ✅ fait |
| **2** Consolidation des tokens | `02-tokens.md` + `artifacts/tokens.json` | Style Dictionary (à décider) | ⏳ suivant |
| **3** Extraction des API composant | `specs/*.md` | agent d'extraction | ⬜ |
| **4** Storybook = source de vérité | `.storybook/` + `*.stories.tsx` | **Storybook** | ⬜ |
| **5** Couche IA / MCP | `src/lib/mcp/tools/ds-*` | MCP existant | ⬜ |
| **6** Gouvernance & prompt-to-UI | `06-governance.md` | — | ⬜ |

## Ce qu'on sait déjà (Phases 0-1)

- Le DS, c'est **~65 composants** (49 primitives shadcn + ~16 patterns), pas 217.
  Le reste sont des **consommateurs** (composites de feature, pages).
- **Aucun des 16 patterns n'a d'API de variant** (CVA) → chantier de la Phase 3.
- La dérive couleur (**85** valeurs en dur) est concentrée sur **7 fichiers**,
  dont deux catégories sont des **tokens manquants**, pas de la dérive
  (couleurs de plateformes, palette data-viz).
- Le **MCP existe déjà** (`streamnco-mcp`) — la Phase 5 étend, ne crée pas.

## Régénérer l'inventaire (détection de dérive)

```bash
node design-system/tools/inventory.mjs
```

Re-jouable : relancé après des changements, il mesure si la dérive augmente ou
diminue. C'est le « lint DS » du Vol.1 Ch.13.

## Périmètre

- **Dans le scope** : le système app (dark + lime, tokens CSS existants).
- **Hors scope pour l'instant** : le système marketing `el/Fraunces` (public),
  documenté comme système séparé, phase ultérieure.
- **Non-objectif** : pas de rebrand. Les `DESIGN.md` (getdesign) sont des
  principes, jamais un modèle à copier.
