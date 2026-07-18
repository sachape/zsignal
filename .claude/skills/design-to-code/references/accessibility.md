# Accessibilité (design-to-code)

L'a11y est **bloquante** dans Storybook (addon-a11y en mode `error`). Une violation échoue le test.

## Contrôler
- HTML sémantique ; ordre du DOM cohérent avec l'ordre visuel.
- Navigation clavier complète ; focus visible ; retour du focus après fermeture (modale/menu).
- Nom accessible sur chaque contrôle ; labels de formulaire associés (`htmlFor`/`id`).
- Messages d'erreur associés au champ (`aria-describedby`).
- Rôles/attributs ARIA **uniquement** quand nécessaires (Radix les gère déjà en grande partie).
- Contraste suffisant ; information jamais portée **uniquement** par la couleur.
- Annonces dynamiques (`aria-live`) quand pertinent.
- `prefers-reduced-motion` respecté.
- Modales/menus/popovers/tooltips : focus trap, fermeture Escape, clic extérieur.
- Titres hiérarchisés ; zones tactiles ; états `disabled` compréhensibles.

## Cas fréquents Streamnco
- Bouton icône seule → `aria-label` + icône `aria-hidden`.
- Champ / switch / checkbox / slider isolé → label associé ou `aria-label`.
- Toggle → `aria-pressed` (fourni par Radix), texte ou `aria-label`.
