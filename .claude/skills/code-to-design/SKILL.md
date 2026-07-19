---
name: code-to-design
description: Analyse une implémentation Streamnco existante (route, feature ou composant) et reconstruit sa logique de conception — architecture UI, composants, tokens réellement consommés, patterns, états, interactions, parcours, dette Design System et documentation. Produit une spécification Figma-ready sans modifier le code ni prétendre créer un fichier Figma.
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

## Classifier la cible (taxonomie unique, orientée reconstruction Figma)
Annoncer d'abord le type de cible — il détermine ce qu'on reconstruit dans Figma :
**Composant atomique → Composant composite → Pattern → Section → Page → Layout → Flow.**
Décider aussi la **nature Figma** de chaque bloc : doit-il devenir un **Component**, une
**Instance** d'un composant existant, ou un **Pattern** (composition réutilisable) —
règles dans `references/figma-mapping.md`.

## Modes (détail : references/modes.md)
- **A · Documentation** : code → doc fonctionnelle et visuelle.
- **B · Extraction DS** : code → inventaire composants / tokens / patterns.
- **C · Reconstruction Figma** : code → spécification Figma-ready — frames, Auto Layout,
  Components/Instances/Variants, Component properties, Variables (`references/figma-mapping.md`).
  **Cœur du Skill.**
- **D · Gap analysis** : code ↔ Storybook ↔ tokens ↔ doc ↔ Figma (si fourni).

## Workflow
1. **Classifier la cible** (taxonomie ci-dessus) et sa nature Figma (Component/Instance/Pattern).
2. Périmètre, routes / points d'entrée, sources de données ; séparer métier et présentation.
3. **Inspecter le code et ses dépendances** : arbre des composants (réutilisés vs locaux),
   props / variants / états, composants enfants, responsive, animations / interactions.
4. Inventorier les tokens **réellement consommés** et détecter les valeurs en dur
   (`design-system/tools/lint-tokens.mjs` aide) — cf. `../_shared/design-system.md`.
5. **Reconstruire la structure Figma** via `references/figma-mapping.md` : arbre de frames,
   Auto Layout (direction, hug/fill/fixed, padding, gap, alignment), radius / typo / couleurs / effects.
6. **Mapper propriétés & variables** : props → **Component properties** (variant / boolean /
   text / instance-swap) ; tokens → **Variables Figma** (collection + modes light/dark).
7. **Étiqueter la certitude** de chaque élément : certain / déduit / ambigu / absent
   (adossé à `../_shared/sources-and-evidence.md`).
8. **Signaler les divergences** (`references/modes.md`) : hardcode, divergence tokens,
   token généré non consommé, état hors DS, responsive indéterminable, runtime non figeable.
9. Comparer avec Storybook et les docs DS (`design-system/*.md`) ; Figma **uniquement s'il est fourni**.
10. Produire la spec Figma-ready, puis **handoff**.

Pour chaque bloc significatif, produire une fiche via `templates/spec.md`. Rapport global :
`templates/report.md`.

## Garde-fous
- Voir `../_shared/sources-and-evidence.md` : **fait vs recommandation** toujours séparés.
- Ne pas déduire un état absent sans preuve → le classer « non identifié / manquant ».
- **Spec-only par défaut.** Le Skill produit une spécification **Figma-ready** ; il ne suppose
  JAMAIS devoir créer ou modifier un fichier Figma, **même si un connecteur Figma est disponible
  dans le runtime**. Un push vers Figma ne peut intervenir que **si** un outil Figma réel est
  détecté **et** demandé explicitement — jamais par changement automatique de comportement,
  jamais simulé. Ne pas créer une bibliothèque concurrente.
- Ne pas modifier un composant juste pour faciliter une story.

## Définition de terminé
Cible **classifiée** (taxonomie unique) ; périmètre identifié ; architecture documentée ;
comportements **prouvés par le code** ; états présents/absents distingués ; composants et tokens
inventoriés ; **structure Figma reconstruite** (frames, Auto Layout, Component properties,
Variables) ; **certitude étiquetée** (certain/déduit/ambigu/absent) ; divergences signalées ;
dette classifiée ; aucune affirmation Figma non exécutée ; recommandations séparées des faits.

## Références communes
- Faits du dépôt : `../_shared/repo-map.md`.
- Règles Design System (pour juger la dette) : `../_shared/design-system.md`.
- Règles Storybook (gap analysis code ↔ stories) : `../_shared/storybook.md`.
- Patterns d'écran, à charger **uniquement si** la feature analysée y correspond (jamais
  automatiquement) : `../../patterns/README.md`.

## Handoff
Produit une spec Figma-ready réutilisable. Peut alimenter `/design-system-review` (auditer
la conformité de la reconstruction), `/ui-qa` (vérifier le rendu), `/product-discovery`
(cadrage d'une refonte) ou `/design-to-code` (implémentation). Ne délègue rien automatiquement.
