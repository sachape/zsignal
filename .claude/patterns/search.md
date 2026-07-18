# Pattern — Search

Rechercher puis présenter des résultats pertinents.

## Quand l'utiliser
Retrouver un élément dans un grand ensemble ; recherche globale (command palette).

## Quand ne pas l'utiliser
Restreindre une collection connue par critères (→ `filters.md`).

## Structure recommandée
Champ de recherche (icône, placeholder = exemple) → résultats groupés → état vide/aucun résultat.
Débounce des requêtes ; refléter la requête dans les résultats.

## Hiérarchie des informations
Résultats les plus pertinents en premier ; mettre en évidence le terme ; grouper par type si utile.

## États indispensables
initial (avant saisie : suggestions/récents) · en cours (loading) · résultats · **aucun résultat**
(distinct de « vide ») · erreur · requête trop courte · beaucoup de résultats (pagination).

## Responsive
Champ pleine largeur mobile ; résultats en liste ; palette (Cmd+K) adaptée au clavier desktop.

## Accessibilité
Champ labellisé ; résultats navigables au clavier (flèches + Entrée) ; nombre de résultats
annoncé (`aria-live`) ; focus géré à l'ouverture/fermeture d'une palette.

## Erreurs fréquentes
« Aucun résultat » traité comme un vide ; pas de débounce (flood) ; résultats non navigables au clavier.

## Anti-patterns
Recherche qui recharge la page à chaque frappe ; pas d'état « aucun résultat » actionnable.

## Interactions recommandées
Débounce ; navigation clavier ; effacer la requête ; suggestion/récents à vide ; ouverture Cmd+K si global.

## Checklist
- [ ] débounce · [ ] aucun-résultat ≠ vide · [ ] navigation clavier · [ ] nombre de résultats annoncé · [ ] état initial utile.
