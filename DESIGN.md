# Design — Streamnco

Vue d'ensemble du design du **produit Streamnco**. L'autorité détaillée vit dans
`design-system/` ; ce fichier donne le cadre.

## Deux systèmes visuels distincts
1. **App produit** — sombre, accent **lime** (`#89FD3A`), basée sur shadcn/ui (Radix) + Tailwind.
   C'est le cœur : tokens en 3 couches, composants dans `src/components/ui/`, documentés dans Storybook.
2. **Site marketing / landing** — éditorial, clair, palette `el-*` (Fraunces/Inter), **fixée en hex**
   et indépendante des tokens de l'app. Ne pas confondre les deux.

## Architecture de tokens (source de vérité)
```
tokens/primitives/  →  tokens/semantic/  →  tokens/components/
   (valeurs brutes)       (intentions)         (par composant)
```
Source DTCG en JSON → générée par **Style Dictionary** (`npm run tokens:build`) vers
`src/tokens.generated.css` (+ `.light`), SCSS et TS. Ne pas éditer le CSS généré à la main.
Un composant consomme un token **sémantique**, jamais une primitive en dur.
Garde-fou : `npm run lint:tokens`.

## Principes
- **Dark par défaut**, `.light` en override (toggle de thème).
- Le **lime** est la marque (`--primary`) ; le **teal** (`--accent`) est une couleur secondaire de
  tint, jamais une action.
- Sobriété : les bordures « chuchotent », l'élévation est discrète, la couleur a une intention.
- Accessibilité **bloquante** dans Storybook (contraste, noms accessibles, clavier).

## Où trouver quoi
| Sujet | Emplacement |
|---|---|
| Doc DS complète (audit, fondations, catalogue, specs) | `design-system/*.md` |
| Règles d'écriture des stories | `design-system/CONTRIBUTING.md` |
| Tokens (source) | `tokens/` |
| Storybook | `npm run storybook` |
| Patterns UX/UI réutilisables | `.claude/patterns/` |
| Références de marque (principes only, PAS la marque Streamnco) | `docs/references/{apple,elevenlabs}/DESIGN.md` |

> Les analyses `docs/references/*` (Apple, ElevenLabs) servent de **principes** d'inspiration,
> jamais de rebrand : Streamnco garde son identité.
