# Streamnco

Streamnco aide les streamers à **analyser** leur chaîne, **préparer** leurs lives,
**recycler** les VODs en clips, **publier** sur YouTube et **mesurer** ce qui marche.

> Application : React + Vite. Backend : Supabase managé (Lovable Cloud) + Edge Functions Deno.
> Worker vidéo : Fly.io (FFmpeg) — `workers/clip-generator/`.

---

## Table des matières
[Tech Stack](#tech-stack) · [Installation](#installation) · [Scripts](#scripts) ·
[Structure](#structure) · [Architecture fonctionnelle](#architecture-fonctionnelle) ·
[Flows critiques](#flows-critiques) · [Design System](#design-system) · [Storybook](#storybook) ·
[Testing](#testing) · [Conventions](#conventions) · [Secrets & environnement](#secrets--environnement) ·
[Worker vidéo](#worker-vidéo-clip-generator) · [Deployment](#deployment) · [Contribution](#contribution) ·
[Docs & audits](#docs--audits)

---

## Tech Stack
- **Frontend** : React 18, Vite 5, TypeScript, Tailwind, shadcn/ui (Radix), React Router, TanStack Query
- **Backend** : Supabase (Postgres + RLS, Storage, Edge Functions Deno)
- **AI** : Lovable AI Gateway (`LOVABLE_API_KEY`)
- **Vidéo** : Worker Fly.io (FFmpeg) — `workers/clip-generator/`
- **Intégrations** : Twitch API, YouTube Data API v3, TikTok, Stripe
- **Design System** : tokens DTCG + Style Dictionary, Storybook, Chromatic
- **Gestionnaire de paquets** : **npm** (`package-lock.json` fait foi)

---

## Installation
```bash
npm install            # dépendances
cp .env.example .env    # variables Vite publiques (voir « Secrets »)
npm run dev            # http://localhost:5173
```
Node 20+ recommandé. Le `.env` n'est **pas** suivi par git (voir `.gitignore`).

---

## Scripts
```bash
npm run dev              # dev server Vite
npm run build            # build de production
npm run preview          # prévisualise le build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # vitest : unitaires + Storybook (navigateur) + a11y
npm run storybook        # Storybook en dev (port 6006)
npm run build-storybook  # build statique de Storybook
npm run tokens:build     # (re)génère les tokens depuis tokens/ (Style Dictionary)
npm run lint:tokens      # garde-fou : refuse hex/arbitraire/primitive dans le cœur DS
```

---

## Structure
```
src/
├── components/       # UI. `ui/` = primitives shadcn ; sous-dossiers = features (auth, clips, live…)
├── pages/            # routes
├── hooks/            # hooks React
├── services/         # logique métier / accès données (par domaine)
├── contexts/         # providers React (Auth, modales…)
├── integrations/     # clients externes (Supabase, Lovable…)
├── lib/              # utilitaires
├── data/ · types/ · assets/ · test/
├── index.css         # importe les tokens générés
└── tokens.generated.css        # GÉNÉRÉ — ne pas éditer
tokens/               # SOURCE des design tokens (DTCG) : primitives / semantic / components
design-system/        # doc DS + Storybook stories + outils (lint-tokens, inventory…)
docs/                 # audits/ · integrations/ · references/ (analyses de marque)
workers/clip-generator/  # worker FFmpeg (Fly.io)
supabase/             # edge functions + migrations
.claude/              # skills Claude Code + patterns (voir .claude/README.md)
.github/workflows/    # CI + Chromatic
```

---

## Architecture fonctionnelle
Six sections principales (cf. `src/components/AppSidebar.tsx`) :

| Section | Route racine | Rôle |
|---|---|---|
| Tableau de bord | `/dashboard` | Score, actions prioritaires, état de sync |
| Analyse | `/analyse` | StreamScore, signaux, recommandations |
| Live Studio | `/live-setup` | Setup, titres, planning, historique, simulateur |
| Content Studio | `/content-queue` | Queue, clips, playbooks, analytics post-publi |
| Benchmark | `/competitors` | Concurrents, classements, watchlist |
| Réseaux | `/reseaux` | Connexions Twitch / YouTube / TikTok |

Tabs internes : `src/components/SectionTabs.tsx`.

---

## Flows critiques
1. **Connexion YouTube** — `youtube-auth-start` → OAuth → `youtube-auth-callback` → token chiffré dans `creator_connected_accounts`.
2. **Live Setup** — `src/pages/LiveSetupPage.tsx` génère les métadonnées (Twitch/YouTube/Kick/social).
3. **Content Queue** — `creator_content_items` + `creator_video_generation_jobs`.
4. **Génération clip** — `clip-job-create` → worker Fly (`/jobs`) → callback `clip-job-callback`.
5. **Upload YouTube** — `youtube-upload-video` (multipart resumable).
6. **Analytics post-publi** — `youtube-fetch-public-stats` → `creator_content_items.post_publish_metrics`.

---

## Design System
Deux systèmes distincts (voir [`DESIGN.md`](DESIGN.md)) : l'**app** (sombre + lime, shadcn) et le
**site marketing** (éditorial, palette `el-*`).

- **Tokens** : source DTCG dans `tokens/{primitives,semantic,components}` → `npm run tokens:build`
  (Style Dictionary) → `src/tokens.generated.css`. Un composant consomme un token **sémantique**,
  jamais une primitive en dur. Garde-fou : `npm run lint:tokens`.
- **Autorité** : `design-system/*.md` (audit, fondations, composants, catalogue, specs).
- **Patterns UX/UI** réutilisables : `.claude/patterns/`.

---

## Storybook
```bash
npm run storybook          # dev, port 6006
npm run build-storybook    # build statique
```
- Stories dans `design-system/stories/`. Autodocs actif (page Overview + table des props par composant).
- Discipline : **nom de story = rendu**, prop d'identité verrouillée (`control:false`), un seul
  `Playground` libre. Détail : `design-system/CONTRIBUTING.md`.
- Le **Catalogue** (`design-system/stories/catalog/`) documente les composants feature (navigable,
  hors test/snapshot).

---

## Testing
- `npm run test` → **vitest**, deux projets : `unit` (jsdom) et `storybook` (navigateur headless via
  Playwright/Chromium) — smoke-test + **play functions** (interactions) + **a11y bloquante**
  (addon-a11y en mode `error`).
- **Régression visuelle** : Chromatic (`.github/workflows/chromatic.yml`).
- **CI** (`.github/workflows/ci.yml`) : typecheck · lint:tokens · fraîcheur des tokens · tests ·
  build Storybook · build prod. eslint en report (dette legacy non bloquante).

---

## Conventions
- Un composant consomme les tokens **sémantiques** / composants du DS, pas de valeur en dur.
- `ui/` = primitives génériques ; les features vont dans un sous-dossier de `src/components/`.
- Pas de `any` de confort ; API publiques préservées sauf nécessité.
- Stories synchronisées avec tout composant créé/modifié (voir `design-system/CONTRIBUTING.md`).

---

## Secrets & environnement
**Règle d'or : ne jamais commiter `.env`.** (`git ls-files .env` doit être vide.)

- `.env` ne contient que des valeurs **publiables** (préfixe `VITE_`, bundlées côté client) et est
  listé dans `.gitignore`. `.env.example` documente les variables attendues sans valeur réelle.
- Les secrets backend (service role, OAuth secrets, encryption keys, Stripe, Twitch, YouTube, TikTok)
  vivent dans **Lovable Cloud Secrets**, exposés uniquement aux edge functions au runtime.
- `WORKER_BASE_URL` / `WORKER_SHARED_SECRET` : côté Lovable Cloud Secrets **et** côté Fly secrets.
- **Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté frontend.**
- Fuite d'un secret → **rotation immédiate** via le provider, puis mise à jour des secrets.

---

## Worker vidéo (clip-generator)
Dossier : `workers/clip-generator/`
- `GET /health` · `POST /jobs` — payload `{ source_url, output_upload_url, cuts, callback_url }`.
- Flow : `clip-job-create` (URLs signées) → worker (FFmpeg) → `PUT` du clip → `POST` `clip-job-callback`.
- Auth : header `Authorization: Bearer $WORKER_SHARED_SECRET`.
```bash
cd workers/clip-generator && fly deploy && fly logs
```

---

## Deployment
- **App** : build Vite (`npm run build`) → hébergement Lovable Cloud (Supabase managé).
- **Edge functions** : `supabase/functions/` (Deno) via Lovable Cloud.
- **Worker** : Fly.io (`fly deploy` dans `workers/clip-generator/`).
- **CI/CD** : GitHub Actions (`ci.yml`, `chromatic.yml`) sur push / PR.

---

## Contribution
- Design System / stories : `design-system/CONTRIBUTING.md`.
- Workflows Claude Code (product-discovery, design-to-code, code-to-design, design-system-review,
  ui-qa) : `.claude/README.md`.
- Faits durables du projet : `CLAUDE.md`.

---

## Docs & audits
- Modèle de données : [`docs/audits/data-model-audit.md`](docs/audits/data-model-audit.md)
  (tables canoniques `creator_*` vs legacy).
- Intégrations : [`docs/integrations/meta-instagram-app-review.md`](docs/integrations/meta-instagram-app-review.md).
- Références de marque (principes d'inspiration, **pas** la marque Streamnco) : `docs/references/`.
