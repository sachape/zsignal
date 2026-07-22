# ADR 0004 — Gouvernance de la typographie : échelle de texte et line-height dérivé

- **Statut** : Accepté — 2026-07-20
- **Portée** : `font-size` et `line-height` uniquement (letter-spacing, font-weight, familles = hors périmètre).
- **Surface** : **DS produit** (composants `ui/` + surfaces produit en Instrument Sans). Le **site marketing/blog** (`el-*`/Inter) est une surface **exemptée**, avec sa propre échelle.
- **Filiation** : complète l'ADR `0001-spacing-8-4-grid` (qui excluait explicitement font-size/line-height, « phases dédiées »).

## Contexte (constaté dans le code, pas supposé)

- L'échelle typo existe (`tokens/primitives/typography.json` → `font.size.*`) avec des pas
  hors d'une grille cohérente : `12, 13, 14, 16, 18, 20, 24, 30, 36` px.
- `tailwind.config.ts` **n'override pas** `fontSize` ni `lineHeight` → les classes `text-*` / `leading-*`
  utilisent les défauts Tailwind (`text-sm`=14px, `text-xs`=12px). Piège de nommage :
  `text-sm` Tailwind (14px) ≠ token `font.size.sm` (13px).
- Les line-height étaient des **ratios** libres (`tight`=1.1, `snug`=1.25, `normal`=1.5, `relaxed`=1.65),
  choisis à la main par style composite — aucune règle.
- `13px` (token `sm`) est utilisé ~29× (`text-[13px]`) ; `18px` (token `lg`) ~4×.
  `30px`/`36px` : 0 usage brut, seulement via les styles sémantiques `heading.lg` / `display.lg`.

## Décision

### Échelle font-size autorisée (px)
`12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 88, 96`.
Toute autre valeur = **violation** (hors dérogation optique documentée dans
`design-system/health/exceptions.json`).

### Line-height dérivé (non libre)
Le line-height est **fonction de la taille**, plus un choix :
- `size + 4` pour **12** et **14** → 16, 18.
- `size + 8` au-delà → 16→24, 20→28, 24→32, 28→36, 32→40, 40→48, 48→56, 56→64, 64→72,
  72→80, 80→88, 88→96, 96→104.

Les ratios `line.height.tight/snug/normal/relaxed` sont **abandonnés** au profit de tokens
`line.height.<px>` absolus, un par taille de l'échelle.

### Réconciliation des tokens existants (arrondi montant ≥)
| token | avant | après |
|---|---|---|
| `font.size.sm` | 13px | **14px** |
| `font.size.lg` | 18px | **20px** |
| `font.size.3xl` | 30px | **32px** |
| `font.size.4xl` | 36px | **40px** |

`xs`(12), `base`(14), `md`(16), `xl`(20), `2xl`(24) déjà conformes, inchangés.

### Consolidation des doublons (fait)
L'arrondi montant rendait `sm`(14) = `base`(14) et `lg`(20) = `xl`(20). Ces doublons de primitive
n'ayant **aucun consommateur** (`--font-size-sm/lg` inutilisés dans `src/`, aucune référence token
hors couche sémantique), ils ont été **supprimés** : `font.size` = `xs, base, md, xl, 2xl, 3xl, 4xl`
(12, 14, 16, 20, 24, 32, 40 — distincts). Les styles sémantiques ont été repointés :
`body.sm` / `label.sm` / `code` → `{font.size.base}` ; `title.md` → `{font.size.xl}`.
On **ne renomme pas** le reste de l'échelle (cf. ADR 0001 « Model A »).

**Rôles sémantiques fusionnés (fait)** : `body.sm` et `label.sm` étant devenus identiques à leurs
variants `.md` (14/18), et sans aucun consommateur, ils ont été **supprimés**. Rôles restants :
`display.lg`, `heading.lg`, `heading.md`, `title.md`, `body.md`, `label.md`, `caption`, `code`.

## Conséquences
- `body.sm` / `label.sm` / `code` passent de 13→14px ; `title.md` 18→20px ; `heading.lg` 30→32px ;
  `display.lg` 36→40px. Les line-height de ces styles suivent la formule dérivée.
- Les classes Tailwind `text-*` ne sont pas affectées (défauts non overridés) ; les `text-[13px]` /
  `text-[18px]` en dur deviennent des **violations à traiter** (migration UI ultérieure).
- Miroir Figma synchronisé (variables `font/size/*` et `line/height/*`).

### Plancher dur 12px (pas de sous-échelle compact)
Contrairement au spacing (qui a une sous-grille `compact-allowed` 4/12/20, ADR 0002), la typographie
**n'a pas de tolérance compact** : `12px` est le **plancher dur**. Aucun texte < 12px (lisibilité/a11y).

## Migration produit (faite — 2026-07-20)
613 usages hors-règle migrés sur **101 fichiers produit** (marketing exclu) :
- sub-12 (`text-[8|9|10|11px]`, 567 usages) → `text-[12px]` ;
- `text-[13px]`→`[14px]` ; `text-[15px]`→`[16px]` ;
- `text-lg`(18)→`text-xl`(20) ; `text-3xl`(30)→`text-[32px]` ; `text-4xl`(36)→`text-[40px]`.
- typecheck / lint:tokens / build : verts. **QA visuelle app tournante requise avant merge** (changement de densité).

## Suivi
- Garde-fou `check:typography` : **fait** — implémenté en 2026-07-22 sous une forme plus large,
  `npm run check:foundations` (`design-system/health/check-foundations.mjs`), qui ratchette la
  typographie **et** les 9 autres échelles gouvernées. Bloquant en CI. Baseline gelée dans
  `reports/design-system/history/foundations-baseline.json` ; ratchet sur le **compte absolu**
  d'usages hors échelle (un pourcentage remonte tout seul quand le dénominateur grossit).
  Dette typo au gel : **23** usages hors échelle (`text-3xl` ×8, `text-lg` ×4, `text-[10.5px]` ×3).
- Conformité **line-height** des classes utilitaires Tailwind (non overridées) : **backlog** (la règle LH est satisfaite au niveau tokens, pas encore au niveau `text-*`/`leading-*`).
