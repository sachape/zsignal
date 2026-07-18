# Pattern — Filters

Restreindre une collection selon des critères combinables.

## Quand l'utiliser
Affiner une liste/table/grille par attributs (statut, période, type…).

## Quand ne pas l'utiliser
Retrouver un élément précis par mot-clé (→ `search.md`).

## Structure recommandée
Barre de filtres (selects, chips, période) → indication du nombre de filtres actifs → réinitialiser →
collection filtrée. Réutiliser le pattern `FilterBar` (Select + Input + Badge du DS).

## Hiérarchie des informations
Filtres les plus utilisés en premier ; état actif visible (chips) ; compte de résultats mis à jour.

## États indispensables
aucun filtre · filtres actifs (nombre + chips) · **aucun résultat** (avec « réinitialiser ») ·
loading pendant le refetch · valeur par défaut restaurable.

## Responsive
Filtres repliés dans un `Sheet`/drawer sur mobile ; chips actifs restent visibles ; réinitialiser accessible.

## Accessibilité
Chaque filtre labellisé ; changement de filtre annoncé (nombre de résultats) ; chips supprimables au clavier.

## Erreurs fréquentes
Aucun retour quand 0 résultat ; filtres actifs invisibles ; pas de réinitialisation ;
confondre « aucune donnée » et « aucun résultat de filtre ».

## Anti-patterns
Filtres qui se réinitialisent seuls ; multiplier des filtres qui n'affectent rien ;
appliquer sans feedback.

## Interactions recommandées
Application immédiate ou bouton « Appliquer » explicite (choisir, pas les deux) ; retirer un chip ;
réinitialiser tout ; persister les filtres pertinents.

## Checklist
- [ ] filtres actifs visibles · [ ] compte de résultats · [ ] réinitialiser · [ ] aucun-résultat actionnable · [ ] labels + clavier.
