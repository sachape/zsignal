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

## D — sortie de référence : Button (Composant atomique)
Forme attendue d'une reconstruction Figma (voir `references/figma-mapping.md`) :

```
Code-to-Design — Button
Cible          : Composant atomique
Nature Figma   : Component (main component + Component set des variants)

Structure Figma
Button
└── Content            (Auto Layout H)
    ├── Leading icon    (Instance swap · boolean leadingIcon)
    ├── Label           (Text property · label)
    └── Trailing icon   (Instance swap · boolean trailingIcon)

Auto Layout
- Direction : Horizontal · Height : Hug · Width : Hug · Alignment : Center
- Gap : Variables/Spacing/component-sm   (← var(--button-gap))
- Padding H : Variables/Spacing/button-inline · Padding V : 0

Component properties
- variant : default | destructive | secondary   (Variant)
- size    : sm | md | lg                          (Variant)
- disabled, leadingIcon, trailingIcon             (Boolean)
- label                                           (Text)
- icon                                            (Instance swap)

Tokens → Variables Figma
- background/default → color.action.primary.background → Variables/Color/action-primary-background (modes Light/Dark)
- radius             → radius.control               → Variables/Radius/control
- typography         → typography.label.md          → Variables/Typography/label-md

Certitude
- certain : variants, padding, radius, gap (tokens explicites dans button.json/tsx)
- déduit  : structure interne « Content »
- ambigu  : largeur responsive selon le parent
- absent  : transition exacte entre états (runtime, non figeable)
```
