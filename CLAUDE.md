# Streamnco (zsignal)

Faits durables du projet. Les procédures multi-étapes vivent dans les Skills (`.claude/skills/`),
pas ici.

## Stack
Vite + React + TypeScript, shadcn/ui (Radix) + Tailwind, Supabase (projet Lovable).
Gestionnaire : **npm** (`package-lock.json` fait foi). Alias `@` → `./src`.

## Design System
- Tokens en 3 couches, source `tokens/**.json` (DTCG) → générés par `npm run tokens:build`
  (Style Dictionary). Ne pas éditer `src/tokens.generated.css` à la main.
- Composants shadcn dans `src/components/ui/` ; Storybook dans `design-system/stories/` ;
  docs DS dans `design-system/*.md` + `design-system/CONTRIBUTING.md`.
- Un composant consomme un token **sémantique**, jamais une primitive en dur.
  Garde-fou : `npm run lint:tokens` (bloque hex/arbitraire/primitive dans le cœur `ui/`).

## Commandes de validation (réelles)
`npm run typecheck` · `npm run lint:tokens` · `npm run test` (vitest : unit + storybook
navigateur + a11y bloquante) · `npm run build-storybook` · `npm run build`.
`npm run lint` (eslint) échoue sur de la dette legacy → non bloquant.

## Project Skills

Workflows réutilisables dans `.claude/skills/` (voir `.claude/README.md`).

- `/product-discovery` : cadrer un problème produit avant l'implémentation.
- `/design-to-code` : implémenter ou refondre une feature avec le Design System.
- `/code-to-design` : documenter et reconstruire la logique de conception d'un code existant.
- `/design-system-review` : auditer la conformité au Design System.
- `/ui-qa` : valider le rendu (UX, UI, responsive, états, accessibilité).

Garder les faits durables ici ; garder les procédures dans les Skills.
