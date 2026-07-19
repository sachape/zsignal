# Spacing Health — rapport humain

> Généré le 2026-07-19T14:06:33.771Z · contrat v1 · **read-only** (aucune migration).

## Score

| Indicateur | Valeur |
|---|---|
| **Spacing Health** | **84.4%** |
| Spacing value compliance | 78.3% |
| Scale adoption (échelle, pas var(--space-*)) | 98.6% |
| CSS token adoption (var(--space-*)) | 0.0% |
| **Confidence** | **96.2%** |

_Confidence = moyenne pondérée de la fiabilité par item (high=1, medium=0.6, low=0.3). Baisse avec les usages non classifiables (dynamiques, %, calc), les positionnements ambigus (top/inset) et les marges négatives._

## Totaux

- Usages détectés : **5164** (classifiables : 5164)
- **Preferred** (échelle principale) : 2510 · **Compact-allowed** (4/12/20, secondaire) : **1530** · Exceptions : 6
- **Violations** : **1118** · Needs-decision : 0 · Non classifiés : 0
- Compact-allowed détaillé — 4px × 526 · 12px × 766 · 20px × 222 · -4px × 16
- Violations par piste — cœur DS (ERROR) : **91** · app (WARN) : 1027

> ⚠ Transparence : preferred et compact-allowed comptent tous deux conformes, mais **1530** usages reposent sur la sous-grille compacte — préférer l'échelle principale.

## Top valeurs hors-échelle (violations)

- `6px` × 527
- `2px` × 331
- `10px` × 164
- `28px` × 32
- `14px` × 28
- `-2px` × 10
- `1px` × 10
- `36px` × 8
- `-6px` × 3
- `3px` × 2

## Composants/fichiers les plus touchés

- **62 viol.** 62 compact — `src/pages/LiveSetupPage.tsx` _(warn)_
- **42 viol.** 45 compact — `src/pages/ContentQueuePage.tsx` _(warn)_
- **31 viol.** 28 compact — `src/pages/ReseauxPage.tsx` _(warn)_
- **26 viol.** 4 compact — `src/components/AccountMenu.tsx` _(warn)_
- **26 viol.** 33 compact — `src/components/TeaserResultLayout.tsx` _(warn)_
- **23 viol.** 44 compact — `src/pages/WeeklyPlanPage.tsx` _(warn)_
- **21 viol.** 43 compact — `src/pages/AnalysePage.tsx` _(warn)_
- **21 viol.** 31 compact — `src/pages/SimulatorPage.tsx` _(warn)_
- **20 viol.** 31 compact — `src/pages/PricingPage.tsx` _(warn)_
- **20 viol.** 31 compact — `src/pages/ResultPage.tsx` _(warn)_

## Recommandations

- 1118 violations hors échelle à migrer — cible PREFERRED (pas compact-allowed) : 6px/2px/10px surtout.
- 1530 usages compact-allowed (4/12/20) : conformes mais SECONDAIRES. Surveiller toute hausse (ne pas remplacer violation → compact par défaut).
- Scale adoption élevée mais cssVarAdoption ≈0 : le spacing passe par l'échelle Tailwind, pas par var(--space-*). Model A (fin P6) : aligner Tailwind sur les tokens.

## Périmètre

- Fichiers scannés : 389 (cœur ERROR : 87 · app WARN : 302)
- Erreurs de parsing : 0
