# Accessibilité (principe commun)

Règle **transversale** du dépôt. Le détail d'implémentation vit dans `design-to-code`,
le détail de vérification du rendu dans `ui-qa` ; **les principes et exigences vivent ici**.

## Statut : exigence BLOQUANTE, pas un contrôle optionnel
- L'addon a11y (`@storybook/addon-a11y`, axe-core) tourne en mode **`test: "error"`**
  (`.storybook/preview.tsx`) et est réellement branché dans vitest (`.storybook/vitest.setup.ts`).
  Une violation axe **fait échouer** `npm run test` (CI rouge).
- Cible : **WCAG 2.1 AA** (jeu de règles axe-core).

## Exigences minimales (partout, pas seulement en story)
- **Navigation clavier** : tout élément interactif atteignable et actionnable au clavier.
- **Focus visible** + ordre de focus logique ; piégeage/restauration du focus pour les overlays.
- **Noms & rôles accessibles** : label associé ou `aria-label` (champ, switch, checkbox, slider,
  bouton-icône seul) ; HTML sémantique avant ARIA.
- **Contraste** AA ; l'information **jamais portée par la seule couleur**.
- **États** `disabled` / `error` / `loading` annoncés (pas seulement visuels ; erreurs reliées au champ).
- **`prefers-reduced-motion`** respecté pour toute animation.

## Portée du réglage Storybook (à ne pas mal lire)
Trois règles « landmark » sont désactivées (`region`, `landmark-one-main`, `page-has-heading-one`)
**uniquement** parce qu'une story rend un composant **isolé** (pas de `<main>`). Ce n'est **pas**
une licence pour ignorer les landmarks dans une vraie page. Contraste, labels, rôles, focus
restent vérifiés et bloquants.

## Validation & honnêteté
- Commande réelle : `npm run test` (projet vitest `storybook`, navigateur headless) — voir `validation.md`.
- **Ne jamais** prétendre qu'un contrôle a11y passe sans avoir exécuté la commande et lu sa sortie.
- Distinguer une violation **confirmée** (axe/commande) d'un point **à vérifier en runtime**
  (voir `sources-and-evidence.md`).

## Répartition
- `_shared/accessibility.md` → principes, exigences, sources d'autorité (ce fichier).
- `design-to-code` → comment **implémenter** ces exigences.
- `ui-qa` → comment les **vérifier** dans le rendu réel.
