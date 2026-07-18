# Typographie & grille (étages 5 et 2)

> Les deux fondations qu'il fallait fermer avant de spécifier les composants
> (Vol.1 Ch.07, ordre de construction). Extraites du **vrai usage** du code, pas
> décidées dans le vide. Mesures : `grep` sur `src/components` + `src/pages`
> (marketing `/site/` exclu).

---

## Étage 5 — Typographie

### Les familles réellement utilisées (système app)

| Famille | Font | Usage app | Rôle |
|---|---|---|---|
| `font-sans` (défaut) | Instrument Sans | corps de texte | Lecture, UI. |
| `font-display` | Instrument Sans | 16 fichiers | Titres. **Même font que `sans`.** |
| `font-mono` | JetBrains Mono | 7 fichiers | Données, chiffres, code. |
| `font-brand` | Boogaloo | **0 fichier** | ⚠️ Classe morte dans l'app (voir ci-dessous). |
| `font-el-*` | Fraunces / Inter | ~12 fichiers | Marketing qui **fuit** dans des pages publiques. |

**Deux constats qui appellent une décision :**

1. **`display` et `sans` sont la même font** (Instrument Sans). Il n'y a donc pas
   de distinction de famille entre titre et corps — la hiérarchie se fait par le
   **poids et la taille**, pas par la police. C'est un choix légitime (un seul
   caractère, cohérent) — mais autant le savoir : `font-display` n'apporte rien
   que `font-sans font-semibold` ne fasse déjà.

2. **`font-brand` (Boogaloo) est morte dans l'app** : déclarée dans la config,
   importée, mais jamais appliquée via la classe. Elle sert aux titres du **site
   marketing** via une règle CSS (`index.css:193`) — donc hors scope app. →
   Décision de gouvernance : retirer `font-brand` de la config app, ou l'assumer
   comme purement marketing.

### L'échelle de taille réellement employée

Comptage des classes `text-*` dans l'app :

| Taille | Occurrences | Lecture |
|---|---|---|
| `text-xs` (12px) | **568** | La taille dominante. |
| `text-sm` (14px) | **489** | La seconde. |
| `text-base` (16px) | 51 | Rare. |
| `text-lg` → `text-xl` | 43 | Titres de bloc. |
| `text-2xl` → `text-3xl` | 50 | Titres de section/page. |
| `text-4xl` / `text-5xl` | 4 | Exceptionnel. |

**Le fait marquant : la taille de lecture par défaut de Streamnco est 12-14px,
pas 16px.** 1057 usages en `xs`/`sm` contre 51 en `base`. C'est un produit
**dense** — un outil expert quotidien (cohérent avec la densité « high » de
Vol.2 Ch.04). Le DS doit assumer que `text-sm` (14px) est le corps par défaut,
pas `text-base`.

Pas d'échelle custom : ce sont les tailles Tailwind par défaut. → **On garde
l'échelle Tailwind**, on ne réinvente pas. Ce qu'il faut documenter, ce sont les
**rôles** (voir styles de texte ci-dessous), pas les valeurs.

### Styles de texte recommandés (à formaliser en Phase 3)

Dérivés de l'usage réel — nommer les rôles rend le prompt-to-UI fiable :

| Rôle | Classes | Où |
|---|---|---|
| `page-title` | `text-2xl font-semibold` | Titre de page. |
| `section-title` | `text-lg font-semibold` | Titre de section. |
| `body` | `text-sm` | **Le corps par défaut.** |
| `body-strong` | `text-sm font-medium` | Emphase. |
| `caption` | `text-xs text-muted-foreground` | Métadonnées, labels. |
| `data` | `font-mono tabular-nums` | Chiffres, scores. |

## Étage 2 — Grille, breakpoints, responsive

### Breakpoints réellement utilisés

| Breakpoint | Occurrences | Statut |
|---|---|---|
| `sm:` (640px) | 243 | Actif. |
| `md:` (768px) | 150 | Actif. |
| `lg:` (1024px) | 57 | Actif. |
| `xl:` (1280px) | 1 | Quasi inutilisé. |
| `2xl:` (1400px, custom) | — | Seulement le container max. |

**Les breakpoints réels sont `sm` / `md` / `lg`.** `xl` et `2xl` ne servent pas
(sauf la largeur max du container à 1400px). Le DS doit documenter trois
breakpoints, pas cinq. Mobile-first (base = mobile, puis on élargit).

### Patterns de grille dominants

| Pattern | Occurrences |
|---|---|
| `grid-cols-2` | 88 |
| `grid-cols-3` | 26 |
| `lg:grid-cols-3` | 16 |
| `lg:grid-cols-4` | 10 |
| `md:grid-cols-2/3` | 12 |

**La stratégie responsive extraite** : mobile-first, la plupart des grilles
partent à 1-2 colonnes et s'élargissent à `lg`. Le pattern canonique est
`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Le container est centré, padding
2rem, max 1400px.

### Règle responsive du DS

- **Trois breakpoints** : `sm` (640), `md` (768), `lg` (1024). Mobile-first.
- **Container** : centré, padding 2rem, max 1400px (`2xl`).
- Les tableaux data-dense (le cas critique du produit) ont besoin d'une stratégie
  mobile explicite — à définir en Phase 3 avec le pattern `ScoreDisplay`.

## Décisions surfacées

1. **`font-display`** = `font-sans` : gardé comme alias de rôle (utile au
   prompt-to-UI). ⏳ à valider.
2. **`font-brand` (Boogaloo)** : ✅ **retirée** (2026-07-18) — de la config
   Tailwind, de l'import de fonts (plus téléchargée pour rien), et le commentaire
   périmé corrigé (les titres du site sont en `font-display`, pas Boogaloo).
3. **Fuite marketing** : Fraunces/Inter dans ~12 pages publiques. À nettoyer avec
   le système marketing (phase ultérieure).
4. **Corps par défaut = `text-sm` (14px)**, pas 16px. Assumé.

## Le gate (étages 2 et 5)

- [x] Familles de texte réelles identifiées (app : Instrument Sans + JetBrains Mono).
- [x] Échelle de taille documentée (Tailwind défaut ; corps = 14px assumé).
- [x] Styles de texte nommés par rôle (à formaliser en composants Phase 3).
- [x] Breakpoints réels (3 : sm/md/lg) et stratégie responsive documentés.
- [x] Container et patterns de grille canoniques documentés.

Les étages 1, 2, 3, 4, 5 et 10 du Ch.07 sont désormais fermés. Restent 6, 7, 8
(les composants et patterns) — c'est la Phase 3, maintenant sur des fondations
complètes.
