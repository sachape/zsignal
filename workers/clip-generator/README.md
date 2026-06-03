# Streamnco — Clip Generator Worker

Worker FFmpeg externe pour la pipeline V3D. Reçoit un `job_id` depuis l'edge function `clip-job-create`, télécharge la source vidéo, découpe le segment et appelle `clip-job-callback` avec le résultat.

## Variables d'environnement (côté worker)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL du projet (ex: `https://poblhczgdbnfunroshul.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (jamais exposée au frontend) |
| `WORKER_SHARED_SECRET` | Secret partagé pour authentifier les requêtes edge ↔ worker |
| `PORT` | Port d'écoute (par défaut `8080`) |

## Variables d'environnement (côté Supabase Edge Functions)

À configurer dans Lovable Cloud → Secrets :

| Variable | Description |
|---|---|
| `WORKER_BASE_URL` | URL HTTPS publique du worker (ex: `https://clip-gen.fly.dev`) |
| `WORKER_SHARED_SECRET` | **Même valeur** que côté worker |

## Build & déploiement

### Cloud Run
```bash
cd workers/clip-generator
gcloud run deploy clip-generator \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=...,WORKER_SHARED_SECRET=...,SUPABASE_SERVICE_ROLE_KEY=...
```

### Fly.io
```bash
cd workers/clip-generator
fly launch --no-deploy
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... WORKER_SHARED_SECRET=...
fly deploy
```

### Test local
```bash
docker build -t clip-gen .
docker run --rm -p 8080:8080 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e WORKER_SHARED_SECRET=test \
  clip-gen

curl http://localhost:8080/health
```

## Endpoints

- `GET /health` — Healthcheck
- `POST /generate` — Lance un job. Headers : `X-Worker-Secret`. Body : `{ job_id, callback_url, callback_secret }`. Renvoie immédiatement `202`, traitement en arrière-plan.

## Limites MVP

- Découpe simple `start → end`, encodage H.264 / AAC, max 1080p
- Format conteneur : MP4
- Pas de sous-titres, pas de crop vertical intelligent, pas de face tracking
- Durée clip 5–180 s (validée côté edge function)
- Source max 500 Mo (validée côté edge function `clip-source-upload-url`)
