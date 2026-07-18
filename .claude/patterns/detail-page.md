# Pattern — Detail Page

Fiche détaillée d'une entité unique + ses actions.

## Quand l'utiliser
Afficher tout ce qui concerne un objet (une entité) et permettre d'agir dessus.

## Quand ne pas l'utiliser
Comparer plusieurs entités (→ `table.md`) ; vue d'ensemble (→ `dashboard.md`).

## Structure recommandée
Header d'identité (titre/avatar + statut + actions principales) → contenu en sections
(onglets si nombreux) → actions secondaires. Réutiliser `PageHeader` (variante identité).

## Hiérarchie des informations
Identité et statut en haut ; informations les plus consultées d'abord ; actions destructives
séparées et confirmées.

## États indispensables
loading (skeleton) · chargé · introuvable (404 / accès refusé) · partiel (certaines données
indisponibles) · en cours d'action (async) · erreur d'action · entité archivée/désactivée.

## Responsive
Header s'empile sous `sm` ; onglets défilables ; actions principales restent accessibles ;
contenu 1 colonne mobile → 2 col (contenu + aside) desktop.

## Accessibilité
1 H1 (l'entité) ; onglets accessibles au clavier (`role="tab"`) ; statut non porté par la
seule couleur ; retour de focus après une action modale.

## Erreurs fréquentes
Pas d'état « introuvable/accès refusé » ; action destructive sans confirmation ;
onglets non navigables au clavier ; statut couleur-only.

## Anti-patterns
Tout aplatir sur une page interminable ; noyer l'action principale ; charger le détail sans skeleton.

## Interactions recommandées
Onglets pour segmenter ; confirmation (`AlertDialog`) pour le destructif ; feedback d'action async ;
retour à la liste.

## Checklist
- [ ] identité + statut en tête · [ ] introuvable/accès refusé géré · [ ] destructif confirmé · [ ] onglets clavier · [ ] skeleton au chargement.
