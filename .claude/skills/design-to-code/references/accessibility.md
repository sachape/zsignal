# Accessibilité (design-to-code)

Exigences communes, statut bloquant (axe `error`) et cible WCAG AA : voir
`../../_shared/accessibility.md`. **Ici : comment les IMPLÉMENTER** dans ce dépôt (React + Radix).

## Implémenter (spécifique dépôt)
- HTML sémantique + ordre du DOM cohérent avec l'ordre visuel — **avant** tout ARIA.
- Labels de formulaire associés via `htmlFor`/`id` ; messages d'erreur reliés au champ (`aria-describedby`).
- Rôles/attributs ARIA **uniquement** quand nécessaires : Radix fournit déjà l'essentiel
  (focus trap, `Escape`, clic extérieur, `aria-pressed`…) — ne pas le redéfinir à la main.
- Annonces dynamiques via `aria-live` quand pertinent.

## Cas fréquents Streamnco
- Bouton icône seule → `aria-label` + icône `aria-hidden`.
- Champ / switch / checkbox / slider isolé → label associé ou `aria-label`.
- Toggle → `aria-pressed` (fourni par Radix), texte ou `aria-label`.
