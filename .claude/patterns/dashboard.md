# Pattern — Dashboard

Vue d'ensemble : métriques clés + cartes/sections d'entrée vers le détail.

## Quand l'utiliser
Donner un aperçu synthétique et des points d'entrée vers des vues détaillées.

## Quand ne pas l'utiliser
Une seule donnée à afficher (→ `detail-page.md`) ; saisie (→ `form.md`).

## Structure recommandée
Header de page → rangée de métriques (cards) → grille de sections/cartes secondaires.
Grille responsive (auto-fit), gouttières = tokens `--space-*`.

## Hiérarchie des informations
Métrique la plus décisionnelle en premier. Chaque carte : 1 signal + 1 action ou lien.
Ne pas mettre 12 KPI de même poids : hiérarchiser.

## États indispensables
loading (skeletons de cartes) · empty (première visite, aucune donnée) · partial (certaines
sources indisponibles) · error par carte (isoler l'échec, ne pas casser tout le dashboard).

## Responsive
Métriques : 1 col mobile → 2–4 col desktop. Cartes : auto-fit `minmax`. Priorité :
les KPI décisionnels restent au-dessus de la ligne de flottaison.

## Accessibilité
Chaque métrique a un libellé accessible ; l'info n'est pas portée par la seule couleur
(ajouter un signe/texte à un delta) ; ordre de lecture logique.

## Erreurs fréquentes
Trop de KPI ; une erreur d'une source casse tout ; couleurs de tendance sans texte.

## Anti-patterns
Dashboard « mur de chiffres » sans hiérarchie ni action ; auto-refresh qui fait sauter le layout.

## Interactions recommandées
Cartes cliquables vers le détail ; filtres de période si pertinent ; feedback de rafraîchissement.

## Checklist
- [ ] KPI hiérarchisés · [ ] états loading/empty/partial/error par carte · [ ] deltas non-couleur-only · [ ] grille responsive · [ ] cartes → détail.
