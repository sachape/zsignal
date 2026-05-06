## Problème

Dans `src/components/AppSidebar.tsx`, l'état replié réutilise `logo.svg` (le logo complet "Streamnco" : texte + carré vert, 94×24). On le force dans une boîte 24×24 avec `object-cover object-left`, ce qui ne montre qu'une portion du "S" — d'où l'icône cassée.

## Solution

Extraire la marque seule (le carré vert avec le "S") en tant qu'asset séparé, et l'utiliser uniquement quand la sidebar est repliée.

### Étapes

1. Créer `src/assets/logo-mark.svg` — uniquement le `<rect>` avec le gradient + le `<path>` du "S" du fichier existant (viewBox 24×24). Pas de texte.
2. Dans `AppSidebar.tsx` :
   - Importer `logoMark from "@/assets/logo-mark.svg"`.
   - Dans le header, afficher `logoMark` (h-6 w-6) si `collapsed`, sinon `logo` (h-6 w-auto).
   - Retirer les hacks `object-cover` / `object-left`.

### Résultat attendu

- Sidebar repliée : carré vert avec le "S" net, centré.
- Sidebar étendue : logo complet inchangé.
