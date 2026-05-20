
# Audit Streamnco — Clips, contenus courts & recommandations de publication

## 1. Résumé exécutif

**Bonne nouvelle : on ne part pas de zéro.** L'infrastructure d'ingestion des clips Twitch existe déjà et tourne (table, edge function, batch, fact-fetch). Ce qui manque, c'est la **couche produit** : un générateur d'idées de contenus courts (hooks, captions, titres) branché sur ces données, et une UI dédiée. Le scope OAuth actuel est **suffisant** pour Get Clips. La majorité du travail restant est frontend + un service d'intelligence, pas de l'infra.

Verdict court : **Niveau 1 réalisable en quelques heures avec uniquement du frontend + 1 service**, niveau 2 livrable sans nouvelle table ni nouvelle edge function critique.

---

## 2. Briques existantes (réutilisables tel quel)

### 2.1 Ingestion clips Twitch — COMPLÈTE
- `supabase/functions/_shared/clipIngest.ts` : appel `GET /helix/clips`, pagination, dédup, upsert.
- `supabase/functions/twitch-clips-ingest/index.ts` : entrypoint HTTP (mode single + mode batch cron).
- Sélection auto des broadcasters éligibles (lives récents 7j + actions weekly contenant "clip").
- `supabase/functions/_shared/twitchFactsFetch.ts` lit aussi `/helix/clips` pour le facts engine.
- `supabase/functions/twitch-public-lookup/index.ts` et `twitch-live-fetch/index.ts` font déjà des appels `/helix/clips` (mode teaser).

### 2.2 Stockage clips — table `twitch_clip_snapshots`
Colonnes utiles déjà présentes : `twitch_clip_id`, `broadcaster_id`, `user_id`, `title`, `view_count`, `clip_created_at`, `duration`, `vod_offset`, `is_featured`, `thumbnail_url`, `url`, `game_id`, `video_id`, `creator_id`, `fetched_at`. RLS lecture utilisateur OK. Tout ce qu'il faut pour ranking, sous-exploitation, classement par live (`video_id`), par période (`clip_created_at`), par jeu (`game_id`).

### 2.3 Données satellites disponibles
- `live_sessions` + `live_snapshots` : sessions, durée, peak, catégorie, titre de live.
- `live_debriefs` : strength / weakness / priority_action / verdict / signal_quality / overall_score.
- `stream_score_snapshots` + `analysis_reports` : score global + dimensions + breakdown.
- `recommendations` (par analyse) + `weekly_action_items` (plan hebdo).
- `channel_update_history` : titres/catégories historiques (utile pour titres performants).
- `community_events` : signaux d'engagement.
- `connected_accounts` : `platform_user_id` (broadcaster_id), tokens chiffrés, scope.

### 2.4 Générateur de posts existant — partiellement aligné
- `src/services/postGenerator.ts` : génère déjà tweet / discord / tiktok / next_live à partir d'une session + debrief. Hashtags par jeu mappés. Bonne base de patterns.
- `src/components/LivePostGenerator.tsx` : UI copie-coller multi-format, accepte un lien clip optionnel.
- `src/services/weeklyActions/catalog.ts` : action `content_create_clips_from_last_live` déjà définie + vérification auto via `twitch_clip_snapshots`.

### 2.5 UI / shell
- `AppShell`, `PageContainer`, `PageHeader`, `SectionHeader`, `Card`, `Accordion`, `Badge`, `ScoreCard`, `RecommendationCard`, `PlaybookCard`, `LastVsAverageCard`, `WeeklySequenceCard`, `WeeklyQuestCard`, `LiveTimeline` — tout l'inventaire design system existe.
- Routes : `/dashboard`, `/plan` (WeeklyPlanPage), `/lives`, `/lives/:id` (LiveDetailPage), `/last-live`, `/playbooks`. Points d'insertion clairs.

### 2.6 Scope OAuth Twitch — SUFFISANT
Scopes actuels (`twitch-oauth/index.ts`) :
```
user:read:email
channel:read:subscriptions
analytics:read:games
moderator:read:followers
```
`GET /helix/clips` requiert seulement un **App Access Token** (client_credentials). Aucun scope user supplémentaire nécessaire pour lister les clips publics d'un broadcaster. → **Pas de modification OAuth requise** pour le niveau 1 et 2.

