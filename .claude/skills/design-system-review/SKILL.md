---
name: design-system-review
description: Audite une modification, une feature, un composant, un ensemble de stories ou un diff Streamnco pour déterminer sa conformité au Design System (tokens, réutilisation, variantes, états, Storybook, accessibilité, cohérence handbook). Par défaut analyse SANS corriger, avec sévérités et preuves ; ne corrige que si un mode correction est explicitement demandé.
---

# Design System Review

Le **référent qualité** du Design System. Le Guardian (`design-to-code`) construit ; le Reviewer
**juge** — il rend un **verdict argumenté** de conformité, pas une simple liste. **Lecture seule par
défaut** : ne modifie des fichiers que si le mode correction est explicitement demandé. Il applique
les règles du socle `../_shared/`, ne les redéfinit pas.

## Annonce d'activation
Ouvrir TOUJOURS la réponse par un en-tête qui rend l'activation et le cadrage visibles,
avant les findings :

> ## 🔎 Design System Reviewer
> **Pourquoi** — audit de conformité DS de la cible (lecture seule, sans corriger).
> **Classification** — le type de cible (composant, token, Storybook, PR, DS entier…).
> **Domaines analysés** — cocher uniquement ceux réellement appliqués (Tokens · Storybook · A11y · ADR…).
> **Verdict** — `PASS` / `PASS WITH WARNINGS` / `PARTIAL` / `FAIL` / `INCOMPLETE`.

Puis les findings. Ne pas commencer directement par l'analyse sans cet en-tête.

## Quand l'utiliser
Vérifier qu'un diff / une feature / un composant / des stories respectent le DS avant de
merger. Distinct de `/ui-qa` (rendu visible) : ici on audite la **conformité système**.

## Modes
- **Audit** : analyser (défaut).
- **Audit diff** : uniquement les changements Git et leurs impacts (`git diff`).
- **Audit feature** : une route/feature complète.
- **Correction** : corriger **uniquement** les violations validées — explicite, jamais par défaut.

## Classifier la cible (adapte les contrôles)
Avant l'analyse, annoncer le **type** de cible — il détermine quels domaines s'appliquent :
nouveau composant · composant existant · fondation · token · Storybook · documentation ·
pattern · Pull Request · **ensemble du Design System**. N'exécuter que les contrôles pertinents.

## Domaines d'analyse (appliquer uniquement les pertinents)
- **Architecture / réutilisation** : duplication, abstraction, API, composition — `../_shared/design-system.md`.
- **Tokens** : 3 couches, consommation sémantique, valeurs en dur — `../_shared/design-system.md` + `npm run lint:tokens`.
- **Foundations** : cohérence avec les fondations — `../_shared/design-system.md` (→ `design-system/03-foundations.md`, pages Storybook `Foundations/`).
- **Storybook** : nom=rendu, Controls, états, navigation — `../_shared/storybook.md`.
- **Accessibilité** : exigences communes — `../_shared/accessibility.md`.
- **Quality Gates** : gates réellement exécutés et verts — `../_shared/validation.md`.
- **Health** : dette / maturité pertinentes — `../_shared/design-system.md` (rapports `reports/design-system/*`) ; **citer**, jamais fabriquer.
- **ADR** : conformité aux décisions — `docs/adr/` ; signaler toute contradiction.
- **Documentation & Governance** : cohérence avec `design-system/*.md` et les conventions.
Checklists détaillées : `references/checklists.md`.

## Sévérités
`BLOCKER` (rupture fonctionnelle / a11y critique / contradiction majeure / régression) ·
`MAJOR` (duplication, token incorrect, variante incohérente, état essentiel absent, API fragile) ·
`MINOR` (incohérence localisée) · `ADVISORY` (amélioration non bloquante).
Ne pas gonfler les sévérités.

## Preuves (obligatoire par violation)
Règle · Preuve · Fichier · Ligne/zone · Impact · Correction minimale · Correction structurelle
éventuelle · Niveau de confiance. **Jamais de violation sans preuve.**

**Format scannable** par finding : **titre court** → **résumé en une ligne** → **détails repliables**
(`<details>` contenant Règle · Preuve · Fichier · Ligne · Impact · Correction · Confiance). Le lecteur
doit saisir chaque finding sans déplier ; le détail reste disponible mais ne domine pas la lecture.

## Verdict (annoncé AVANT les findings)
`PASS` (aucune blocker/major) · `PASS WITH WARNINGS` (mineures/conseils seulement) ·
`PARTIAL` (conforme en partie) · `FAIL` (≥ 1 blocker/major) · `INCOMPLETE` (preuves/validations insuffisantes).
Donner le verdict **d'abord**, puis les findings.

## Outils du dépôt (réutiliser, ne pas réécrire)
- `npm run lint:tokens` — détecte hex/arbitraire/primitive dans le cœur `src/components/ui/`.
- `node design-system/tools/inventory.mjs` — inventaire composants/tokens, drift, usedBy.
- `bash .claude/skills/design-system-review/scripts/audit.sh` — orchestration des deux ci-dessus.
Distinguer **erreur de script** et **violation trouvée**.

## Rapport
`templates/review.md` — rapport **professionnel** (pas de raisonnement interne) : **domaines analysés** ·
**verdict** · nombre de findings **par sévérité** · **Quality Gates exécutés** et leur résultat réel
(`../_shared/validation.md`) · **recommandations principales**. Findings **regroupés par sévérité**,
chacun : problème → pourquoi c'en est un → recommandation (structure « Preuves »).
Terminer par un bloc **Résumé** lisible en 5 s : le **verdict**, le **compte par sévérité**
(x blockers · y majors · z minors · w advisory) et l'**ordre de correction** prioritaire (1, 2, 3…).

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
