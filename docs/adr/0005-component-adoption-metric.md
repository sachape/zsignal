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

## Suivi
- Migration des ~63 `<button>` + 2 `<select>` + 2 radios produit : **en cours**, par lots avec QA visuelle.
- 2 `<input>` texte déjà convertis (LivePostGenerator, LeadersPage).
