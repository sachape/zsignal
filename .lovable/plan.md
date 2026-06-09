# Studio Visuel — V1 end-to-end

## Vision

Un module premium "Studio visuel" intégré à Streamnco qui permet au streamer de générer rapidement des assets visuels (bannière Twitch, annonce live, post IG, story, highlight, etc.), de les sauvegarder dans une bibliothèque, et de les réutiliser. Architecture pensée pour s'étendre (packs cohérents, déclinaisons multi-formats, brand kit).

## Architecture retenue

```text
[Frontend React]
   │
   ├── /studio-visuel            → galerie + bouton "Créer"
   ├── /studio-visuel/nouveau    → choix template → form prérempli → preview
   └── /studio-visuel/historique → bibliothèque + favoris + uploads
        │
        ▼
[Edge Functions Supabase]
   ├── visual-job-create      → crée job, valide quota, enqueue
   ├── visual-job-status      → poll status
   ├── visual-asset-upload-url → URL signée pour upload (logo, ref)
   └── visual-job-process     → worker async (génère via Lovable AI Gateway,
                                 modèle google/gemini-2.5-flash-image-preview,
                                 upload résultat → storage, update job)
        │
        ▼
[Storage]
   ├── creator-visual-uploads   (privé) — refs utilisateur
   └── creator-visual-assets    (privé) — rendus générés (URL signée)

[DB]
   ├── visual_templates           (catalogue templates, seedé)
   ├── creator_brand_kit          (1 par user — pseudo, handle, couleurs, logo)
   ├── visual_generation_jobs     (job + params + status + variantes)
   ├── generated_visuals          (1 ligne par variante générée)
   └── visual_uploaded_assets     (refs uploadées par user)
```

### Flux génération
1. User pick un template → form prérempli depuis `creator_brand_kit` + dernier live Twitch (déjà dispo via `creator_live_sessions` / `twitch_profiles`).
2. Submit → `visual-job-create` insère job `status=queued`, retourne `job_id`, et fire-and-forget vers `visual-job-process`.
3. `visual-job-process` (async, EdgeRuntime.waitUntil) :
   - construit un prompt typé par template (dimensions, style, contenu)
   - boucle 3 appels image au gateway Lovable AI (`gemini-2.5-flash-image-preview`)
   - upload chaque image dans `creator-visual-assets`
   - insère 3 lignes dans `generated_visuals`, passe job en `succeeded`
4. Front polle `visual-job-status` toutes les 2s → quand `succeeded`, charge variantes via signed URLs.

### Réutilisation / bibliothèque
- `generated_visuals` filtré par user → galerie historique
- favoris via `is_favorite` boolean
- regénérer = re-créer un job avec mêmes params
- télécharger = signed URL force-download

## Scope V1 livré

### Templates (seed)
- `twitch_banner` (1920x480)
- `twitch_offline` (1920x1080)
- `live_announcement` (1080x1080)
- `instagram_post` (1080x1080)
- `instagram_story` (1080x1920)
- `new_clip` (1080x1080)
- `highlight` (1080x1350)
- `cover_simple` (1500x500)

Chacun avec : label FR, description usage, dimensions, prompt template, icône.

### UI
- Sidebar : nouvelle entrée **Studio visuel** (Palette icon) sous "Clips réseaux".
- Page `/studio-visuel` : grid des derniers visuels + CTA "Créer un visuel".
- Dialog "Nouveau visuel" : step 1 catégorie/template, step 2 form (titre, sous-titre, jeu, palette, style, upload ref optionnel), step 3 preview/loading/résultats 3 variantes avec actions (télécharger, favori, régénérer, supprimer).
- État vide propre, loading skeleton, erreurs FR.

### Backend
- 4 migrations : `creator_brand_kit`, `visual_templates` + seed, `visual_generation_jobs`, `generated_visuals`, `visual_uploaded_assets`. RLS + GRANT.
- 2 storage buckets privés.
- 4 edge functions : create / status / upload-url / process.
- Service frontend `src/services/visualGenerator.ts` + hook `useVisualJobs`.

### Extensibilité (préparée mais pas livrée V1)
- `creator_brand_kit` permettra packs cohérents.
- `visual_generation_jobs.source_ref` (jsonb) permettra liaison à un clip/live/event.
- Templates table-driven → ajout sans déploiement.

## Limites V1
- Pas d'éditeur post-génération (crop/text overlay) — V2.
- Pas de déclinaisons auto multi-formats à partir d'une seule génération — V2.
- Brand kit minimal (couleurs + logo + pseudo), pas de polices custom — V2.
- Quota : 10 jobs / user / jour (anti-abus), affiché dans l'UI.

## Détails techniques

- Image gen : `google/gemini-2.5-flash-image-preview` via `https://ai.gateway.lovable.dev/v1/chat/completions` avec `modalities:["image","text"]`. Réponse en base64 → upload Storage.
- Polling front via React Query `refetchInterval` dynamique (2s tant que `queued|processing`).
- Pas de worker Fly — tout dans edge function avec `EdgeRuntime.waitUntil` (gen image ≈ 5-15s × 3 = OK dans budget edge).
- Wording 100% FR, design tokens existants (gradient primary/teal, glass cards).

## À confirmer avant de coder
Si OK je lance : migrations → edge functions → frontend → seed templates → test bout en bout.
