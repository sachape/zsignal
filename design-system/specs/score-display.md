# ScoreDisplay

> Pattern métier n°1 (des 3). Spec Vol.2 Ch.05. Ancrée dans le vrai code :
> `services/streamScoreTier.ts` + les 7 composants qui affichent le StreamScore.

## Rôle — la décision encodée

Un StreamScore ne s'affiche **jamais comme un nombre nu** : il porte toujours son
**palier** (bas / moyen / haut) et le signal couleur associé. C'est une opinion
tierée, pas une donnée brute.

## État actuel — logique centralisée, visuel dupliqué ×7

Le point de départ le plus sain des 3 patterns : la **décision est déjà une
source de vérité** — `services/streamScoreTier.ts` :

- `getScoreTier(score)` : `low` ≤24 · `mid` 25-79 · `high` 80+
- `getTierTheme(tier)` : `{ strokeVar, textClass, surfaceClass, progressClass, glowClass, label }`
- `ScoreNarrative` : headline, drags[], supports[], priority, miniBreakdown

Mais le **visuel** (l'anneau + le nombre + la couleur) est ré-implémenté dans :
`ScoreCard`, `ScoreInsightCard`, `StreamScoreEvolutionCard`, `ShareScoreCard`,
`QualitativeScoreCard`, `leaders/StreamScoreLeaderboard`, `ShareScoreButton`.

**Cible** : un composant `ScoreDisplay` unique que ces 7 consomment, au lieu de
redessiner l'anneau chacun de leur côté.

## Anatomy

```
ScoreDisplay
├── Ring        anneau de progression (SVG), couleur = palier
├── Value       le nombre (0-100), + "/100"
├── TierLabel   le libellé du palier ("Base fragile" / "En construction" / "Base solide")
└── (slot)      contenu optionnel sous le score (narratif, breakdown)
```

## API

```ts
interface ScoreDisplayProps {
  score?: number;        // 0-100. Défaut 62 (cohérent avec ScoreCard actuel).
  label?: string;        // "StreamScore" par défaut.
  locked?: boolean;      // score inconnu / gated → neutre, JAMAIS un palier.
  size?: "sm" | "md" | "lg";   // variant de taille. md par défaut.
  showLabel?: boolean;   // afficher le libellé de palier. true par défaut.
  children?: ReactNode;  // slot sous le score (narratif, breakdown).
}
```

## Variants

| Dimension | Valeurs | Note |
|---|---|---|
| `size` | sm · md · lg | Change la taille de l'anneau et du nombre. |

Le **palier** (low/mid/high) n'est **pas** un variant : il se dérive du score via
`getScoreTier`. On ne le passe jamais à la main — sinon la couleur pourrait
mentir sur le score.

## States

| État | Rendu |
|---|---|
| default | Anneau coloré selon le palier, nombre, libellé. |
| `locked` | Anneau **neutre** (`muted-foreground`), nombre en `foreground`. Aucun palier. |
| loading | Anneau en skeleton, pas de nombre. (à ajouter — aucun des 7 ne le gère) |
| empty (pas de score) | Traiter comme `locked` : neutre, « — /100 ». |

## Tokens consommés

Via `getTierTheme`, jamais en dur :
`--primary` (high) · `--warning` (mid) · `--destructive` (low, P4) ·
`--muted` (track) · `--muted-foreground` (locked) · `--foreground` (nombre).

## A11y

- Le score est une **image de données** : `role="img"` + `aria-label` =
  « StreamScore : 62 sur 100, base solide ». Le SVG seul est invisible au lecteur d'écran.
- La couleur de palier ne suffit pas (Vol.1 Ch.09) : le **libellé** de palier
  porte l'information sans dépendre de la couleur.
- Contraste du nombre sur l'anneau : vérifié par palier.

## INVALIDE — les combinaisons interdites

```
INVALIDE : locked=true + une couleur de palier
  → un score inconnu qui s'affiche coloré ment sur une valeur qu'on ne voit pas.
    (déjà géré dans ScoreCard : "Locked → neutral so the unknown state never
     reads as a tier signal" — à préserver dans le pattern.)

INVALIDE : afficher un score sans passer par getScoreTier
  → contourne la source de vérité ; la couleur et le nombre peuvent diverger.

INVALIDE : une couleur de palier (primary/warning/destructive) sur autre chose
           qu'un score
  → dilue le signal. Le palier est réservé au StreamScore.

INVALIDE : passer le tier à la main en prop
  → il se DÉRIVE du score. Le fournir permettrait un rouge sur un score de 90.
```

## Anti-usages

- ✗ Pour un pourcentage générique (progression d'upload, quota) → utiliser
  `ui/progress`. Le palier est spécifique au StreamScore.
- ✗ Pour un mini-badge de score sans contexte → toujours au moins le nombre + le
  palier ; jamais une pastille de couleur seule.

## Chemin de migration (implémentation, plus tard)

1. Extraire l'anneau de `ScoreCard` en `ScoreDisplay` (il est déjà le plus propre).
2. Les 6 autres consomment `ScoreDisplay` au lieu de redessiner.
3. Ajouter l'état `loading` (aucun ne le gère aujourd'hui).
4. Vérifié par le thermomètre : les usages dupliqués du ring tombent.

L'implémentation touche 7 composants → étape prudente, en sync avec `main`, après
validation de cette spec.
