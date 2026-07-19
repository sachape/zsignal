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
| Storybook | `.storybook/` ; stories dans `design-system/stories/` avec sous-dossiers `getting-started/`, `foundations/`, `health/`, `docs/`, `catalog/` |
| Catalogue de features (généré) | `design-system/stories/catalog/` |
| Docs Design System (autorité) | `design-system/*.md` + `design-system/CONTRIBUTING.md` |
| Décisions d'architecture (ADR) | `docs/adr/*.md` |
| Moteur Health (audit read-only) | `design-system/health/` (`run.mjs`, `contract.mjs`, `domains.mjs`, `overall.mjs`, `providers/`, `exceptions.json`) |
| Rapports Health (générés) | `reports/design-system/*.json` + `.md` (voir `validation.md`) |
| Outils DS | `design-system/tools/{lint-tokens,inventory,catalog,gen-catalog-stories,inject-descriptions}.mjs` |
| CI | `.github/workflows/{ci,chromatic}.yml` (a11y bloquante, garde-fou tokens, Chromatic TurboSnap) |

## Documents d'autorité (à lire, pas recopier)
- `docs/adr/*.md` — décisions d'architecture (ex. `0001-spacing-8-4-grid`,
  `0002-spacing-check-compact-allowance`). Autorité la plus haute pour les décisions gouvernées.
- `design-system/03-foundations.md` — fondations (tokens, patterns nommés).
- `design-system/02-tokens.md`, `design-system/05-components.md`, `design-system/06-catalog.md`.
- `design-system/CONTRIBUTING.md` — règles d'écriture des stories.
- `design-system/README.md` — vue d'ensemble.

Ces docs jouent le rôle du « handbook » pour ce dépôt. Le handbook PDF d'origine
n'est PAS dans ce repo : ne pas le citer comme s'il y était.

## Ce que le dépôt N'A PAS
- Pas de Figma configuré / Code Connect actif → aucun Skill ne doit exiger Figma.
- Pas de tests e2e (Playwright app) configurés — seulement vitest (unit + storybook browser).
- `npm run lint` (eslint) peut exposer de la **dette legacy hors périmètre** (non bloquant en CI).
  Le nombre d'erreurs est une mesure ponctuelle qui change à chaque commit : **toujours exécuter
  la commande et rapporter le résultat du run courant** — ne jamais affirmer que le lint « passe »
  sur la base d'un résultat historique.
