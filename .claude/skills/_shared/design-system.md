# Règles Design System (Streamnco)

Partagé. Détail complet dans `design-system/*.md` et `design-system/CONTRIBUTING.md`.

## Architecture de tokens — 3 couches
```
primitive  (tokens/primitives/*.json — valeurs brutes, sans intention)
  → semantic (tokens/semantic/*.json — intention produit : background/text/border/action…)
    → component (tokens/components/*.json — décisions par composant)
```
- La SOURCE est `tokens/**.json` (DTCG). Le CSS est GÉNÉRÉ (`npm run tokens:build`).
  Ne pas éditer `src/tokens.generated.css` à la main.
- Un composant consomme un token **sémantique** (Tailwind `bg-primary`, `text-foreground`…),
  pas une **primitive** directement (`--color-lime-500`).
- Un pont de compat expose les 44 variables shadcn (`--primary`, `--background`…) dérivées
  des couches — c'est ce que Tailwind consomme.

## Interdits (vérifiés par `npm run lint:tokens` sur `src/components/ui/`)
- Couleur hexadécimale en dur, `bg-[#…]`, `[hsl(...)]` littéral.
- Radius/ombre arbitraires (`rounded-[10px]`, `shadow-[0_…rgba(...)]`) — utiliser `rounded-md/lg`,
  `shadow-*`, ou un token. `[var(--token)]` et `[inherit]` sont autorisés.
- Usage direct d'une primitive au lieu d'un token sémantique.
Hors du cœur `ui/`, ces mêmes points sont en **warning** (app/marketing en migration).

## Token manquant
1. Vérifier qu'aucun équivalent n'existe. 2. Déterminer la couche (primitive/semantic/component).
3. Analyser l'impact (thèmes light/dark). 4. L'ajouter dans `tokens/` selon les conventions.
5. `npm run tokens:build`. 6. Documenter. Ne jamais changer la SIGNIFICATION d'un token existant
pour un correctif local, ni créer d'alias circulaire.

## Réutilisation de composants (avant d'en créer un)
```
Un composant existant répond complètement       → le réutiliser
Répond partiellement, variante cohérente         → l'étendre (CVA)
L'extension dégraderait l'API                     → composant composé/métier
Aucun ne répond                                   → créer au bon niveau d'abstraction
```
Niveaux : primitive (`ui/`) < composé < métier < pattern < page. Ne pas dupliquer, ne pas
recréer le markup interne d'un composant existant, ne pas contourner par des classes.
