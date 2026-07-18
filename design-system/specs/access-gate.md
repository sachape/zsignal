# AccessGate

> Pattern métier n°3. Spec Vol.2 Ch.05. Ancrée dans `PaywallGate.tsx`
> (`FullPageLock`, `InlineLock`, `LimitBanner`) et `ProFeatureGate.tsx`.

## Rôle — la décision encodée

Une capacité Pro est bloquée de façon **cohérente**, avec un **chemin d'upgrade**
— jamais un cul-de-sac. Chaque blocage est **instrumenté** (conversion mesurée).

## État actuel — déjà un pattern, à unifier

Le plus mûr des 3. `PaywallGate` fournit **déjà trois variantes** bien
structurées, chacune avec analytics (`analytics.paywallHit(feature, …)`) :

| Sous-composant | Usage |
|---|---|
| `FullPageLock` | La feature entière est verrouillée. (icon, feature, description, bullets) |
| `InlineLock` | Contenu partiellement flouté, upgrade par-dessus. (children, feature, blurHeight) |
| `LimitBanner` | Quota atteint. (current, max, label) |

**Ce qui manque** : `ProFeatureGate` (composant séparé) recouvre `PaywallGate` —
deux portes pour le même mur. Et aucune n'a d'API de variant formelle (E-06 :
0 composant custom en CVA).

**Cible** : unifier `PaywallGate` + `ProFeatureGate` sous un `AccessGate` avec un
`variant` explicite.

## Anatomy

```
AccessGate (variant = full | inline | limit)
├── Signal        ce qui est bloqué (icône, feature)
├── Reason        pourquoi (description, bullets)
├── UpgradePath   le CTA vers Pro — OBLIGATOIRE
└── Analytics     paywallHit(feature, variant) — au montage
```

## API

```ts
interface AccessGateProps {
  variant: "full" | "inline" | "limit";
  feature: string;              // clé analytics + libellé. Obligatoire.
  description?: string;
  bullets?: string[];           // variant "full"
  children?: ReactNode;         // variant "inline" (contenu flouté)
  blurHeight?: string;          // variant "inline"
  current?: number;             // variant "limit"
  max?: number;                 // variant "limit"
}
```

## Variants

| `variant` | Quand | Vient de |
|---|---|---|
| `full` | La feature entière est Pro. | `FullPageLock` |
| `inline` | Aperçu flouté d'un contenu Pro. | `InlineLock` |
| `limit` | Quota du plan atteint. | `LimitBanner` |

## States

| État | Rendu |
|---|---|
| default | Le blocage + le chemin d'upgrade. |
| (utilisateur Pro) | **Le gate ne rend rien** — il laisse passer `children`. |

## Tokens consommés

Surfaces standards + `--primary` (le CTA upgrade). Jamais en dur.

## A11y

- Le contenu flouté (`inline`) ne doit pas être lisible par un lecteur d'écran
  s'il est visuellement masqué (`aria-hidden` sur le flou, le CTA reste focusable).
- Le CTA upgrade est atteignable au clavier.

## INVALIDE — les combinaisons interdites

```
INVALIDE : un gate sans chemin d'upgrade
  → un cul-de-sac. Un blocage doit toujours offrir la sortie (passer Pro).

INVALIDE : un gate sans `feature` (clé analytics)
  → aveugle sur la conversion. Chaque blocage se mesure (paywallHit).

INVALIDE : variant="full" pour un contenu partiel
  → utiliser "inline". Verrouiller toute la page pour flouter 3 lignes est disproportionné.

INVALIDE : rendre le gate à un utilisateur Pro
  → il doit laisser passer. Un Pro qui voit un paywall est un bug de gating.
```

## Anti-usages

- ✗ Pour une erreur de permission (pas de monétisation) → un message d'erreur,
  pas un paywall. AccessGate = « passe Pro », pas « tu n'as pas le droit ».
- ✗ Pour cacher une feature en beta → un feature flag, pas un gate.

## Chemin de migration

1. Fusionner `ProFeatureGate` dans `AccessGate` (une porte, pas deux).
2. Exposer `variant` (full | inline | limit) — formaliser les 3 sous-composants.
3. Conserver l'analytics (déjà en place, c'est le point fort).

Touche les usages de `ProFeatureGate` → étape prudente, après validation.
