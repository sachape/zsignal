---
name: design-to-code
description: Implémente ou refond une feature, page, pattern ou composant Streamnco à partir d'une intention produit (sortie de product-discovery, brief, critères d'acceptation, interface existante, Storybook, ou Figma facultatif). Inspecte AVANT de créer, réutilise le Design System, synchronise stories/tests, et valide avec les commandes réelles du dépôt.
---

# Design to Code

Traduire une intention en implémentation **conforme** à l'architecture, aux tokens, à
Storybook et aux standards du dépôt. Jamais de traduction aveugle d'une maquette.

Boucle : **comprendre → inspecter → réutiliser → planifier → implémenter → documenter → tester → valider.**

## Quand l'utiliser
Créer/refondre une feature, une page, un pattern, un composant ; migrer ou corriger une UI —
dans n'importe quel domaine du produit. Sources : product-discovery, brief, critères
d'acceptation, audit, interface existante, composants Storybook, Figma **facultatif**, captures.

## Quand NE PAS l'utiliser
Seulement cadrer (`/product-discovery`), seulement documenter l'existant (`/code-to-design`),
seulement auditer (`/design-system-review`) ou faire la QA (`/ui-qa`).

## Phases (détails dans references/)
- **A · Qualifier** : sources, contradictions, hiérarchie d'autorité (`../_shared/sources-and-evidence.md`),
  objectif reformulé, critères, parcours/états, nature de la tâche, ce qui doit rester inchangé.
- **B · Inspecter le dépôt AVANT d'éditer** : route/feature, logique métier, appels de données,
  composants génériques/métier, tokens, styles, stories, tests, patterns analogues, conventions,
  règles DS concernées. Produire un **inventaire court**.
- **C · Décision de réutilisation** : arbre réutiliser / étendre / composer / créer
  (`../_shared/design-system.md`). Documenter pourquoi l'existant ne suffit pas.
- **D · Tokens & styling** : `../_shared/design-system.md`. Sémantique > primitive, zéro valeur
  en dur, thèmes light/dark. Token manquant → procédure documentée + `npm run tokens:build`.
- **E · États** : couvrir les états pertinents ; documenter les non-applicables. `references/states.md`.
- **F · Responsive** : `references/responsive.md` (breakpoints réels, comportement > proportion).
- **G · Accessibilité** : `references/accessibility.md` (clavier, focus, noms accessibles, contraste…).
- **H · Storybook** : `../_shared/storybook.md` (nom=rendu, Controls cohérents, états, interactions, mocks déterministes).
- **I · Tests** : stack réelle (`../_shared/validation.md`) ; tester les comportements/critères,
  pas l'implémentation.
- **J · Figma (facultatif)** : si fourni ET accessible → source d'intention ; sinon ne pas le réclamer,
  poursuivre avec brief/code/Storybook/DS.
- **K · Plan** : produire `templates/plan.md` AVANT d'éditer (proportionné à la tâche).
- **L · Implémenter** : changements limités et cohérents ; pas de refactor hors périmètre ; pas de `any`
  de facilité ; API publiques préservées sauf nécessité ; code, stories, tests, doc synchronisés.
- **M · Valider** : exécuter les commandes réelles (`../_shared/validation.md`). Diagnostiquer/corriger
  les échecs causés par les modifications ; distinguer régression vs dette préexistante.

## Rapport
Produire `templates/report.md` avec un état final **PASS / PARTIAL / FAIL** factuel.

## Définition de terminé
Critères couverts ; logique métier préservée (ou modif. explicitement autorisée) ; existant réutilisé ;
aucune duplication injustifiée ; tokens conformes (`npm run lint:tokens`) ; stories synchronisées ;
tests pertinents présents ; responsive + a11y vérifiés ; commandes obligatoires exécutées ; rapport factuel.

## Handoff
Recommander `/design-system-review` (audit conformité) puis `/ui-qa` (rendu) après implémentation.
Ne délègue rien automatiquement.
