# Responsive (design-to-code)

## Breakpoints réels
Tailwind par défaut, utilisés dans le produit : `sm 640` · `md 768` · `lg 1024` · `xl 1280`.
Voir la foundation **Grid & Layout** dans Storybook (`design-system/stories/Grid.stories.tsx`)
et l'échelle d'espacement (tokens `--space-*`).

## Règles
- Partir du **comportement**, pas d'une réduction proportionnelle.
- Mobile-first : concevoir l'empilement d'abord, ajouter les colonnes ensuite.
- Contrôler : ordre de lecture, densité, navigation, priorité des actions.
- Éviter les largeurs fixes non justifiées ; préférer la grille utilitaire + tokens d'espacement.
- Vérifier textes longs / traductions, overflow horizontal ET vertical.
- Zones tactiles suffisantes.
- Définir explicitement ce qui **se masque, se replie, se déplace ou change de pattern** à chaque seuil.

## Anti-pattern
« tester le responsive » sans nommer les viewports. Toujours indiquer les tailles réellement vérifiées.