---

## 3. Briques partiellement existantes

| Brique | État actuel | Ce qui manque |
|---|---|---|
| Ingestion clips utilisateur connecté | Code prêt, déclenché par cron + actions weekly | Pas de trigger UI explicite ("rafraîchir mes clips"), pas de scheduler régulier indépendant des weekly actions |
| Génération de captions/hooks | `postGenerator.ts` couvre post-live (tweet/discord/tiktok) | Pas de génération **par clip** (hook + caption + titre court adaptés à un clip précis, pas à une session) |
| Action "publier un clip" | Action weekly + vérification du nombre de clips | Pas d'UI dédiée pour proposer **quels clips** publier ni **quoi écrire** |
| Données Twitch Videos (VODs) | Type `TwitchVideo` défini, exposé dans `AnalysisReport.videos` | **Aucune table** `twitch_videos`, aucun ingest VOD persistant (juste lecture éphémère côté report) |
| Score de potentiel d'un clip | Aucun, mais view_count + duration + vod_offset + is_featured disponibles | Heuristique simple à coder côté service |
| Détection clips sous-exploités | Données brutes présentes (view_count vs autres clips du même live) | Logique à écrire |

---

## 4. Briques totalement manquantes

1. **Service `clipInsights` / `shortContentEngine`** : ranking, score potentiel, détection sous-exploités, sélection top N.
2. **Service `shortContentGenerator`** : hooks TikTok/Reels/Shorts + captions + titres **par clip** (vs par session).
3. **Page UI dédiée** type `/contenus` ou `/clips` (liste + filtres live/période + actions).
4. **Carte cockpit dashboard** "Contenu à publier cette semaine" (3 clips + 1 format + 1 timing + 1 score).
5. **Export texte multi-plateforme** (TikTok/Reels/Shorts) — l'existant cible Twitter/Discord/TikTok session-level, pas clip-level.
6. **Recommandation timing** : aucune heuristique sur "quand publier" (créneaux, jour). À dériver de `live_sessions.started_at` historique ou tableaux statiques.
7. **Table VOD persistante** (`twitch_videos`) — non bloquant pour niveau 1/2 (clips suffisent).
8. **Trigger UI "rafraîchir mes clips maintenant"** sur la page dédiée.

---

## 5. Risques techniques

- **Coût Helix** : Get Clips est paginé (5 pages × 100 max dans `clipIngest`). Pour beaucoup d'utilisateurs en concurrence cron, surveiller le rate limit App token. Risque faible aujourd'hui (peu d'utilisateurs).
- **Fraîcheur** : `twitch_clip_snapshots` n'est rafraîchi que par cron + déclenchement weekly. Si un user arrive sur la page dédiée sans cron récent, données potentiellement vides. → Prévoir un refresh on-demand (réutiliser le endpoint single mode existant).
- **Cohérence identité** : ne jamais afficher de clips d'un broadcaster qui n'est pas le `connected_accounts.platform_user_id` courant (RLS protège déjà, mais à respecter côté query).
- **Génération texte** : sans LLM, le générateur sera template-based comme `postGenerator.ts`. Acceptable pour V1. Si on veut du LLM plus tard → Lovable AI gateway (déjà disponible, voir `google/gemini-2.5-flash`).
- **VOD offset null** : certains clips n'ont pas de `vod_offset` (clip d'un live non archivé). Le rattachement à un live peut échouer → fallback sur `clip_created_at` ∈ [started_at, ended_at].

---

## 6. Opportunités quick win

1. **Carte cockpit "Cette semaine, publie ces 3 clips"** sur `/dashboard` ou `/plan`, alimentée par `twitch_clip_snapshots` + ranking simple (view_count desc, age < 14j) + 1 caption générée template-based. ~1 fichier service + 1 composant.
2. **Bouton "Générer captions" sur LiveDetailPage** : pour chaque clip du live, propose hook + caption + titre. Réutilise `postGenerator.ts` patterns.
3. **Élargir `LivePostGenerator` existant** pour proposer automatiquement des clips de la session au lieu d'un input manuel d'URL.

---

