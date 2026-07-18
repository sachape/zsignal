# Pattern — Page

Gabarit de page générique (en-tête + contenu). Base des autres patterns d'écran.

## Quand l'utiliser
Toute route affichant un titre, une action principale et un corps de contenu.

## Quand ne pas l'utiliser
Contenu embarqué dans un overlay (→ `modal.md`) ou flux multi-étapes (→ `wizard.md`).

## Structure recommandée
`PageHeader` (eyebrow · titre H1 · description · action) → corps (sections) → éventuellement footer.
Réutiliser le pattern `PageHeader` du DS ; largeur de contenu contrainte (conteneur).

## Hiérarchie des informations
1 seul H1. Titre = quoi. Action principale à droite du titre. Le contenu suit l'ordre de priorité.

## États indispensables
loading (skeleton du corps) · empty (si le corps peut être vide) · error récupérable · succès.

## Responsive
Header : titre + action s'empilent sous `sm`. Corps : 1 colonne mobile, colonnes ≥ `lg`.
Action principale reste atteignable (ne pas la reléguer hors écran).

## Accessibilité
`<main>` unique ; H1 unique ; ordre du DOM = ordre visuel ; focus initial cohérent.

## Erreurs fréquentes
Plusieurs H1 ; action principale noyée ; largeur pleine illisible sur grand écran.

## Anti-patterns
Header décoratif sans action utile ; empiler des CTA concurrents de même poids.

## Interactions recommandées
Action principale claire ; navigation retour si sous-page ; breadcrumb si profondeur > 2.

## Checklist
- [ ] 1 H1 · [ ] action principale identifiable · [ ] états loading/empty/error · [ ] responsive header/corps · [ ] `<main>` + focus.
