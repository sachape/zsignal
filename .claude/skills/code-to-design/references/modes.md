# Code to Design — modes & inventaire des états

## Modes
- **A Documentation** : produire une doc fonctionnelle + visuelle de l'existant.
- **B Extraction DS** : inventaire composants réutilisés / locaux, tokens consommés, patterns.
- **C Reconstruction design** : spécification exploitable (Figma-ready), sans créer de Figma.
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
