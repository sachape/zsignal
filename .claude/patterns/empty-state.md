# Pattern — Empty State

Absence de contenu transformée en point de départ utile.

## Quand l'utiliser
Première visite, collection vide, aucun résultat, rien à afficher.

## Quand ne pas l'utiliser
Attente de données (→ `loading-state.md`) ; échec (→ `error-state.md`).

## Structure recommandée
Icône/illustration sobre → titre → explication courte → 1 CTA principal (+ action secondaire
optionnelle). Réutiliser le composant `EmptyState` du DS.

## Hiérarchie des informations
Répondre à 3 questions : ce que c'est · pourquoi c'est utile · quoi faire ensuite (le CTA).
Ton encourageant, jamais culpabilisant.

## États indispensables
vide « première fois » (onboarding léger) · vide « après action » (ex. tout traité) ·
**aucun résultat de filtre/recherche** (proposer de réinitialiser) — distinct du vide initial.

## Responsive
Centré, largeur contrainte ; CTA atteignable ; illustration réduite/masquée sur petit écran.

## Accessibilité
Titre lisible ; le CTA est un vrai bouton/lien avec nom accessible ; contraste suffisant ;
ne pas coder l'info uniquement par l'illustration.

## Erreurs fréquentes
Empty state générique (« Aucune donnée ») sans action ; confondre vide et erreur ;
même message pour vide initial et aucun-résultat-de-filtre.

## Anti-patterns
Écran vide brut ; multiplier les CTA concurrents ; ton négatif.

## Interactions recommandées
CTA qui lance l'action attendue ; pour un filtre : « réinitialiser les filtres ».

## Checklist
- [ ] quoi/pourquoi/action · [ ] 1 CTA clair · [ ] vide ≠ aucun-résultat ≠ erreur · [ ] centré responsive · [ ] CTA accessible.
