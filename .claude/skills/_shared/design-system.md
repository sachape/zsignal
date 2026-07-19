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

## Foundations
Les **Foundations** sont les décisions visuelles fondatrices dérivées des tokens (Colors,
Typography, Spacing, Radius, Motion, Shadows, Icons, Grid, Elevation, Opacity, Dark Mode…).
Autorité : `design-system/03-foundations.md` + les pages Storybook `Foundations/` (référence
réelle de l'échelle, cf. `storybook.md`). Ne pas redéfinir une fondation ailleurs.

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

## Gouvernance spacing (échelle 8/4) — décisions : `docs/adr/0001-spacing-8-4-grid.md`, `0002-…-compact-allowance.md`
- **Preferred** (échelle principale) : 0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 120, 128 px.
- **Compact-allowed** (sous-grille secondaire, conforme) : 4, 12, 20 px — à réserver à l'UI dense.
- Tout autre espacement = **violation** (hors dérogation). Cas structurels/optiques légitimes
  (1px scrollbar, offset de centrage…) → **exception documentée** dans `design-system/health/exceptions.json`.
- Le respect est audité par le moteur Health ; le garde-fou anti-régression est `check:spacing`
  (voir `validation.md`). Ne pas remplacer une violation par un compact pour « passer ».

## Health & maturité (cockpit de gouvernance, read-only)
Le moteur `design-system/health/` produit `reports/design-system/*` : Overall Health pondéré,
et une **carte de maturité** où chaque domaine porte un état — **Measured / Documented / Planned /
Missing** (métrique réelle si elle existe ; statut sinon ; jamais de score inventé). Storybook
expose ces rapports (section `Health/`). Un Skill **cite** ces rapports, ne les fabrique pas.

## Adoption (dette DS dans le produit)
Mesurée par le provider `adoption` (usage réel du DS dans `src/`, hors cœur `ui/`) : couverture
composants, **éléments bruts** restants (`<button>`/`<input>`… hors DS) et **couleurs en dur**
= dette d'adoption. Préférer toujours un composant/token du DS à une reconstruction locale.
