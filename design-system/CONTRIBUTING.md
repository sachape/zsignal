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

## Spacing — gouvernance (DS P6)

Échelle à deux niveaux : **preferred** (`0,8,16,24,32,40,48,56,64,80,96,120,128` — défaut) et
**compact-allowed** (`4,12,20` — secondaire, composants denses). Tout le reste positif
(`2,6,10,14,28,36,44…`) = **violation** ; négatifs de positionnement = **exception** documentée.
Préférer toujours **preferred** ; compact-allowed reste conforme mais suivi. Périmètre =
espacements (margin/padding/gap/inset…), **pas** width/height/radius/typo. Détail : `docs/adr/0001-spacing-8-4-grid.md`.

```
npm run audit:health     # audit read-only GLOBAL → reports/design-system/* (adoption, composants, fondations, spacing)
npm run check:spacing    # CI : échoue si NOUVELLE violation spacing vs baseline (sinon observation)
npm run check:health     # umbrella : check:spacing + check:foundations
```

- **Lire le rapport** : `reports/design-system/spacing-health.md` (score, top valeurs, fichiers touchés).
- **Déclarer une exception** : ajouter une entrée dans `design-system/health/exceptions.json`
  (`value` px, `file`, `property`, `reason`, `owner`, `date`) — elle compte alors comme conforme.
- **Corriger** : jamais « au plus proche » mathématique ; préserver densité/hiérarchie/cibles
  tactiles/responsive, valider en dark+light et via Chromatic. Migration = phase séparée, après validation de l'audit.
- Le moteur Health (`design-system/health/`) produit un rapport **versionné** (contrat v1) que le
  Dashboard et la CI consomment sans recalculer.
