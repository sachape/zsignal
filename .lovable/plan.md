# Format Réseaux — Clip vertical 1080x1920

Feature lourde, je cadre avant d'écrire du code. Validation attendue avant implémentation.

## 1. Cadrage technique

**Output cible** : MP4 1080x1920, H.264 + AAC.
**Layout V1 unique** : `facecam_top_gameplay_bottom`
- Zone caméra : 1080x480 (haut, 25%)
- Zone gameplay : 1080x1440 (bas, 75%)

**Sources d'entrée** (pipeline unifié) :
1. Moment proposé Streamnco (existant)
2. URL VOD Twitch (déjà partiellement géré via `vod-import-create`)
3. Upload manuel MP4/MOV/WebM (signed upload URL → bucket `creator-source-videos`)

**Préset caméra** : 1 enregistrement par user/platform/platform_user_id. Obligatoire pour le layout vertical avec facecam, optionnel si "gameplay seul".

## 2. Data model

### Nouvelle table : `creator_video_layout_presets`
```
id uuid PK
user_id uuid (FK auth.users) NOT NULL
platform text NOT NULL ('twitch' V1)
platform_user_id text NOT NULL
layout_type text NOT NULL DEFAULT 'facecam_top_gameplay_bottom'
facecam_x int, facecam_y int, facecam_width int, facecam_height int
gameplay_x int, gameplay_y int, gameplay_width int, gameplay_height int  (nullable V1)
output_width int DEFAULT 1080
output_height int DEFAULT 1920
source_reference_width int, source_reference_height int  (résolution où les coords ont été définies — pour scaler)
created_at, updated_at
UNIQUE(user_id, platform, platform_user_id)
```
RLS : `user_id = auth.uid()`. GRANT authenticated + service_role.

### Nouvelle table : `creator_video_sources`
```
id uuid PK
user_id uuid NOT NULL
source_type text ('streamnco_detected' | 'twitch_vod_url' | 'manual_upload')
source_url text (URL externe : Twitch VOD)
storage_bucket text, storage_path text (upload manuel)
original_filename text
duration_seconds numeric
width int, height int
mime_type text
platform text, platform_video_id text
created_at, updated_at
```
RLS user_id. GRANT auth + service_role.

### `creator_content_items` (existant) — ajouter
- `video_source_id uuid` (FK → creator_video_sources, nullable)
- `output_format text` ('vertical_9_16' | 'horizontal_16_9') DEFAULT 'vertical_9_16'
- `layout_type text` ('facecam_top_gameplay_bottom' | 'gameplay_only')

### `creator_video_generation_jobs` (existant) — ajouter
- `output_width int`, `output_height int`, `layout_type text`
- `layout_preset_id uuid` (snapshot des coords utilisées)
- `video_source_id uuid`

## 3. Pipeline ffmpeg (worker `workers/clip-generator`)

Mise à jour de `workers/clip-generator/index.mjs`. Le worker reçoit le job avec : source (URL ou storage path signé), start/end, output dims, layout coords.

**Si `gameplay_only`** :
```
ffmpeg -ss <start> -to <end> -i input
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
  -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k out.mp4
```

**Si `facecam_top_gameplay_bottom`** : filter_complex à deux branches :
```
[0:v]trim=start=S:end=E,setpts=PTS-STARTPTS,split=2[a][b];
[a]crop=FW:FH:FX:FY,scale=1080:480[cam];
[b]crop=GW:GH:GX:GY,scale=1080:1440:force_original_aspect_ratio=increase,
    crop=1080:1440[game];
[cam][game]vstack=inputs=2[v]
```
Coords (FX,FY,FW,FH / GX,GY,...) scalées depuis `source_reference_width/height` vers la résolution réelle de la VOD si différente. Si gameplay coords absentes → utiliser image entière croppée.

Audio : `-map 0:a -c:a aac -b:a 128k -ar 48000`.

## 4. Edge functions

- **`video-layout-preset-upsert`** (nouveau) : POST { layout_type, facecam_*, gameplay_*, source_reference_width/height } → upsert dans table preset
- **`video-source-upload-url`** (nouveau / dérivé de `clip-source-upload-url`) : retourne signed upload URL pour `creator-source-videos`
- **`video-source-register`** (nouveau) : après upload, enregistre la ligne `creator_video_sources` + sonde dimensions/duration (best-effort)
- **`clip-job-create`** (existante — adapter) : accepte `video_source_id`, `output_format`, `layout_type`, lit preset si manquant, crée job worker
- **`clip-job-callback`** (existante — pas de changement majeur, juste passe-through des nouvelles colonnes)

## 5. Frontend

