# Évaluation des Skills

Résultats **réellement** obtenus lors de l'installation. Aucun résultat fabriqué.

## Validation structurelle (exécutée)
| Contrôle | Résultat |
|---|---|
| 5 `SKILL.md` présents, `name` == nom du dossier | ✓ |
| Frontmatter limité à `name` + `description` (aucun champ inventé) | ✓ |
| Descriptions distinctes et orientées « quand utiliser » | ✓ |
| Liens relatifs (`../_shared`, `references`, `templates`, `examples`, `scripts`) résolvent | ✓ |
| Aucun dossier vide | ✓ |
| Scripts `chmod +x` | ✓ |

## Scripts (exécutés sur le dépôt)
- `bash .claude/skills/design-system-review/scripts/audit.sh` → **PASS** :
  garde-fou tokens OK, inventaire « VRAIE DÉRIVE : 0 ». Distingue erreur de script (exit 2)
  et violations (exit 1).
- `bash .claude/skills/design-to-code/scripts/validate.sh` → **validations bloquantes PASS**
  (typecheck, lint:tokens, tests vitest, build-storybook) ; eslint rapporté **FAIL non bloquant**
  (dette legacy). Exit 0.

## Scénarios (lecture seule) — conformité vérifiée sur le CONTENU du Skill
Note : les Skills nouvellement créés ne sont PAS auto-détectés dans la session courante
(voir « Détection » plus bas). L'évaluation ci-dessous vérifie que chaque Skill est
**exécutable contre le dépôt réel** (chemins existants, commandes réelles, garde-fous), pas
qu'une slash-command a été invoquée.

| Scénario | Skill | Conformité constatée | Défauts / correctifs |
|---|---|---|---|
| A · Nouvelle feature depuis un brief | product-discovery | Read-only, sépare problème/solution et faits/hypothèses, exige des critères observables, produit un handoff. Ne code pas. | — |
| B · Refonte d'une route existante | design-to-code | Impose inspection AVANT édition, arbre de réutilisation, tokens sémantiques, plan puis validation via `validate.sh` (réel). | — |
| C · Création/extension d'un composant | design-to-code | Arbre réutiliser/étendre/composer/créer + Storybook (nom=rendu, Controls, a11y) + tests. | — |
| D · Documentation d'une feature legacy | code-to-design | Modes A–D, sépare fait/recommandation, n'affirme aucune action Figma, spec Figma-ready. | — |
| E · Audit d'un diff | design-system-review | Lecture seule par défaut, sévérités, preuve obligatoire, verdict ; réutilise `lint:tokens`/`inventory` (script exécuté). | — |
| F · QA d'une page/de stories | ui-qa | Préconditions (comment rendre), viewports documentés, n'affirme pas avoir vu un rendu non produit, verdict justifié. | — |

## Détection dans Claude Code
Les Skills sont découverts depuis `.claude/skills/*/SKILL.md` **au démarrage d'une session**.
La session courante ne les recharge pas automatiquement : pour les invoquer
(`/product-discovery`, etc.), **démarrer une nouvelle session Claude Code dans ce dépôt**.
Aucune détection n'est prétendue dans la session actuelle.

## Correctifs appliqués pendant l'installation
- Scripts rendus exécutables (`chmod +x`).
- Vérification que les commandes citées existent réellement dans `package.json` (aucune inventée).
- eslint identifié comme échec **préexistant** (dette Lovable), pas une régression.
