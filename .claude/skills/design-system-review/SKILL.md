---
name: design-system-review
description: Audite une modification, une feature, un composant, un ensemble de stories ou un diff Streamnco pour déterminer sa conformité au Design System (tokens, réutilisation, variantes, états, Storybook, accessibilité, cohérence handbook). Par défaut analyse SANS corriger, avec sévérités et preuves ; ne corrige que si un mode correction est explicitement demandé.
---

# Design System Review

Audit de conformité au Design System. **Lecture seule par défaut** : ne modifie des
fichiers que si l'utilisateur demande explicitement le mode correction.

## Quand l'utiliser
Vérifier qu'un diff / une feature / un composant / des stories respectent le DS avant de
merger. Distinct de `/ui-qa` (rendu visible) : ici on audite la **conformité système**.

## Modes
- **Audit** : analyser (défaut).
- **Audit diff** : uniquement les changements Git et leurs impacts (`git diff`).
- **Audit feature** : une route/feature complète.
- **Correction** : corriger **uniquement** les violations validées — explicite, jamais par défaut.

## Périmètre contrôlé
Tokens (architecture, consommation, valeurs en dur) · composants (existant, duplication,
abstraction, API, variantes, états, composition) · thème · responsive · Storybook · doc ·
accessibilité liée au composant · cohérence avec `design-system/*.md`.
Checklists détaillées : `references/checklists.md`.

## Sévérités
`BLOCKER` (rupture fonctionnelle / a11y critique / contradiction majeure / régression) ·
`MAJOR` (duplication, token incorrect, variante incohérente, état essentiel absent, API fragile) ·
`MINOR` (incohérence localisée) · `ADVISORY` (amélioration non bloquante).
Ne pas gonfler les sévérités.

## Preuves (obligatoire par violation)
Règle · Preuve · Fichier · Ligne/zone · Impact · Correction minimale · Correction structurelle
éventuelle · Niveau de confiance. **Jamais de violation sans preuve.**

## Verdict
`PASS` (aucune blocker/major) · `PASS WITH WARNINGS` (mineures/conseils seulement) ·
`FAIL` (≥ 1 blocker/major) · `INCOMPLETE` (preuves/validations insuffisantes).

## Outils du dépôt (réutiliser, ne pas réécrire)
- `npm run lint:tokens` — détecte hex/arbitraire/primitive dans le cœur `src/components/ui/`.
- `node design-system/tools/inventory.mjs` — inventaire composants/tokens, drift, usedBy.
- `bash .claude/skills/design-system-review/scripts/audit.sh` — orchestration des deux ci-dessus.
Distinguer **erreur de script** et **violation trouvée**.

## Sortie
`templates/review.md`. Renseigner les validations réellement exécutées (`../_shared/validation.md`).

## Définition de terminé
Périmètre et sources posés ; verdict rendu ; chaque violation prouvée et cotée ; points
conformes listés ; ordre de correction proposé ; limites de l'audit documentées ; en mode
lecture seule, **aucun fichier modifié**.

## Références communes
- Discipline de preuve (fait/inférence/hypothèse) : `../_shared/sources-and-evidence.md`.
- Faits du dépôt : `../_shared/repo-map.md`.
- Règles Design System auditées : `../_shared/design-system.md`.
- Règles Storybook auditées : `../_shared/storybook.md`.
- Patterns d'écran (contrôler la cohérence composant/pattern, si pertinent) : `../../patterns/README.md`.

## Handoff
Produit une liste de violations vérifiables pour `/design-to-code` (correction) ou pour
`/ui-qa` (vérification du rendu). Ne délègue rien automatiquement.