### Nouveaux composants
- `src/components/LayoutPresetModal.tsx` : modale "Configurer ma caméra" — preview frame VOD + zone draggable/resizable pour facecam (lib `react-rnd`) → save
- `src/components/ClipFormatPicker.tsx` : 3 sources (moment / URL Twitch / upload)
- `src/components/CreateClipDialog.tsx` : orchestrateur — choix source → preview → start/end → CTA générer
- `src/components/ClipGenerationStatus.tsx` : étapes UX (Préparation, Découpage, Création format vertical, Export, Prêt)
- `src/components/ContentItemSocialBadges.tsx` : badges "Format réseaux", "9:16", "Caméra + gameplay"

### Hooks
- `src/hooks/useVideoLayoutPreset.ts` : read/upsert preset utilisateur
- `src/hooks/useVideoSources.ts` : CRUD sources + upload signé
- Adapter `useVideoJobs.ts` pour nouveaux champs

### Pages modifiées
- `src/pages/ClipsPage.tsx` : ajouter CTA "Créer un clip" → ouvre `CreateClipDialog`
- `src/pages/ContentQueuePage.tsx` : badges sociaux, preview verticale, retirer labels techniques (`Clip Draft`, `vod_auto_suggestion`, `draft_ready` → "Brouillon", "Suggestion", "Prêt")
- `src/pages/SettingsPage.tsx` : entrée "Format réseaux" → ouvre `LayoutPresetModal`

### Wording
Remplacer "Meilleurs moments / IA détecte" par "Moments proposés / Suggestions de clips" dans `ClipsPage`, `LastLivePage`, copies marketing internes.

## 6. Paywall

Feature gate via `hasPlanAtLeast(plan, "pro")` (Pro+Growth). Aucune comparaison stricte.

## 7. États UX (jamais montrer ffmpeg/worker/storage)

`queued → "En attente"`, `worker_started → "Préparation du clip"`, `downloading → "Téléchargement source"`, `cutting → "Découpage"`, `compositing → "Création format vertical"` (nouveau stage), `uploading → "Export du MP4"`, `completed → "Clip prêt"`, `failed → "Échec — Réessayer"`.

Ajouter `compositing` à `VideoGenerationStage` dans `src/services/videoGeneration.ts`.

## 8. Fallbacks

- Pas de preset + layout facecam → bloque génération, CTA "Configurer ma caméra" + option "Générer en gameplay seul"
- Durée > 60s → warning non bloquant "Vise 15-60s"
- Durée > 180s → bloque (limite worker)
- Upload > 500 MB → erreur claire "Fichier trop lourd"
- MIME non supporté → "Format non supporté. Utilise MP4, MOV ou WebM"

## 9. Storage

Réutilise buckets existants :
- `creator-source-videos` (privé) → upload manuel + cache VOD téléchargée
- `creator-generated-clips` (privé) → clips finaux, signed URL via `mediaStorage.ts`

## 10. Limites V1 assumées

- Layout unique : facecam top / gameplay bottom (pas de side-by-side, pas de PiP)
- Pas d'overlays (titre, sous-titres, branding) → V1.1
- Pas de détection auto facecam (manuel only) → V2
- Gameplay zone optionnelle V1 (image complète croppée par défaut)
- Pas de sélection de frame de référence pour le preset → on prend une frame à mi-VOD via ffmpeg

## 11. Migration order

1. SQL migration (2 tables + colonnes + GRANT + RLS)
2. Edge functions (4 nouvelles + 1 modifiée)
3. Worker update (filter_complex vertical)
4. Frontend (preset modal → create dialog → content queue)
5. QA matrice 9 cas

## 12. QA matrice prévue

| Cas | Attendu |
|---|---|
| Sans preset + facecam | Bloque + CTA config |
| Sans preset + gameplay_only | Génère OK |
| Avec preset, 15s, source moment | 1080x1920 OK |
| Avec preset, 60s, URL Twitch | 1080x1920 OK |
| Upload MP4 + preset | OK |
| Upload >180s | Warning + bloque si >180s |
| Mauvais MIME | Erreur claire |
| Free user | Paywall bloque |
| Growth user | Accès OK |

---

**Estimation effort** : ~25 fichiers touchés, 2 migrations, 4 edge functions, refonte worker. C'est gros — 1 PR cohérente.

**Question avant d'attaquer** :
1. OK pour limiter V1 au seul layout `facecam_top_gameplay_bottom` (pas de side-by-side) ?
2. OK pour `react-rnd` comme dépendance pour le crop-picker du preset caméra ?
3. Le worker `workers/clip-generator` est-il actuellement déployé et opérationnel ? (Je dois savoir si je peux casser son contrat actuel ou si je dois rester rétrocompatible avec les jobs horizontaux existants.)
4. Limite dure de durée à 180s côté worker : OK ou tu veux plus (ex. 300s) ?
