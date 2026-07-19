---
name: design-to-code
description: Implémente ou refond une feature, page, pattern ou composant Streamnco à partir d'une intention produit (sortie de product-discovery, brief, critères d'acceptation, interface existante, Storybook, ou Figma facultatif). Inspecte AVANT de créer, réutilise le Design System, synchronise stories/tests, et valide avec les commandes réelles du dépôt.
---

# Design to Code

Traduire une intention en implémentation **conforme** à l'architecture, aux tokens, à
Storybook et aux standards du dépôt. Jamais de traduction aveugle d'une maquette.

Ce Skill est le **gardien du Design System** : on peut lui confier une modification du DS sans
lui rappeler les bonnes pratiques. Toute modification passe par une **classification**, l'**arbre
de réutilisation**, la **gouvernance des tokens** et des **stop-conditions** explicites — les règles
communes vivent dans `../_shared/` (il les applique, ne les recopie pas).

Boucle : **classifier → analyser (inspecter · réutiliser · tokens) → décider (stratégie annoncée) → exécuter → rapport.**

## Quand l'utiliser
Créer/refondre une feature, une page, un pattern, un composant ; migrer ou corriger une UI —
dans n'importe quel domaine du produit. Sources : product-discovery, brief, critères
d'acceptation, audit, interface existante, composants Storybook, Figma **facultatif**, captures.

## Quand NE PAS l'utiliser
Seulement cadrer (`/product-discovery`), seulement documenter l'existant (`/code-to-design`),
seulement auditer (`/design-system-review`) ou faire la QA (`/ui-qa`).

## Classifier la demande (avant toute modification)
Toujours annoncer d'abord le **type** de demande — il guide toute la suite :
nouveau composant · extension d'un composant · nouveau variant · nouvelle prop · refactor ·
correctif · nouveau token · modification d'un token existant · **valeur qui ne doit PAS entrer
dans le DS** · **demande relevant du produit, pas du Design System**.

## Décision (annoncer AVANT d'exécuter)
Après l'inspection, l'arbre de réutilisation et la gouvernance des tokens (phases B–D), et
**avant de modifier le code** (phases K–M) : annoncer la **stratégie retenue** — pas le raisonnement
interne, juste le choix :
- réutiliser un composant existant ;
- étendre un variant ;
- composer plusieurs composants ;
- créer un nouveau composant ;
- **interrompre** l'implémentation (stop-condition).

Décision = ce qui **va** être fait · Rapport = ce qui a **réellement** été fait.

## Phases (détails dans references/)
- **A · Qualifier** : sources, contradictions, hiérarchie d'autorité (`../_shared/sources-and-evidence.md`),
  objectif reformulé, critères, parcours/états, nature de la tâche, ce qui doit rester inchangé.
- **B · Inspecter le dépôt AVANT d'éditer** : route/feature, logique métier, appels de données,
  composants génériques/métier, tokens, styles, stories, tests, patterns analogues, conventions,
  règles DS concernées. Produire un **inventaire court**.
- **C · Décision de réutilisation** : parcourir l'arbre **réutiliser → étendre → composer → créer**
  (`../_shared/design-system.md`) — **aucune création directe sans l'avoir parcouru**. Documenter
  pourquoi l'existant ne suffit pas.
- **D · Gouvernance des tokens** : `../_shared/design-system.md`. Nouvelle valeur → déterminer son
  **niveau** (primitive/semantic/component), vérifier qu'un token existant ne couvre pas déjà le besoin,
  **refuser une primitive sans justification**, préférer un token **sémantique** si l'usage est partagé.
  Zéro valeur en dur ; thèmes light/dark ; `npm run tokens:build` après tout ajout.
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

## Stop-conditions (interrompre et expliquer, ne pas forcer)
Suspendre l'implémentation et exposer le **motif** quand :
- création d'une **nouvelle palette primitive** ;
- **contradiction avec un ADR** (`docs/adr/`) ;
- il faudrait **relever une baseline** pour faire passer un contrôle (`../_shared/validation.md`) ;
- **breaking change** d'une API publique ;
- la demande relève du **produit**, pas du Design System ;
- informations **insuffisantes** pour classer correctement la demande.

## Rapport
Produire `templates/report.md` — rapport **professionnel** (pas de raisonnement interne),
état final **PASS / PARTIAL / FAIL**, listant factuellement :
- composants créés / modifiés ;
- stories mises à jour ;
- documentation synchronisée ;
- tests ajoutés / modifiés ;
- **tokens** créés — ou confirmation qu'**aucun** nouveau token n'a été créé ;
- validations exécutées (`../_shared/validation.md`) et leur **résultat réel**.

## Définition de terminé
Critères couverts ; logique métier préservée (ou modif. explicitement autorisée) ; existant réutilisé ;
aucune duplication injustifiée ; tokens conformes (`npm run lint:tokens`) ; stories synchronisées ;
tests pertinents présents ; responsive + a11y vérifiés ; commandes obligatoires exécutées ; rapport factuel.

## Références communes
- **Decision Framework** (raisonner en Senior avant toute création) : `references/decision-framework.md`.
- Faits du dépôt : `../_shared/repo-map.md`.
- Patterns d'écran, à charger **uniquement si** le besoin correspond (jamais automatiquement) :
  `../../patterns/README.md`.
- (Rappel : sources `../_shared/sources-and-evidence.md`, DS `../_shared/design-system.md`,
  Storybook `../_shared/storybook.md`, validations `../_shared/validation.md` — utilisés dans les phases.)

## Handoff
Recommander `/design-system-review` (audit conformité) puis `/ui-qa` (rendu) après implémentation.
Ne délègue rien automatiquement.
