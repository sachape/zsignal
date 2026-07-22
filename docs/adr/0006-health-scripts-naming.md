# ADR 0006 — Nommage des scripts Health : `audit:health` (général) vs `check:*` (ratchets par domaine)

- **Statut** : Accepté — 2026-07-22
- **Portée** : noms des scripts npm du moteur Health (`design-system/health/*`). Ne touche pas la logique du moteur ni les baselines.

## Contexte (constaté)

- `audit:spacing` (`node design-system/health/run.mjs`, sans flag) **régénère en réalité TOUT** le dashboard : `health-summary.json` complet (adoption, dette composants, fondations, spacing). Le nom **cachait sa portée globale** — un lecteur croyait à un audit spacing-only.
- À l'inverse, `check:spacing` (`--check`) et `baseline:spacing` (`--freeze`) sont **réellement spacing-scoped** : `--check` n'échoue que si `violations`/`compact-allowed` dépassent la baseline **spacing** (`run.mjs` l.223-233) ; `--freeze` ne fige que `spacing-baseline.json` (l.76-86). Ils sont correctement appariés avec `check:foundations`/`baseline:foundations`.
- **Conséquence** : il n'existait **ni audit ni garde-fou « généraux » nommés comme tels**. Renommer les trois `*:spacing → *:health` (proposition initiale) aurait été **faux** : `check:health`/`baseline:health` laisseraient croire à un gate global alors qu'ils ne couvriraient que le spacing.
- Manque structurel connexe : **aucun ratchet sur la dette composants** (`rawElements`) — voir follow-up.

## Décision

### 1. Renommer uniquement l'audit
`audit:spacing` → **`audit:health`**. C'est le seul script mal nommé : il produit le rapport global. `npm run audit:health` = **l'audit général** (toutes les dimensions).

### 2. Garder les ratchets par domaine tels quels
`check:spacing` / `baseline:spacing` (spacing) et `check:foundations` / `baseline:foundations` (fondations) **conservent leur nom** : ils gatent/figent réellement un seul domaine. Les renommer en `*:health` serait mensonger.

### 3. Ajouter des umbrellas « généraux »
- **`check:health`** = `check:spacing && check:foundations` — un seul garde-fou pour tous les ratchets.
- **`baseline:health`** = `baseline:spacing && baseline:foundations` — fige toutes les baselines d'un coup.

## Conséquences

- **Audit général** : `npm run audit:health` régénère tout le dashboard. Lancé + committé, il rafraîchit aussi la dette composants (règle le symptôme « rapport figé » : le bot Chromatic ne recalcule que `visual-quality`, pas l'adoption).
- **Garde-fou général** : `npm run check:health` couvre spacing **et** fondations en un appel. Ordre de validation recommandé mis à jour (`.claude/skills/_shared/validation.md`).
- **CI** : `ci.yml` continue de lancer `check:spacing` + `check:foundations` séparément — inchangé ici. Migration vers `check:health` = follow-up optionnel.
- **Ne réécrit pas l'ADR 0002** : celui-ci décrit `check:spacing` (toujours valide). Le présent ADR ne supersède que le **nom** `audit:spacing`.

## Follow-up (hors périmètre de cet ADR)

- **Ratchet dette composants** : `rawElements` (les `<button>` bruts) n'est bloqué par **aucun** gate. Pour que `check:health` soit *vraiment* complet, ajouter un `components-baseline.json` + logique de ratchet (analogue au spacing). Chantier moteur (`design-system/health/`), à décider séparément.