## 7. Recommandation produit

**Phaser pour livrer de la valeur vite sans dette.** Le piège serait de construire une page "Clips Twitch complète" type Eklipse d'emblée. Mieux : commencer par **une seule carte cockpit honnête** ("3 clips à publier cette semaine + textes prêts"), valider l'usage, puis seulement creuser. La page dédiée vient après preuve d'usage.

Aligné avec la doctrine produit Streamnco :
- Honnêteté des données : si moins de 3 clips disponibles → afficher l'état vide explicite, ne pas inventer.
- Pas de fake : un clip avec 4 vues ne devient pas "fort potentiel".
- Pas de pollution teaser/connected : la carte n'apparaît qu'en mode connected.

---

## 8. Plan d'implémentation recommandé

### Niveau 1 — Quick win (sans nouvelle infra, ~0.5–1 jour)
**Livrable** : carte "Contenu à publier cette semaine" sur `/plan` (et optionnellement `/dashboard`).
1. Service `src/services/shortContentPlanner.ts` :
   - Lit `twitch_clip_snapshots` du user (RLS) sur 14 derniers jours.
   - Score potentiel = f(view_count, recency, is_featured, duration ∈ [15s, 60s]).
   - Détecte sous-exploités = clips récents avec view_count faible vs médiane des clips du même live.
   - Retourne top 3 + 1 reco format + 1 reco timing (template basé sur historique `live_sessions.started_at`).
2. Service `src/services/shortContentCopy.ts` :
   - Templates par jeu (réutilise `GAME_HASHTAGS` de `postGenerator.ts`).
   - Pour chaque clip : 1 hook TikTok/Reels/Shorts (3 variantes), 1 caption, 1 titre court ≤ 60 caractères.
3. Composant `src/components/WeeklyShortContentCard.tsx` :
   - États : empty (pas de clips), partial (<3 clips), ready (3 clips avec textes copiables).
   - Bouton "Rafraîchir mes clips" qui invoke `twitch-clips-ingest` en mode single.
4. Insertion dans `WeeklyPlanPage`.

**Aucune** : nouvelle table, nouvelle edge function, nouveau scope OAuth, nouvelle dépendance.

### Niveau 2 — Page dédiée Clips (~1–2 jours)
**Livrable** : page `/contenus` (ou `/clips`) — analyse complète des clips Twitch.
1. Nouvelle route protégée + entrée sidebar.
2. Composants : liste filtrable par live (`video_id`) ou période, tri par potentiel, badges sous-exploité / non publié.
3. Détail clip : thumbnail, vues, durée, date, jeu, lien Twitch, bouton "Générer pack hooks/captions/titre".
4. Export texte multi-plateforme (modal copy-to-clipboard, sections TikTok/Reels/Shorts).
5. Refresh on-demand via endpoint single mode existant.
6. (Optionnel) Brancher Lovable AI Gateway (`google/gemini-2.5-flash`) pour générations plus créatives — derrière un feature flag.

### Niveau 3 — Automatisation avancée (plus tard, après validation usage)
1. Table `twitch_videos` + ingest VOD pour analyse retitling.
2. Suivi de publication : marquer un clip comme "publié sur TikTok/Reels/Shorts", historique.
3. Tracking de performance externe (si user colle les vues post-publication) ou intégration TikTok/YouTube API.
4. Recommandations de re-post intelligentes (clip publié il y a 30 jours, fort potentiel, à republier).
5. Génération via LLM avec apprentissage des hooks qui ont marché pour ce streamer.
6. Edge function cron `clip-recommendations-refresh` si la charge le justifie.

---

## 9. Verdict final

**On capitalise largement sur l'existant.**

- Infra ingestion clips : **prête**.
- Stockage : **prêt** (`twitch_clip_snapshots`).
- Scope OAuth : **suffisant**, aucune modif.
- Design system + shell + routes : **prêts**.
- Patterns de génération texte : **existants**, à étendre clip-level.

Ce qui reste est de la **logique produit frontend + 2 services TypeScript**. Le niveau 1 est livrable rapidement sans toucher à la base de données, aux edge functions critiques, ni aux scopes. On démarre par la carte cockpit, on valide l'usage, puis on construit la page dédiée.
