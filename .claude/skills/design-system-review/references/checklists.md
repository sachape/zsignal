# Design System Review — checklists

## Tokens
- [ ] Primitives / sémantiques / tokens composants au bon niveau.
- [ ] Alias corrects, sans référence circulaire, noms cohérents.
- [ ] Pas de valeur dupliquée qui devrait être un token.
- [ ] Usage par thème (light/dark) cohérent.
- [ ] Aucune valeur en dur / classe arbitraire hors système (`npm run lint:tokens` sur `ui/`).
- [ ] Pas de token sémantique lié à un seul écran sans justification.
- [ ] Cohérence avec `design-system/02-tokens.md` / `03-foundations.md`.

## Composants
- [ ] Le composant n'existe pas déjà (pas de duplication).
- [ ] Responsabilité claire ; séparation générique (`ui/`) vs métier.
- [ ] API publique saine ; pas de booléens contradictoires ; pas d'explosion de variantes.
- [ ] Composition privilégiée ; état contrôlé/non contrôlé cohérent ; forwarding d'attributs / `ref` si utile.
- [ ] Sémantique HTML ; pas de style de contournement ; testable.

## Storybook (détail : ../../_shared/storybook.md, design-system/CONTRIBUTING.md)
- [ ] Story présente ; nom = rendu ; Controls compatibles avec la promesse.
- [ ] Variantes publiques + états significatifs + contenu extrême + thème.
- [ ] Interactions (`play`) sur les comportements ; mocks déterministes ; pas de story cassée/trompeuse.
- [ ] Cohérence production ↔ Storybook.

## Accessibilité système
- [ ] Focus, clavier, sémantique, labels, contraste, erreurs, états, mouvement.
- [ ] Comportements des composants interactifs et composites.

## Anti-faux-positifs (pour tout script)
Exclure : fichiers de tokens eux-mêmes, fixtures, snapshots, docs, données de test, SVG/assets
justifiés, palette marketing `el-*`.
