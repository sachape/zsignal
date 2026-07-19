# Spacing Health — rapport humain

> Généré le 2026-07-19T13:00:11.853Z · contrat v1 · **read-only** (aucune migration).

## Score

| Indicateur | Valeur |
|---|---|
| **Spacing Health** | **70.6%** |
| Spacing value compliance | 58.6% |
| Scale adoption (échelle, pas var(--space-*)) | 98.5% |
| CSS token adoption (var(--space-*)) | 0.0% |
| **Confidence** | **96.2%** |

_Confidence = moyenne pondérée de la fiabilité par item (high=1, medium=0.6, low=0.3). Baisse avec les usages non classifiables (dynamiques, %, calc), les positionnements ambigus (top/inset) et les marges négatives._

## Totaux

- Usages détectés : **5130** (classifiables : 5130)
- Conformes : 3008 · Needs-decision (12/20/28…) : **1035** · Violations : **1087**
- Exceptions : 0 · Non classifiés : 0
- Violations par piste — cœur DS (ERROR) : **100** · app (WARN) : 987

## Top valeurs hors-échelle

- `6px` × 536
- `2px` × 332
- `10px` × 164
- `14px` × 28
- `-2px` × 10
- `1px` × 10
- `-6px` × 3
- `3px` × 2
- `7px` × 1
- `18px` × 1

## Composants/fichiers les plus touchés

- **61 viol.** 42 needs-dec. — `src/pages/LiveSetupPage.tsx` _(warn)_
- **42 viol.** 19 needs-dec. — `src/pages/ContentQueuePage.tsx` _(warn)_
- **31 viol.** 20 needs-dec. — `src/pages/ReseauxPage.tsx` _(warn)_
- **26 viol.** — `src/components/AccountMenu.tsx` _(warn)_
- **26 viol.** 25 needs-dec. — `src/components/TeaserResultLayout.tsx` _(warn)_
- **23 viol.** 30 needs-dec. — `src/pages/WeeklyPlanPage.tsx` _(warn)_
- **21 viol.** 21 needs-dec. — `src/pages/SimulatorPage.tsx` _(warn)_
- **20 viol.** 26 needs-dec. — `src/pages/AnalysePage.tsx` _(warn)_
- **20 viol.** 24 needs-dec. — `src/pages/ResultPage.tsx` _(warn)_
- **19 viol.** 1 needs-dec. — `src/components/AppSidebar.tsx` _(warn)_

## Recommandations

- 1087 violations hors grille à migrer (progressif, validation visuelle Chromatic).
- 1035 usages 12/20/28px « needs-decision » : trancher après revue (garder / migrer / exception).
- Scale adoption élevée mais cssVarAdoption ≈0 : le spacing passe par l'échelle Tailwind, pas par var(--space-*). Model A (fin P6) : aligner l'échelle Tailwind sur les tokens.

## Périmètre

- Fichiers scannés : 388 (cœur ERROR : 87 · app WARN : 301)
- Erreurs de parsing : 0
