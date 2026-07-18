---
name: code-to-design
description: Analyse une implémentation Streamnco existante (route, feature ou composant) et reconstruit sa logique de conception : architecture UI, composants, tokens réellement consommés, patterns, états, interactions, parcours, dette Design System et documentation. Produit une spécification Figma-ready sans modifier le code ni prétendre créer un fichier Figma.
---

# Code to Design

Reconstruire l'intention de conception **à partir du code**. Read-only par défaut
(sauf ajout explicite de stories manquantes si demandé).

## Quand l'utiliser
Comprendre/documenter une page ou feature existante (y compris legacy), préparer une
migration DS, extraire des patterns réutilisables, identifier la dette UI, compléter
Storybook, produire des design specs, comparer code ↔ Storybook ↔ tokens ↔ doc (↔ Figma
si fourni), préparer une refonte. S'applique à tout domaine du produit.

## Quand NE PAS l'utiliser
Cadrer un besoin (`/product-discovery`), implémenter (`/design-to-code`), auditer la
conformité (`/design-system-review`), faire la QA visuelle (`/ui-qa`).

## Modes (détail : references/modes.md)
- **A · Documentation** : code → doc fonctionnelle et visuelle.
- **B · Extraction DS** : code → inventaire composants / tokens / patterns.
- **C · Reconstruction design** : code → spécification exploitable dans Figma/autre outil.
- **D · Gap analysis** : code ↔ Storybook ↔ tokens ↔ doc ↔ Figma (si fourni).

## Workflow
1. Définir le périmètre analysé. 2. Trouver routes / points d'entrée. 3. Identifier les
sources de données. 4. Séparer logique métier et présentation. 5. Construire l'arbre des
composants (réutilisés vs locaux). 6. Inventorier les tokens **réellement consommés** et
détecter les valeurs en dur (`design-system/tools/lint-tokens.mjs` aide). 7. Identifier
layouts, breakpoints, variantes, interactions, **états** (voir `references/modes.md`).
8. Reconstruire le parcours utilisateur et les règles implicites. 9. Comparer avec
Storybook, avec les docs DS (`design-system/*.md`), et avec Figma **uniquement s'il est
fourni**. 10. Classifier les écarts. 11. Proposer un plan de documentation/migration.

Pour chaque bloc significatif, produire une fiche via `templates/spec.md`. Rapport global :
`templates/report.md`.

## Garde-fous
- Voir `../_shared/sources-and-evidence.md` : **fait vs recommandation** toujours séparés.
- Ne pas déduire un état absent sans preuve → le classer « non identifié / manquant ».
- Ne jamais prétendre avoir créé/modifié un frame Figma. Sans accès Figma : produire une
  spec **Figma-ready**, ne pas simuler. Ne pas créer une bibliothèque concurrente.
- Ne pas modifier un composant juste pour faciliter une story.

## Définition de terminé
Périmètre identifié ; architecture documentée ; comportements **prouvés par le code** ;
états présents/absents distingués ; composants et tokens inventoriés ; dette classifiée ;
aucune affirmation Figma non exécutée ; recommandations séparées des faits.

## Références communes
- Faits du dépôt : `../_shared/repo-map.md`.
- Règles Design System (pour juger la dette) : `../_shared/design-system.md`.
- Règles Storybook (gap analysis code ↔ stories) : `../_shared/storybook.md`.
- Patterns d'écran, à charger **uniquement si** la feature analysée y correspond (jamais
  automatiquement) : `../../patterns/README.md`.

## Handoff
Peut alimenter `/product-discovery` (cadrage d'une refonte) ou `/design-to-code`
(implémentation). Ne délègue rien automatiquement.
