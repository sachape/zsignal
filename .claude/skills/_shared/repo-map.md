# Streamnco — carte du dépôt (faits vérifiés)

Référence factuelle partagée par les Skills. Ne pas dupliquer ; pointer ici.

## Stack
- Vite + React + TypeScript, shadcn/ui (Radix) + Tailwind, Supabase.
- Gestionnaire de paquets : **npm** (`package-lock.json` fait foi ; un `bun.lockb`
  maintenu par Lovable coexiste — ne pas s'y fier pour les commandes).
- Alias : `@` → `./src`.

## Où vivent les choses
| Domaine | Chemin |
|---|---|
| Composants primitifs (shadcn) | `src/components/ui/` |
| Composants métier / features | `src/components/**`, `src/pages/**` |
| Contextes / hooks / services | `src/contexts/`, `src/hooks/`, `src/services/` |
| Tokens (source DTCG, 3 couches) | `tokens/{primitives,semantic,components}/*.json` + `tokens/compat*.json` |
| CSS de tokens GÉNÉRÉ | `src/tokens.generated.css`, `src/tokens.light.generated.css` |
| Pipeline tokens (Style Dictionary) | `design-system/tokens.build.mjs` → `npm run tokens:build` |
| Config Tailwind | `tailwind.config.ts` (maintenue à la main) |
| Storybook | `.storybook/`, stories dans `design-system/stories/` |
| Catalogue de features (généré) | `design-system/stories/catalog/` |
| Docs Design System (autorité) | `design-system/*.md` + `design-system/CONTRIBUTING.md` |
| Outils DS | `design-system/tools/{lint-tokens,inventory,catalog,gen-catalog-stories}.mjs` |
| CI | `.github/workflows/{ci,chromatic}.yml` |

## Documents d'autorité (à lire, pas recopier)
- `design-system/03-foundations.md` — fondations (tokens, patterns nommés).
- `design-system/02-tokens.md`, `design-system/05-components.md`, `design-system/06-catalog.md`.
- `design-system/CONTRIBUTING.md` — règles d'écriture des stories.
- `design-system/README.md` — vue d'ensemble.

Ces docs jouent le rôle du « handbook » pour ce dépôt. Le handbook PDF d'origine
n'est PAS dans ce repo : ne pas le citer comme s'il y était.

## Ce que le dépôt N'A PAS
- Pas de Figma configuré / Code Connect actif → aucun Skill ne doit exiger Figma.
- Pas de tests e2e (Playwright app) configurés — seulement vitest (unit + storybook browser).
- `npm run lint` (eslint) échoue sur ~105 erreurs legacy Lovable (non bloquant en CI).
