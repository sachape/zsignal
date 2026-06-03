# Data model audit — Streamnco

> Snapshot post-audit Codex. **Aucune table n'est supprimée par ce document.**
> Objectif : clarifier le canonique vs le legacy avant rationalisation future.

## Tables canoniques (à conserver et utiliser pour tout nouveau code)

| Table                            | Rôle                                                                 |
|----------------------------------|----------------------------------------------------------------------|
| `creator_connected_accounts`     | Connexions multi-plateformes (YouTube, TikTok, futures plateformes). |
| `creator_live_sessions`          | Live Setup et sessions multi-plateformes.                            |
| `creator_content_items`          | Content Queue, publications, analytics post-publi (V3.7).            |
| `creator_video_generation_jobs`  | Jobs de génération vidéo (worker Fly FFmpeg, V3D).                   |
| `creator_platform_metrics`       | Métriques agrégées par plateforme.                                   |
| `creator_presence_scores`        | Score de présence multi-plateformes.                                 |
| `creator_alerts`                 | Alertes utilisateur côté creator pipeline.                           |

## Tables legacy (encore utilisées mais à rationaliser)

| Table                  | Pourquoi legacy                                                  | Encore utilisée par |
|------------------------|------------------------------------------------------------------|---------------------|
| `connected_accounts`   | Twitch-only. Antérieur au refactor multi-plateformes.            | OAuth Twitch, EventSub, analysis pipeline, weekly actions, hooks `useTwitchConnection`. |
| `live_sessions`        | Détection live Twitch et debriefs. Antérieur à `creator_live_sessions`. | `live-detect`, `twitch-eventsub-processor`, `weekly-actions-*`, `live_debriefs`. |
| `twitch_*` (profiles, videos, clips, snapshots, …) | Spécifiques Twitch — restent canoniques **pour la couche Twitch native**. | Pipeline analyse Twitch. |

## Tables hors scope de cet audit

`stream_scores`, `stream_score_snapshots`, `analysis_*`, `weekly_*`, `subscriptions`,
`billing_*`, `email_*` — non concernées par la dualité connected/creator.

## Fichiers impactés (extrait)

### `connected_accounts` (legacy)
- `src/hooks/useTwitchConnection.ts`
- `src/services/twitchOAuth.ts`, `autoRefreshRunner.ts`, `eventSubInsights.ts`, `shortContentPlanner.ts`
- `src/services/weeklyActions/signals.ts`
- `src/pages/TwitchCallbackPage.tsx`
- Edge functions : `twitch-oauth`, `twitch-refresh-enqueue`, `twitch-eventsub-*`, `twitch-clips-ingest`, `twitch-update-channel`, `twitch-live-fetch`, `live-detect`, `weekly-actions-*`, `migrate-token-encryption`, `_shared/tokenCrypto.ts`, `_shared/twitchFactsFetch.ts`, `_shared/enqueueAnalysisJob.ts`

### `creator_connected_accounts` (canonique)
- `src/hooks/useConnectedNetworks.ts`
- Edge functions : `youtube-auth-callback`, `youtube-sync-channel`, `youtube-create-live-broadcast`, `youtube-upload-video`, `youtube-fetch-public-stats`, `tiktok-auth-callback`, `tiktok-sync-profile`

### `live_sessions` (legacy)
- `src/services/liveSessions.ts`, `services/weeklyActions/{signals,catalog}.ts`
- `src/pages/TwitchAccountsPage.tsx`
- Edge functions : `live-detect`, `twitch-eventsub-processor`, `twitch-clips-ingest`, `weekly-actions-*`, `_shared/debrief.ts`

### `creator_live_sessions` (canonique)
- `src/hooks/useLiveSessions.ts`
- Edge functions : `youtube-create-live-broadcast`, `twitch-update-channel`

## Risques

1. **Confusion développeur** — deux hooks (`useTwitchConnection` vs `useConnectedNetworks`),
   deux services (`liveSessions.ts` vs `useLiveSessions.ts`). Risque : nouveau code branché
   sur la mauvaise source de vérité.
2. **Données dupliquées** — un même live peut exister dans `live_sessions` (détecté via
   EventSub Twitch) ET dans `creator_live_sessions` (créé via Live Setup).
3. **Sync token** — la couche Twitch chiffre dans `connected_accounts.access_token_enc`,
   la couche creator dans `creator_connected_accounts.access_token_enc`. Deux chemins
   de rotation à maintenir.

## Plan progressif de rationalisation (recommandé, **pas exécuté**)

1. **Phase 1 — Documentation** *(ce document)*. Geler tout nouveau usage de `connected_accounts`
   et `live_sessions` côté pages produit (Live Studio, Content Studio, Réseaux).
2. **Phase 2 — Pont** : ajouter une vue SQL `v_unified_connected_accounts` qui union les deux
   tables, exposée en lecture seule au frontend. Migrer `useTwitchConnection` pour qu'il
   lise via `creator_connected_accounts` quand un compte Twitch y existe déjà.
3. **Phase 3 — Migration Twitch** : créer une row `creator_connected_accounts (platform='twitch')`
   à chaque OAuth Twitch ; rendre `connected_accounts` rempli en double pendant 1 release.
4. **Phase 4 — Migration live_sessions** : EventSub écrit dans `creator_live_sessions`
   (`source='eventsub'`), `live_sessions` devient lecture seule, puis archivée.
5. **Phase 5 — Suppression** : après vérification métriques (zéro lecture pendant 30 jours),
   drop des tables legacy via migration.

Ordre recommandé : `live_sessions` avant `connected_accounts` (moins de dépendances).

## Candidats à suppression future (ne pas dropper maintenant)

- `connected_accounts` — après migration complète vers `creator_connected_accounts`.
- `live_sessions` + `live_snapshots` + `live_debriefs` (à réévaluer) — après migration
  vers `creator_live_sessions`.

**Ne supprimer aucune table tant qu'un audit lecture/écriture sur 30 jours n'a pas
confirmé zéro trafic.**
