# Code to Design — modes & inventaire des états

## Modes
- **A Documentation** : produire une doc fonctionnelle + visuelle de l'existant.
- **B Extraction DS** : inventaire composants réutilisés / locaux, tokens consommés, patterns.
- **C Reconstruction Figma** : spécification Figma-ready (frames, Auto Layout, Components/
  Instances/Variants, Component properties, Variables) — `figma-mapping.md`. Sans créer de Figma.
- **D Gap analysis** : écarts entre code, Storybook, tokens, docs DS, et Figma si fourni.

## Inventaire des états (documenter ceux qui EXISTENT, prouvés par le code)
default · hover · focus · active · selected · disabled · loading · empty · partial · error ·
success · completed · permissions · responsive · thème (light/dark) · contenu extrême.

Un état non trouvé dans le code se classe **« non identifié »** ou **« manquant »** —
jamais déduit sans preuve.

## Comment prouver
- Citer `chemin:ligne` ou la zone du composant.
- Un token « réellement consommé » = classe Tailwind sémantique / `var(--…)` présente dans le code.
- Une valeur en dur = hex / `[#…]` / `[10px]` / `shadow-[… rgba]` → dette à signaler
  (référencer `npm run lint:tokens` pour le cœur `ui/`).

## Niveaux de certitude (spec Figma-ready)
Adossés à `../_shared/sources-and-evidence.md` (Fait / Inférence / Hypothèse) :
- **certain** — explicitement présent dans le code (citer `fichier:ligne`).
- **déduit** — conséquence raisonnable du code, marquée comme telle.
- **ambigu** — plusieurs interprétations possibles → lister les options, ne pas trancher en silence.
- **absent** — impossible à déterminer statiquement → ne pas inventer.

## Catégories de divergences à signaler
- valeur en dur (hex / `[10px]` / `shadow-[…]`) ;
- code divergent d'un token existant ;
- **token généré mais non consommé** par le composant ;
- prop non documentée ;
- état présent dans le code mais absent du Design System ;
- responsive non déterminable statiquement ;
- **comportement runtime non représentable statiquement dans Figma** (animation, logique conditionnelle).
