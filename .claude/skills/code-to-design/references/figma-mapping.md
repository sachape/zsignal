# Code → Figma — contrat de reconstruction

Le **cœur** de `code-to-design` : traduire du code de production (JSX/TSX + Tailwind + tokens)
en **primitives Figma modernes** — Components, Instances, Variants, Component properties,
Variables, Auto Layout. Objectif : une spec **reconstructible telle quelle** dans Figma.

**Spec-only.** Ce fichier décrit la traduction, il n'exécute rien. Aucun push Figma sans outil
réel détecté ET demande explicite (voir garde-fous du SKILL). Chaque règle produit un élément
**étiqueté** `certain / déduit / ambigu / absent` (voir `modes.md`).

---

## 1. Nature Figma du bloc (avant tout mapping)
Décider ce que le bloc **doit devenir** dans Figma :

| Signal dans le code | Nature Figma |
|---|---|
| Composant réutilisé (`src/components/ui/*`), API à variants (CVA) | **Component** (main component) |
| Usage d'un composant existant avec props fixées | **Instance** (+ overrides des properties) |
| Composition locale récurrente sans composant dédié | **Pattern** (frame réutilisable, pas un Component) |
| Bloc unique de mise en page | **Frame** simple (Section / Layout) |

## 2. Structure → arbre de frames
- Chaque élément porteur de layout (`div`, `section`, wrapper) → un **Frame**.
- Nommer les frames par **rôle**, pas par balise (`Content`, `Leading icon`, `Label`).
- Un composant enfant réutilisé → **Instance** imbriquée, pas un frame recopié.

## 3. Layout → Auto Layout
| Code (Tailwind / CSS) | Figma |
|---|---|
| `flex flex-row` / `flex` | Auto Layout **Horizontal** |
| `flex flex-col` | Auto Layout **Vertical** |
| `inline-flex` | Auto Layout (Hug par défaut) |
| `justify-start / center / end` | Alignement **axe primaire** : start / center / end |
| `justify-between` | **Space between** |
| `items-start / center / end` | Alignement **axe secondaire** : start / center / end |
| `gap-x/-y / gap-[var(--…)]` | **Gap** (mapper le token si `var()`) |
| `p-* / px-* / py-* / p-[var(--…)]` | **Padding** (H/V ; token si `var()`) |
| `w-full` / `flex-1` | Largeur **Fill container** |
| `w-fit` / contenu intrinsèque | Largeur **Hug contents** |
| `w-[240px]` / `w-64` | Largeur **Fixed** (valeur) |
| `h-*` idem | Hauteur Fill / Hug / Fixed selon la même logique |
| `min-w/max-w/min-h/max-h` | **Min/Max** width/height |
| `overflow-hidden` | **Clip content** activé |

## 4. Style → propriétés Figma
| Code | Figma |
|---|---|
| `rounded-md / rounded-[var(--…)]` | **Corner radius** → Variable radius (§6) |
| `bg-* / text-* / border-*` (sémantique) | Fill / Text / Stroke → **Variable couleur** (§6) |
| `shadow-* / shadow-[…]` | **Effect** (drop shadow) → style/variable d'effet |
| `border / border-2` | **Stroke** (weight = border width token) |
| classes typo (`text-sm`, `font-medium`, `leading-*`) | **Text style** / typographie → Variable typo (§6) |

## 5. Code → **Component Properties Figma** (explicite)
Traduire l'**API du composant** (props CVA / TS) en **properties** Figma — c'est ce qui rend
le Component pilotable, pas seulement un frame figé.

| Prop dans le code | Component property Figma |
|---|---|
| `variant: "default" \| "destructive" \| "secondary"` (CVA) | **Variant property** `variant` (une valeur par option) |
| `size: "sm" \| "md" \| "lg"` | **Variant property** `size` |
| `disabled: boolean`, `leadingIcon?`, `trailingIcon?` | **Boolean property** (`disabled`, `leadingIcon`, `trailingIcon`) |
| `children` / `label: string` | **Text property** (`label`) |
| `icon={<Download/>}` / slot d'icône | **Instance swap property** (`icon`) |

> Chaque combinaison de **Variant properties** → une variante du **Component set** Figma.
> Une prop non exposée par le code → property **absente** (ne pas inventer).

## 6. Code → **Variables Figma** (explicite)
Un token **réellement consommé** n'est pas juste « un token » : c'est une **Variable Figma**
(collection + mode). Le mapping doit être nommé jusqu'à la variable.

```
Code                              → Token sémantique            → Variable Figma
bg-primary / --button-…-background → color.action.primary.background → Variables/Color/action-primary-background
rounded-[var(--button-radius)]     → radius.control               → Variables/Radius/control
gap-[var(--button-gap)]            → space.component.sm           → Variables/Spacing/component-sm
text-sm font-medium                → typography.label.md          → Variables/Typography/label-md
```
- **Modes** : les paires `*.generated.css` / `*.light.generated.css` → deux **modes** de la
  collection (Dark / Light) sur la **même** Variable.
- Une valeur **en dur** (hex, `[10px]`) → **pas** de Variable → signaler comme divergence (`modes.md`).
- Un `--button-*` généré mais **non consommé** par le composant → Variable **candidate non liée**
  → signaler (cf. dette relevée sur Button).

## 7. Étiquetage de certitude (obligatoire par élément)
- **certain** — la classe / le token est explicitement dans le code (`fichier:ligne`).
- **déduit** — conséquence raisonnable (ex. structure interne `Content` d'un flex).
- **ambigu** — plusieurs lectures possibles (ex. `w-full` = Fill *ou* Fixed selon le parent).
- **absent** — non déterminable statiquement (ex. transition runtime entre états) → ne pas inventer.
