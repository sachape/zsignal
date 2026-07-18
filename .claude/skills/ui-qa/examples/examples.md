# Exemples — ui-qa (multi-domaines)

Fragments courts. Cible = n'importe quelle page/feature/story réelle.

## A — Story QA
Cible : une story d'un composant du DS.
- Rendre via `npm run storybook`. Vérifier : nom = rendu, états, focus visible, nom accessible,
  contraste, Controls cohérents (une story « Disabled » reste disabled).
- Reproductible ; preuve = observation de la story rendue (pas la lecture du JSX).

## B — Feature QA (route)
Cible : une route de l'app (dashboard, paramètres, paiements…).
- Rendre via `npm run dev`. Parcours principal + états (loading/empty/error/retry) +
  responsive aux viewports documentés + clavier/Escape sur les overlays.

## C — Acceptance QA
- Reprendre les critères d'acceptation (souvent issus de `/product-discovery`) et cocher
  chacun avec une preuve. Verdict justifié ; risques non vérifiés listés.

## Honnêteté
Si un état ne peut pas être déclenché dans l'environnement courant, le classer
**« non vérifié »**, jamais « PASS ».
