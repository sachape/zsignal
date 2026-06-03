# Streamnco

Streamnco aide les streamers à **analyser** leur chaîne, **préparer** leurs lives,
**recycler** les VODs en clips, **publier** sur YouTube et **mesurer** ce qui marche.

> Application principale : React + Vite, hébergée via Lovable.
> Backend : Lovable Cloud (Supabase managé) + Edge Functions Deno.
> Worker vidéo : Fly.io (FFmpeg) — `workers/clip-generator/`.

---

## Stack

- **Frontend** : React 18, Vite 5, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query
- **Backend** : Lovable Cloud (Supabase) — Postgres + RLS, Storage, Edge Functions (Deno)
- **AI** : Lovable AI Gateway (`LOVABLE_API_KEY`)
- **Vidéo** : Worker Fly.io (FFmpeg) — voir `workers/clip-generator/`
- **Intégrations** : Twitch API, YouTube Data API v3, TikTok, Stripe

---

## Architecture fonctionnelle

Six sections principales (cf. sidebar `src/components/AppSidebar.tsx`) :

| Section          | Route racine        | Rôle |
|------------------|---------------------|------|
| Tableau de bord  | `/dashboard`        | Score, actions prioritaires, état de sync |
| Analyse          | `/analyse`          | StreamScore, signaux, recommandations |
| Live Studio      | `/live-setup`       | Setup, titres, planning, historique, simulateur |
| Content Studio   | `/content-queue`    | Queue, clips, playbooks, analytics post-publi |
| Benchmark        | `/competitors`      | Concurrents, classements, watchlist |
| Réseaux          | `/reseaux`          | Connexions Twitch / YouTube / TikTok |

Les tabs internes sont gérés via `src/components/SectionTabs.tsx`.

---

## Flows critiques

1. **Connexion YouTube** — `youtube-auth-start` → OAuth → `youtube-auth-callback` → token chiffré dans `creator_connected_accounts`.
2. **Live Setup** — `src/pages/LiveSetupPage.tsx` génère les métadonnées (Twitch/YouTube/Kick/social).
3. **Content Queue** — `creator_content_items` + `creator_video_generation_jobs`.
4. **Génération clip V3D** — `clip-job-create` → worker Fly (`/jobs`) → callback `clip-job-callback`.
5. **Upload YouTube** — `youtube-upload-video` (multipart resumable).
6. **Analytics post-publi V3.7** — `youtube-fetch-public-stats` → `creator_content_items.post_publish_metrics`.

---

## Secrets & environnement

**Règle d'or : ne jamais commiter `.env`.**

- `.env` à la racine est **auto-généré par Lovable Cloud** et ne contient que des
  valeurs publiables (Vite). Il est listé dans `.gitignore`.
- `.env.example` documente les variables attendues sans aucune valeur réelle.
- Les secrets backend (service role, OAuth secrets, encryption keys, Stripe, Twitch,
  YouTube, TikTok…) sont stockés dans **Lovable Cloud Secrets** et exposés
  uniquement aux edge functions au runtime.
- `WORKER_BASE_URL` et `WORKER_SHARED_SECRET` pour le worker FFmpeg sont stockés
  **deux fois** : côté Lovable Cloud Secrets (pour les edge functions) et côté
  **Fly secrets** (pour le worker lui-même).
- **Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté frontend.**

Si un secret a fuité (commit accidentel, capture publique) : **rotation immédiate**
via le dashboard du provider concerné, puis mise à jour via Lovable Cloud Secrets.

---

## Worker vidéo (clip-generator)

Dossier : `workers/clip-generator/`

- Endpoint santé : `GET /health`
- Endpoint job   : `POST /jobs` — payload `{ source_url, output_upload_url, cuts, callback_url }`
- Flow :
  `clip-job-create` (signed source URL + signed output upload URL)
  → worker télécharge la source, applique FFmpeg
  → worker `PUT` le clip vers `output_upload_url`
  → worker `POST` `callback_url` (`clip-job-callback`).
- Authentification : header `Authorization: Bearer $WORKER_SHARED_SECRET`.

Déploiement :

```bash
cd workers/clip-generator
fly deploy
fly logs
fly secrets set WORKER_SHARED_SECRET=...
```

---

## Commandes utiles

```bash
npm install        # installe les dépendances
npm run dev        # dev server Vite
npm run build      # build de production
npm run lint       # ESLint
npm run test       # vitest
```

> Le typecheck strict est lancé automatiquement par le harness Lovable lors
> de chaque édition. Aucune commande manuelle n'est nécessaire.

---

## QA checklist

- [ ] Routes : aucun doublon (`grep -n 'path="/' src/App.tsx | sort`)
- [ ] Auth : login / logout / refresh / RLS OK
- [ ] YouTube : OAuth → upload → fetch stats
- [ ] Clips : `clip-job-create` → worker Fly → callback
- [ ] Analytics post-publication (V3.7)
- [ ] RLS active sur toutes les tables `creator_*`
- [ ] `git ls-files .env` ne retourne **rien**
- [ ] `.env.example` présent
- [ ] Aucun secret commité (`git log -p -- .env` doit être vide)

---

## Audit data model

Voir [`docs/data-model-audit.md`](docs/data-model-audit.md) pour la liste des
tables canoniques (`creator_*`) vs legacy (`connected_accounts`, `live_sessions`).
