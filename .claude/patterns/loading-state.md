# Pattern — Loading State

Communiquer l'attente sans casser la perception de rapidité.

## Quand l'utiliser
Récupération de données, action asynchrone, contenu différé.

## Quand ne pas l'utiliser
Absence définitive de contenu (→ `empty-state.md`) ; échec (→ `error-state.md`).

## Structure recommandée
Choisir selon la durée : < 1 s → feedback immédiat ; 1–10 s → **skeleton** préfigurant la forme
du contenu ou spinner sur le bouton ; > 10 s → barre de progression + estimation.
Réutiliser `Skeleton`/`Progress` du DS.

## Hiérarchie des informations
Préfigurer la STRUCTURE finale (skeleton) plutôt qu'un spinner vide, pour réduire le layout shift.

## États indispensables
loading initial (skeleton) · rechargement (garder l'ancien contenu + indicateur discret) ·
loading d'une action (bouton loading, anti double-submit) · loading partiel (par section).

## Responsive
Skeletons adaptés à chaque breakpoint (mêmes gabarits que le contenu réel).

## Accessibilité
Annoncer l'état de chargement (`aria-busy`/`aria-live`) pour les changements importants ;
respecter `prefers-reduced-motion` (pas d'animation agressive) ; ne pas voler le focus.

## Erreurs fréquentes
Spinner plein écran pour 200 ms ; « 0 » affiché pendant le chargement (trompeur) ;
layout shift quand le contenu arrive ; bouton non désactivé pendant l'action.

## Anti-patterns
Skeleton qui ne ressemble pas au contenu ; spinner infini sans timeout/erreur ;
bloquer toute l'UI pour un chargement local.

## Interactions recommandées
Bouton loading pendant l'action ; garder le contenu précédent lors d'un refetch ; timeout → erreur.

## Checklist
- [ ] skeleton = forme réelle · [ ] pas de faux « 0 » · [ ] bouton loading + anti double-submit · [ ] annonce a11y · [ ] reduced-motion.
