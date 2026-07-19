# ADR 0001 — Gouvernance du spacing : grille 8/4, audit et score Health

- **Statut** : Accepté (DS P6) — 2026-07-19
- **Portée** : espacements uniquement (pas les tailles, radius, typo — phases dédiées).

## Contexte (constaté dans le code, pas supposé)

- Les tokens de spacing existent (`tokens/primitives/spacing.json` = `space.*`) mais
  **ne sont pas consommés** par les composants (`var(--space-*)` = 0 occurrence dans
  `src/components`). Les composants espacent via **utilitaires Tailwind**.
- `tailwind.config.ts` **n'override pas** `spacing` → l'échelle **par défaut** de Tailwind
  fait foi, incluant des pas hors-grille (`1.5`=6px, `2.5`=10px, `0.5`=2px, `3.5`=14px).
- Le système **sépare déjà** spacing (`space.*`) et sizing (`size.*`).
- Dette mesurée au 1er audit : **5130** usages détectés, **1087** violations (dont **100**
  dans le cœur DS `ui/`), **1035** « needs-decision » (12/20/28px). Adoption 98.5%,
  value compliance 58.6%.

## Décision

### Règle 8/4
- `0` conforme ; `4px` micro-spacing autorisé ; multiples de **8** conformes
  (`8,16,24,32,40,48,56,64,80,96,120,128`).
- Multiples de 4 hors 8 (**12, 20, 28, 36, 44…**) → **`needs-decision`** (jamais
  auto-conformes). **12 et 20 sont conservés** pour l'instant et tranchés après l'audit.
- Le reste (2, 6, 10, 14, 18…) → **`violation`**.
- **Périmètre** : `margin*`, `padding*`, `gap/row-gap/column-gap`, `inset/top/right/bottom/left`,
  `space-x/y`. **Hors périmètre** : width/height/min/max, font-size, line-height,
  border-width, border-radius, tailles d'icônes, `%`, négatifs techniques, positionnement d'animation.

### Tokens (Model A)
- **On ne renomme pas** les tokens `space.*` en P6 (l'actuel est index-based : `space-3`=12px).
  Le passage value-based est **reporté à Design Tokens V2** (phase dédiée) pour limiter le périmètre.
- Cible à terme : contraindre `tailwind.config theme.spacing` sur les tokens (supprime les pas
  hors-grille) — **seulement en fin de P6**, après migration, sinon le build casse.

### Deux indicateurs + confidence
- **Spacing value compliance** = conformes / classifiables (needs-decision non compté conforme).
- **Scale adoption** = usages passant par l'échelle (classe Tailwind) ou un token, vs valeurs brutes
  (arbitraires/inline). **≠ « Token adoption »** : l'adoption réelle des tokens CSS `var(--space-*)`
  est mesurée à part (`cssVarAdoption`, aujourd'hui ≈0). Le libellé « Token adoption » est réservé à
  cette future métrique pour ne pas laisser croire que 98,5% des usages consomment les tokens du DS.
- **Spacing Health** = `0.7·value + 0.3·scaleAdoption` (pondération documentée, ajustable).
- **Confidence** = moyenne pondérée de la fiabilité par item (high=1, medium=0.6, low=0.3) ;
  baisse avec les usages non classifiables, positionnements ambigus (top/inset), marges négatives.
  Un score sans confidence est trompeur quand les exclusions grandissent.
- Une **exception documentée** compte comme conforme. Le score n'affiche jamais 100% si le
  périmètre scanné est incomplet (`scope` porté dans le rapport).

## Conséquences
- Audit automatique `npm run audit:spacing` (read-only), rapports versionnés dans
  `reports/design-system/` (JSON machine + MD humain + history), lus par le futur Dashboard et la CI.
- CI progressive : **observation** (P6, non bloquant) → **baseline** (bloque les nouvelles
  violations) → **strict** (fin de migration). Pas de CI rouge immédiate sur la dette.
- Migration séparée, progressive, avec validation visuelle Chromatic — jamais « au plus proche »
  mathématique.

## Alternatives écartées
- Renommer les tokens maintenant (mélange gouvernance + refonte tokens → reporté V2).
- Migrer les composants vers `var(--space-*)` (à contre-courant du Tailwind-first du repo).
- Supprimer 12/20 immédiatement (décision différée post-audit).
