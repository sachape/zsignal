# V3D — Guide de déploiement du worker FFmpeg (Lovable Cloud)

Le worker est **stateless** : il ne connaît rien du backend Lovable Cloud. L'Edge Function lui envoie une URL signée pour lire la source et une URL signée pour uploader le clip. Le worker n'a donc besoin que d'**un seul secret**.

Tant que `WORKER_BASE_URL` n'est pas configuré côté Lovable, l'app reste cohérente : le bouton « Générer » renvoie `worker_not_configured`, le content item passe en `generation_status=unavailable`, **aucun faux clip n'est créé**.

## Worker v3.2 — vertical, facecam auto et sous-titres stylés

À partir de la v3.2, le worker génère le format vertical 9:16 avec facecam en haut, gameplay en bas, détection facecam automatique OpenCV et sous-titres burn-in personnalisables.

- La transcription tourne côté Lovable Cloud (edge function `clip-transcribe-audio` → ElevenLabs Scribe).
- Le worker n'a **pas** besoin de `ELEVENLABS_API_KEY` (le secret reste côté Supabase).
- Les styles supportés sont `clean`, `bold_tiktok`, `gaming_neon`, `minimal` via `captions_style`.
- Si la transcription échoue ou que la vidéo ne contient pas de parole, le clip est publié **sans** sous-titres : `[captions_skipped]` ou `[captions_failed]`, jamais d'échec du job.

Redéploie après `git pull` :

```bash
cd workers/clip-generator
fly deploy -a streamnco
# Vérifier worker_version: 3.10 et les capabilities dans /health
curl -s https://streamnco.fly.dev/health | jq '{worker_version, supports_vertical_9_16, supports_facecam_autodetect, supports_auto_captions}'
```


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
fly launch --no-deploy --name streamnco --region cdg --copy-config
fly secrets set -a streamnco WORKER_SHARED_SECRET="<colle le secret généré>"

# À chaque mise à jour du Dockerfile / index.mjs / fly.toml :
fly deploy -a streamnco
```

### Profil V1 : 1 machine always-on (config dans `fly.toml`)

Le `fly.toml` du repo impose :
- `auto_stop_machines = "off"` → Fly n'arrête plus la machine après idle.
- `min_machines_running = 1` → toujours au moins 1 machine vivante.
- `[deploy] strategy = "immediate"` → pas de rolling deploy (qui crée une 2ᵉ machine temporaire).

#### Pourquoi tu vois actuellement 2 machines

Fly crée une seconde machine quand :
1. Tu as fait un `fly deploy` avec la stratégie par défaut (`rolling`) → une machine de relève est créée puis l'ancienne est gardée.
2. Ou tu avais lancé `fly scale count 2` à un moment.
3. Ou la première machine a été marquée "suspended" sans être détruite et une nouvelle a été provisionnée au déploiement suivant.

Les deux sont **Stopped/Suspended** parce que l'ancien `fly.toml` autorisait l'autostop (`auto_stop_machines = "suspend"` par défaut sur Fly v2).

#### Nettoyage à exécuter une fois (manuel, depuis ta machine)

```bash
# 1) Lister les machines pour identifier les IDs
fly machine list -a streamnco

# 2) Forcer le scale à 1 machine
fly scale count 1 -a streamnco

# 3) Si une machine "suspended" subsiste, la détruire explicitement
fly machine destroy <machine_id> -a streamnco --force

# 4) Redéployer avec le nouveau fly.toml (auto_stop_machines = "off")
fly deploy -a streamnco

# 5) Vérifier l'état final
fly status -a streamnco
# attendu : 1 machine, state = started
```

Garde la machine la plus récente (celle avec la dernière `image_ref` / `updated`).
Détruis l'autre.



> ⚠️ **Le worker tourne sur Fly.io, pas sur Lovable Cloud.** Toute modification de `workers/clip-generator/` nécessite un `fly deploy` manuel depuis ta machine. Lovable ne peut pas redéployer Fly à ta place.

Vérifie le healthcheck **après redéploiement v3.10** :
```bash
curl https://streamnco.fly.dev/health
```

Réponse attendue :
```json
{
  "ok": true,
  "worker_version": "3.10",
  "ffmpeg_available": true,
  "yt_dlp_available": true,
  "python_available": true,
  "opencv_available": true,
  "supports_vertical_9_16": true,
  "supports_facecam_autodetect": true,
  "supports_auto_captions": true,
  "supported_layouts": ["facecam_top_gameplay_bottom", "gameplay_only"]
}
```

Si `opencv_available: false` → l'image Docker n'a pas été rebuild, relance `fly deploy -a streamnco --no-cache`.


---

## 3. Connecter Streamnco au worker

Dans Lovable, demande :

> « Ajoute les secrets `WORKER_BASE_URL` et `WORKER_SHARED_SECRET` »

- **WORKER_BASE_URL** : `https://streamnco.fly.dev` (sans slash final)
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
   - canonicalise les liens Twitch (`twitch_vod` / `twitch_clip`)
   - force le rendu `vertical_9_16` avec `layout_type=facecam_top_gameplay_bottom`
   - envoie `auto_detect_facecam=true`, `layout_source=auto_detect`, `captions_enabled`, `captions_style`, `transcribe_url`
   - appelle `POST <WORKER_BASE_URL>/generate` avec le payload complet
3. Worker Fly :
   - vérifie `X-Worker-Secret`
   - télécharge la source via `source_url` (`yt-dlp` pour Twitch/YouTube)
   - détecte la facecam via OpenCV quand aucun preset manuel explicite n'est fourni
   - compose facecam haut / gameplay bas en 9:16 via FFmpeg
   - extrait l'audio, appelle `clip-transcribe-audio`, génère le `.ass` via `buildAssFile`, puis burn-in les sous-titres si activés
   - PUT le clip vers `output_upload_url`
   - POST `clip-job-callback` avec `status=completed` + `output_storage_path`
4. `clip-job-callback` :
   - vérifie `X-Worker-Secret`
   - signe une URL de lecture 7j pour preview
   - met à jour `creator_video_generation_jobs` + `creator_content_items.generated_video_url`

Aucun fichier ni URL fake : si le worker échoue, l'item revient en `to_generate` avec `generation_status=failed`.

---

## 6. Sécurité

- Le worker n'a aucun accès direct au backend — impossible pour lui d'écrire ailleurs que dans la signed URL fournie.
- `WORKER_SHARED_SECRET` protège les deux sens : edge → worker (`X-Worker-Secret`) et worker → edge (`X-Worker-Secret` côté callback).
- Buckets `creator-source-videos` et `creator-generated-clips` privés. URLs signées (1h lecture source, 7j lecture preview).
- Le worker supprime ses fichiers temporaires après chaque job.

---

## 7. Limites actuelles

- Encodage H.264/AAC, MP4 vertical 1080x1920 par défaut
- Durée clip : 5 à 240 s côté génération
- Source max 500 Mo
- Sous-titres auto non bloquants : fallback sans sous-titres si ElevenLabs ou FFmpeg ASS échoue
- Facecam auto non bloquante : fallback gameplay-only si OpenCV ne détecte rien de fiable
- Pas encore de best-of auto dans le worker
