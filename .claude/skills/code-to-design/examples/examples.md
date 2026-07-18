# Exemples — code-to-design (multi-domaines)

Fragments courts. Cible = n'importe quelle route/feature/composant réel du produit.

## A — extraire un pattern d'une route
Route existante (dashboard, paramètres, analyse de lives…) :
- Arbre des composants : distinguer `src/components/ui/*` (réutilisés) des composants
  locaux à la feature.
- Tokens consommés : relever les classes sémantiques (`bg-card`, `text-muted-foreground`)
  et toute valeur en dur → dette.
- Sortie : fiches `templates/spec.md` + rapport ; **aucune** modification du code.

## B — gap analysis code ↔ Storybook
Composant du DS présent dans `src/components/ui/` :
- Existe-t-il une story ? Le nom correspond-il au rendu ? Les états sont-ils couverts ?
- Écarts classés : « manquant dans Storybook », « incohérent », « conforme ».

## C — spec Figma-ready sans Figma
- Produire la spécification (structure, variantes, états, tokens) exploitable dans Figma.
- Ne PAS affirmer qu'un frame a été créé (aucun Figma configuré dans ce dépôt).
