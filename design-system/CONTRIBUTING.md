# Écrire une story — règles du Design System

> Règles **globales** du dépôt (Git, branches, commits, Pull Requests, CI, reviews) :
> [`../CONTRIBUTING.md`](../CONTRIBUTING.md). Ce fichier-ci couvre le **spécifique DS** ci-dessous.

Le Storybook est à la fois **documentation**, **playground** et **support de tests**.
Une story doit tenir une **promesse claire et stable** : son nom décrit son rendu,
et aucun Control ne doit pouvoir le contredire.

## Règles

1. **Le nom = le rendu.** `Secondary` rend `variant="secondary"`, `Disabled` rend
   `disabled: true`. Jamais `Primary → variant:"default"` (renommer en `Default`).

2. **Verrouiller les propriétés d'identité.** Toute story nommée d'après une
   variante / un état / une taille / un mode fixe cette valeur dans `args` **et**
   désactive son Control dans cette story :

   ```ts
   import { lock } from "./_lockControls";
   export const Secondary = { args: { variant: "secondary" }, argTypes: lock("variant") };
   ```

   `control: false` garde la prop **documentée** (table des props) mais non
   modifiable. Ne **pas** utiliser `table.disable` pour ça (il retire la prop de
   la doc — réservé aux props internes).

3. **Un seul `Playground`** expose librement toutes les propriétés publiques.

4. **Les matrices** (`AllVariants`, `Sizes`, `IconOnly`…) désactivent les Controls :
   `parameters: { controls: { disable: true } }` (ils ne pilotent pas plusieurs
   instances). Idem pour les compositions fixes (Dialog, Select, Accordion…).

5. **Options des Controls = API réelle.** Les `options` d'un `select` reflètent
   exactement les variantes CVA / le type TS. Aucune option fantôme, aucune
   variante réelle absente. L'API est celle de shadcn (`default`, pas `primary` ;
   pas de `loading` inventé).

6. **Événements via `fn()`** (`import { fn } from "storybook/test"`) — spy testable,
   visible dans Actions. `control: false`, catégorie `Events`.

7. **Ne jamais contourner le composant.** Pas de couleur/spacing/radius en dur ni
   de style inline dans une story pour « faire joli ». Tout vient des tokens, des
   variantes officielles et des props publiques. (Le garde-fou `npm run lint:tokens`
   bloque les valeurs en dur dans `src/components/ui/`.)

8. **Accessibilité (bloquante).** L'a11y tourne en mode `error`. Un champ / switch /
   checkbox seul doit avoir un `aria-label` ou un label associé. Un bouton icône
   seule doit avoir un `aria-label`.

9. **Tests d'interaction** (`play`) sur les comportements réels (clic, ouverture,
   changement d'état), pas sur chaque story statique.

## Validation

```
npm run typecheck        # tsc
npm run lint:tokens      # garde-fou tokens
npm run test             # unit + interaction + a11y (bloquant)
npm run build-storybook  # compilation
```
