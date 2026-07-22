# Spacing Health — rapport humain

> Généré le 2026-07-20T14:38:09.508Z · contrat v1 · **read-only** (aucune migration).

## Score

| Indicateur | Valeur |
|---|---|
| **Spacing Health** | **86.4%** |
| Spacing value compliance | 81.1% |
| Scale adoption (échelle, pas var(--space-*)) | 98.7% |
| CSS token adoption (var(--space-*)) | 0.0% |
| **Confidence** | **96.3%** |

_Confidence = moyenne pondérée de la fiabilité par item (high=1, medium=0.6, low=0.3). Baisse avec les usages non classifiables (dynamiques, %, calc), les positionnements ambigus (top/inset) et les marges négatives._

## Totaux

- Usages détectés : **5423** (classifiables : 5423)
- **Preferred** (échelle principale) : 2835 · **Compact-allowed** (4/12/20, secondaire) : **1531** · Exceptions : 30
- **Violations** : **1027** · Needs-decision : 0 · Non classifiés : 0
- Compact-allowed détaillé — 4px × 527 · 12px × 766 · 20px × 222 · -4px × 16
- Violations par piste — cœur DS (ERROR) : **0** · app (WARN) : 1027

> ⚠ Transparence : preferred et compact-allowed comptent tous deux conformes, mais **1531** usages reposent sur la sous-grille compacte — préférer l'échelle principale.

## Top valeurs hors-échelle (violations)

- `6px` × 467
- `2px` × 327
- `10px` × 149
- `28px` × 31
- `14px` × 23
- `-2px` × 10
- `36px` × 8
- `1px` × 4
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

- 1027 violations hors échelle à migrer — cible PREFERRED (pas compact-allowed) : 6px/2px/10px surtout.
- 1531 usages compact-allowed (4/12/20) : conformes mais SECONDAIRES. Surveiller toute hausse (ne pas remplacer violation → compact par défaut).
- Scale adoption élevée mais cssVarAdoption ≈0 : le spacing passe par l'échelle Tailwind, pas par var(--space-*). Model A (fin P6) : aligner Tailwind sur les tokens.

## Périmètre

- Fichiers scannés : 433 (cœur ERROR : 105 · app WARN : 328)
- Erreurs de parsing : 0
