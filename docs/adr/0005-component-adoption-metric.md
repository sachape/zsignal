# ADR 0005 — Métrique « Component adoption » : périmètre honnête et anti-gaming

- **Statut** : Accepté — 2026-07-20
- **Portée** : définition de la métrique `componentAdoption` du moteur Health (`design-system/health/providers/adoption.mjs`) et du signal `rawElements`.

## Contexte (constaté)

- `componentAdoption` valait `dsFiles / jsxFiles` sur **tous** les `.tsx` de `src/` (hors `ui/`, stories, tests) = **67% (113/168)**.
- Le dénominateur incluait des fichiers **structurellement non-consommateurs** du DS : providers (`contexts/`), hooks, entrée (`main.tsx`), routing (`App.tsx`), gardes de route (`ProtectedRoute`), pages callback OAuth, pages de prose légale — **et la surface marketing/blog `el-*`** (DS distinct, déjà exempté ADR 0004).
- Viser 100% en l'état aurait exigé d'ajouter des imports DS **artificiels** à ces fichiers → **gaming** du score, ce que la gouvernance interdit (« jamais de score inventé »).
- Le signal `rawElements` comptait **tous** les `<input>`, y compris les `<input type="file">` cachés (upload par `ref`) — un **pattern légitime**, pas une dette.

## Décision

### Dénominateur de `componentAdoption` = fichiers PRODUIT consommateurs de DS
Sont **exclus du dénominateur** (comptés dans `excludedFromDenom`, pas une pénalité) :
- cœur DS (`ui/`), stories, tests ;
- logique sans UI DS : `contexts/`, `hooks/`, `main.tsx`, `App.tsx`, `ProtectedRoute`, `*CallbackPage`, `Legal*Page` ;
- surface **marketing/blog** (`/site/`, `Blog`, `Article`, ou contenu `el-*`).

### Signal `rawElements` = bruts illégitimes uniquement
`<input type="file">` (upload caché par `ref`) est **exclu** du comptage : c'est le pattern idiomatique, pas une dette. Restent comptés : `<button>`, `<select>`, `<textarea>`, et `<input>` non-file.

### Transparence (anti-gaming)
`excludedFromDenom` est **exposé** dans le rapport : on voit combien de fichiers sont hors périmètre, et pourquoi. Le périmètre est **fondé sur le rôle** (non-consommateur structurel), pas choisi pour gonfler le score.

## Conséquences
- `componentAdoption` passe de 67% (113/168) à **80,2% (105/131)** à définition figée — sans aucune modification de code produit, juste un périmètre honnête.
- Reste, pour atteindre 100% : convertir les **bruts produit légitimes** en composants DS (`<button>`→`Button`, `<input>`→`Input`, `<select>`→`Select`, radios→`RadioGroup`). Chaque `<button>` sur-mesure (tuile/ligne cliquable) est traité au cas par cas (`Button` `variant`/`asChild`, ou exception documentée si le composant custom est justifié).

## État final du programme d'adoption (2026-07-22)

Le programme a converti **toutes les victoires propres**, sans forçage ni gaming.

### Composants créés / refondus
- **`Chip`** (créé) — pill de filtre interactif (`aria-pressed`), tokens `chip/*`. Adopté : ContentQueuePage, PlaybooksPage, ClipsPage.
- **`SelectableCard`** (créé puis refondu **layout-agnostic**, prop `highlight=tint|ring`) — tuiles sélectionnables de contenu (`tint`) ou image/média (`ring`, sans fond teinté). Adopté : SimulatorPage, CaptionStylePreviewGrid, LiveSetupPage.

### Composants existants adoptés (bruts natifs → DS)
- `Select` ← `<select>` : ClipsPage, VisualGenerationDialog.
- `RadioGroup` ← `<input type=radio>` : YouTubeUploadDialog.
- `Switch` ← `<button role=switch>` : ThemeToggle.
- `SidebarMenuButton` ← `<button>` custom : AppSidebar (trigger compte footer).
- `Input` ← `<input>` texte : LivePostGenerator, LeadersPage.

### Métriques finales
- `componentAdoption` : **67 % → 82,4 %**.
- `rawElements` : **67 → 51**.

## Plafond honnête : les bruts restants sont LÉGITIMES (ne pas forcer)

Les ~51 `<button>` restants **ne mappent proprement sur aucun composant DS** — c'est du **custom justifié**. Les forcer serait un anti-pattern (leçon `space-19` : signaler ≠ forcer, et « jamais de score inventé »). Patterns actés comme légitimes :

| Pattern | Exemple | Pourquoi il reste custom |
|---|---|---|
| Disclosure à state dispersé | BadgeGrid (`showLocked` pilote 2 sections) | pas de bloc unique → `Collapsible` inapplicable |
| Troncature de texte | DimensionResources (`expanded`) | swap de texte, pas show/hide de bloc |
| Items de Popover | AppSidebar (Support, Déconnexion) | dans un `Popover`, pas le sidebar |
| Tuile / badge à style spécifique | BadgeStrip (icône, glow d'achievement) | apparence dédiée sans équivalent DS |
| Boutons one-off | ~40 fichiers (1 chacun) | actions ponctuelles sans pattern réutilisable |

**Règle de gouvernance** : un `<button>` sur-mesure sans équivalent DS **reste custom** — on ne l'aligne de force ni sur `Button` ni sur un composant inadapté (`role=switch`→`Button`, tuile image→bg-tint, etc.). Si un pattern **récurrent** émerge sans composant DS, on **crée le composant** (cf. `Chip`, `SelectableCard`) ; on ne force pas.

**82,4 % est le plafond défendable** de cette métrique dans l'état actuel du produit — le reste est du custom légitime, pas de la dette.
