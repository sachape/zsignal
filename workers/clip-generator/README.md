# Streamnco — Clip Generator Worker

Worker Fly/FFmpeg externe pour le Clip Draft Generator. Il reçoit un job depuis `clip-job-create`, télécharge la source, compose un MP4 vertical 9:16, ajoute si demandé les sous-titres burn-in, upload le résultat via URL signée puis appelle `clip-job-callback`.

## Version actuelle

- `WORKER_VERSION`: `3.6`
- App Fly: `streamnco`
- Healthcheck prod: `https://streamnco.fly.dev/health`

## Capacités supportées

- Sources: `upload`, `storage_url`, `direct_url`, `twitch_vod`, `twitch_clip`, `youtube_vod`.
- `source_kind`: `direct`, `twitch_vod`, `twitch_clip`, `youtube_vod`.
- Format vertical: `output_format: "vertical_9_16"` en `1080x1920` par défaut.
- Layouts: `facecam_top_gameplay_bottom` et `gameplay_only`.
- Détection facecam automatique via OpenCV (`auto_detect_facecam: true`, `layout_source: "auto_detect"`).
- Fallback propre en gameplay-only si aucune facecam fiable n'est détectée.
- Sous-titres automatiques burn-in via proxy `clip-transcribe-audio`.
- Styles de sous-titres: `clean`, `bold_tiktok`, `gaming_neon`, `minimal`.
- Génération `.ass` via `buildAssFile` avant le second pass FFmpeg.

## Health check attendu

```bash
curl -s https://streamnco.fly.dev/health | jq
```

Réponse attendue :

```json
{
  "ok": true,
  "worker_version": "3.6",
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

## Payload `/generate`

```json
{
  "job_id": "uuid",
  "source_url": "https://...",
  "source_kind": "twitch_clip",
  "output_upload_url": "https://...",
  "output_storage_path": "user/content/job.mp4",
  "start_time_seconds": 0,
  "end_time_seconds": 60,
  "callback_url": "https://.../functions/v1/clip-job-callback",
  "callback_secret": "shared-secret",
  "output_format": "vertical_9_16",
  "layout_type": "facecam_top_gameplay_bottom",
  "output_width": 1080,
  "output_height": 1920,
  "facecam_crop": null,
  "gameplay_crop": null,
  "manual_preset": null,
  "auto_detect_facecam": true,
  "layout_source": "auto_detect",
  "captions_enabled": true,
  "captions_language": "fr",
  "captions_style": "clean",
  "transcribe_url": "https://.../functions/v1/clip-transcribe-audio",
  "transcribe_secret": "shared-secret"
}
```

## Logs importants

- `[job_started]` — payload normalisé, version worker, layout, captions.
- `[facecam_detection]` — `strategy: "auto_detect" | "manual_preset" | "gameplay_only_default"`.
- `[captions_started]` — début pipeline sous-titres.
- `[captions_style_selected]` — preset réellement utilisé.
- `[captions_transcription]` — retour transcription et nombre de mots.
- `[captions_generated]` — fichier ASS généré.
- `[captions_burned]` — sous-titres incrustés dans le MP4 final.
- `[captions_skipped]` / `[captions_failed]` — fallback sans sous-titres, sans échec du job.
- `[upload_completed]` — upload final terminé.

## Variables d'environnement

### Côté worker Fly

| Variable | Description |
|---|---|
| `WORKER_SHARED_SECRET` | Secret partagé pour authentifier backend ↔ worker |
| `PORT` | Port d'écoute, par défaut `8080` |

Le worker n'a pas besoin de clé backend : il écrit uniquement via l'URL d'upload signée reçue dans le payload.

### Côté backend

| Variable | Description |
|---|---|
| `WORKER_BASE_URL` | URL HTTPS publique du worker, ex. `https://streamnco.fly.dev` |
| `WORKER_SHARED_SECRET` | Même valeur que côté worker |
| `ELEVENLABS_API_KEY` | Utilisée uniquement par `clip-transcribe-audio` pour ElevenLabs Scribe |

## Build & déploiement Fly

```bash
cd workers/clip-generator
fly deploy -a streamnco
```

Si OpenCV n'apparaît pas dans `/health` après déploiement :

```bash
fly deploy -a streamnco --no-cache
```

## Test local

```bash
docker build -t streamnco-clip-generator .
docker run --rm -p 8080:8080 \
  -e WORKER_SHARED_SECRET=test \
  streamnco-clip-generator

curl http://localhost:8080/health
```

## Endpoints

- `GET /health` — healthcheck synchrone, sans fork, sûr pendant un rendu FFmpeg.
- `POST /generate` — lance un job. Header requis : `X-Worker-Secret`. Répond `202`, traitement en arrière-plan.

## Limites connues

- Une machine Fly V1, jobs sérialisés côté produit.
- Durée clip validée côté backend : 5 à 240 secondes.
- Source upload max : 500 Mo.
- Les sous-titres sont un fallback non bloquant : si la transcription échoue, le clip sort sans sous-titres.
