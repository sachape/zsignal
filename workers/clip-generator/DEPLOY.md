# V3D — Guide de déploiement du worker FFmpeg (Lovable Cloud)

Le worker est **stateless** : il ne connaît rien de Supabase / Lovable Cloud. La Edge Function lui envoie une URL signée pour lire la source et une URL signée pour uploader le clip. Le worker n'a donc besoin que d'**un seul secret**.

Tant que `WORKER_BASE_URL` n'est pas configuré côté Lovable, l'app reste cohérente : le bouton « Générer » renvoie `worker_not_configured`, le content item passe en `generation_status=unavailable`, **aucun faux clip n'est créé**.

---

## 1. Générer le secret partagé

```bash
openssl rand -hex 32
```

Garde la valeur — tu en auras besoin **deux fois** : une fois sur Fly.io, une fois dans Lovable Cloud.

---

## 2. Déploiement Fly.io (initial OU redéploiement après changement Dockerfile)

```bash
cd workers/clip-generator

# Première fois uniquement :
fly launch --no-deploy --name streamnco-clip-gen --region cdg
fly secrets set -a streamnco-clip-gen WORKER_SHARED_SECRET="<colle le secret généré>"

# À chaque mise à jour du Dockerfile / index.mjs (ex: ajout yt-dlp v1.1.0) :
fly deploy -a streamnco-clip-gen
```

> ⚠️ **Le worker tourne sur Fly.io, pas sur Lovable Cloud.** Toute modification de `workers/clip-generator/` nécessite un `fly deploy` manuel depuis ta machine. Lovable ne peut pas redéployer Fly à ta place.

Vérifie le healthcheck **après redéploiement v1.1.0** :
```bash
curl https://streamnco-clip-gen.fly.dev/health
```

Réponse attendue :
```json
{
  "ok": true,
  "worker_version": "1.1.0",
  "ffmpeg_available": true,
  "ffmpeg_version": "ffmpeg version 5.x ...",
  "yt_dlp_available": true,
  "yt_dlp_version": "2024.xx.xx"
}
```

Si `yt_dlp_available: false` ou `ok: false` → le redéploiement n'a pas pris, refais `fly deploy -a streamnco-clip-gen`.


---

## 3. Connecter Streamnco au worker

Dans Lovable, demande :

> « Ajoute les secrets `WORKER_BASE_URL` et `WORKER_SHARED_SECRET` »

- **WORKER_BASE_URL** : `https://streamnco-clip-gen.fly.dev` (sans slash final)
- **WORKER_SHARED_SECRET** : **exactement la même valeur** qu'à l'étape 1

---

## 4. Variables d'environnement — récap

### Côté worker (Fly.io)
| Variable | Obligatoire | Valeur |
|---|---|---|
| `WORKER_SHARED_SECRET` | ✅ | Secret généré via `openssl rand -hex 32` |
| `PORT` | optionnel | défaut `8080` |

Le worker n'a **plus besoin** de `SUPABASE_URL` ni de `SUPABASE_SERVICE_ROLE_KEY`.

### Côté Lovable Cloud (Edge Functions)
| Variable | Source |
|---|---|
| `WORKER_BASE_URL` | URL Fly publique |
| `WORKER_SHARED_SECRET` | Même valeur qu'au-dessus |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` sont fournis automatiquement aux edge functions par Lovable Cloud.

---

## 5. Flow technique

1. Frontend appelle `clip-job-create` (JWT user).
2. `clip-job-create` :
   - crée le job (`status=queued`)
   - signe une URL de lecture (1h) sur `creator-source-videos`
   - signe une URL d'upload (PUT) sur `creator-generated-clips`
   - appelle `POST <WORKER_BASE_URL>/generate` avec source_url + output_upload_url + timestamps + callback_url + secret
3. Worker Fly :
   - vérifie `X-Worker-Secret`
   - télécharge la source via `source_url`
   - exécute FFmpeg
   - PUT le clip vers `output_upload_url`
   - POST `clip-job-callback` avec `status=completed` + `output_storage_path`
4. `clip-job-callback` :
   - vérifie `X-Worker-Secret`
   - signe une URL de lecture 7j pour preview
   - met à jour `creator_video_generation_jobs` + `creator_content_items.generated_video_url`

Aucun fichier ni URL fake : si le worker échoue, l'item revient en `to_generate` avec `generation_status=failed`.

---

## 6. Sécurité

- Le worker n'a aucun accès Supabase — impossible pour lui d'écrire ailleurs que dans la signed URL fournie.
- `WORKER_SHARED_SECRET` protège les deux sens : edge → worker (`X-Worker-Secret`) et worker → edge (`X-Worker-Secret` côté callback).
- Buckets `creator-source-videos` et `creator-generated-clips` privés. URLs signées (1h lecture source, 7j lecture preview).
- Le worker supprime ses fichiers temporaires après chaque job.

---

## 7. Limites V3D MVP

- Découpe simple `start → end`, encodage H.264/AAC, MP4 max 1080p
- Durée clip : 5 à 180 s
- Source max 500 Mo
- Pas de sous-titres auto, pas de crop vertical, pas de face tracking, pas de best-of auto
- VOD Twitch/YouTube non téléchargeables directement (upload reste fiable)
- Publication YouTube uniquement
