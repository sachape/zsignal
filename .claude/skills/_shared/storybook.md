# Règles Storybook (Streamnco)

Partagé. Détail complet dans `design-system/CONTRIBUTING.md`.

## Format réel
- Renderer : `@storybook/react-vite`. Import test : `storybook/test` (`fn`, `expect`,
  `userEvent`, `screen`, `within`).
- Stories dans `design-system/stories/*.stories.tsx`. Autodocs global (chaque composant a
  une page Overview + table des props).
- Tests : `@storybook/addon-vitest` (projet vitest `storybook`, navigateur headless) +
  `@storybook/addon-a11y` en mode **`error`** (bloquant).
- Le CATALOGUE (`design-system/stories/catalog/`) est navigable mais hors test/snapshot.

## Discipline des stories
- **Le nom = le rendu.** `Secondary` rend `variant:"secondary"` ; `Disabled` rend
  `disabled:true`. Jamais `Primary → variant:"default"`.
- **Verrouiller les props d'identité** d'une story de référence : `argTypes: lock("variant")`
  (`control:false` — reste documenté, non modifiable). Helper : `design-system/stories/_lockControls.ts`.
  Ne PAS utiliser `table.disable` pour verrouiller (ça retire la prop de la doc).
- **Un seul `Playground`** expose librement les props publiques.
- **Matrices / compositions fixes** : `parameters: { controls: { disable: true } }`.
- **Options des Controls = API réelle** (CVA / type TS). Aucune option fantôme, aucune absente.
- **Événements via `fn()`** (spy testable, catégorie `Events`, `control:false`).
- **a11y (bloquant)** : champ/switch/checkbox/slider/bouton-icône seul → `aria-label` ou label associé.
- **Tests d'interaction (`play`)** sur les comportements réels, pas sur chaque story statique.
- **Ne pas contourner le composant** : pas de style/couleur/spacing en dur dans une story.
- Mocks déterministes ; ne pas dépendre d'un backend réel (le client Supabase est mocké :
  `.storybook/mocks/supabase.ts`).

## Storybook = plateforme (pas seulement un catalogue de composants)
La navigation est structurée et ordonnée par **`storySort`** (dans `.storybook/preview.tsx`) :
`Getting Started → Foundations → Components → Patterns → Health → Catalogue`.
- **Getting Started** : Introduction (landing) + pages MDX Architecture / Nomenclature /
  Contribution / Governance.
- **Foundations** : pages de **référence** (Colors en 3 couches, Typography, Spacing, Radius,
  Motion, Icons, Grid…) — l'échelle réelle, pas seulement les tokens consommés par l'app.
- **Health** : cockpit lisant `reports/design-system/*` via `import.meta.glob` — **aucun chiffre
  inventé**, tout vient des rapports du moteur.
- Pages **pleines** (Introduction, dashboards Health) : `tags: ["!autodocs"]` +
  `parameters: { layout: "fullscreen" }` pour éviter une page Docs redondante.
- Ne pas ajouter de **groupe de navigation racine** sans validation ; respecter `storySort`.
- Rappel gouvernance : les pages Foundations/Health respectent aussi l'échelle spacing
  (`design-system.md`) — pas de valeur en dur sous prétexte que c'est « juste une story ».
