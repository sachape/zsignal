# Pipeline serveur StreamScore — plan d'exécution

## Contexte

Step 1 livré et validé : `process-analysis-job` (mode `single_admin`) calcule et écrit un `stream_score_snapshots` v3 côté serveur. Valeurs réelles fleevalo : overall=25, structure=28, content=0, positioning=50, momentum=45, affiliation=43.

Gap restant : `analysis_reports` (lu par le Dashboard pour le score courant, le breakdown, le wording, les recos) est encore généré uniquement par `autoRefreshRunner` côté navigateur. Tant qu'on n'ouvre pas le Dashboard, le score affiché reste l'ancien.

## Objectif

Le backend devient la source de vérité unique pour `analysis_reports` + `stream_score_snapshots`. Le frontend ne calcule plus rien : il lit le dernier rapport et affiche.

## Découpage en 4 livraisons

### Livraison A — Port serveur du report assembler (la plus grosse)

Cible : `process-analysis-job` mode `single_admin` écrit aussi un `analysis_reports` complet.

Travail :

1. Créer `supabase/functions/_shared/reportAssembler.ts` (port Deno de `src/services/reportAssembler.ts`). Dépendances à porter ou réutiliser :
   - `_shared/factsEngine.ts` (existe déjà côté Deno) ✓
   - `_shared/streamScoreEngine.ts` (existe déjà) ✓
   - `_shared/recommendationEngine.ts` (à porter)
   - `_shared/weeklyActions/*` (à porter — diagnosis, signals, ranking, catalog, generate, maturity)
   - `_shared/liveProgressionCopy.ts` (à porter — copy FR)
   - `_shared/reportConsistency.ts` (à porter)
   - `_shared/shortContentPlanner.ts` (à porter)
2. Module partagé physique : créer les fichiers côté `supabase/functions/_shared/` en TypeScript pur Deno-compatible (pas de DOM, pas de Supabase client). Le frontend continue d'importer depuis `src/services/*` qui délègue aux modules `_shared/` via un wrapper (comme déjà fait pour `streamScoreEngine`). Pas de duplication de logique.
3. `process-analysis-job` orchestre :
   - claim atomique (UPDATE `analysis_jobs` SET status='processing' WHERE id=? AND status='queued')
   - `fetchTwitchFactsForAccount` (déjà OK)
   - `assembleReport(facts, jobId, liveSessions, identity)`
   - INSERT `analysis_reports` (le trigger `upsert_stream_score_snapshot_from_report` ON CONFLICT met à jour le snapshot existant — id stable)
   - UPDATE `analysis_jobs` SET status='completed', completed_at=now()
   - En erreur : status='failed', last_error=...

Risques :
- Le port doit produire un `analysis_reports.report_data` strictement équivalent au format frontend (mêmes clés). Sinon Dashboard casse.
- Validation : comparer JSON.stringify(reportServer) vs reportFrontend sur 2-3 comptes test ; ajuster jusqu'à identité structurelle.

Critère de succès : pour le job fleevalo `01c0ce0e`, un nouveau `analysis_reports` apparaît avec `score.overall = 25`, breakdown complet, Affiliation présent (pas "Monétisation"), point de blocage = Contenu, action prioritaire = clip.

### Livraison B — Cron Postgres toutes les 5 min

Travail :

1. Activer extensions `pg_cron` et `pg_net` (probablement déjà actives — vérifier).
2. Créer le cron via `supabase--insert` (pas migration, car contient secret) :
   ```sql
   select cron.schedule('process-analysis-jobs', '*/5 * * * *', $$
     select net.http_post(
       url := 'https://poblhczgdbnfunroshul.supabase.co/functions/v1/process-analysis-job',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer <CRON_SECRET>"}'::jsonb,
       body := '{"mode":"queued_batch","limit":10}'::jsonb
     );
   $$);
   ```
3. Renforcer `process-analysis-job` queued_batch :
   - colonnes à ajouter sur `analysis_jobs` : `retry_count int default 0`, `locked_at timestamptz`, `processing_started_at timestamptz`
   - claim atomique avec `locked_at` (skip si déjà locked < 10 min)
   - unlock auto des jobs `processing` depuis > 15 min (retry)
   - status final `completed` / `failed` avec `last_error` <= 200 chars

Critère de succès : créer un job queued à la main, attendre 5 min, vérifier qu'il passe en `completed` avec snapshot + report écrits sans toucher le frontend.

### Livraison C — Bouton "Relancer l'analyse" Dashboard

Travail :

1. Côté frontend `DashboardPage` : remplacer le `manualRefresh` actuel par :
   - INSERT `analysis_jobs` (status='queued', trigger_source='manual_dashboard')
   - Invoke `process-analysis-job` mode `single` avec JWT utilisateur (route déjà en place ; ajouter écriture `analysis_reports` une fois Livraison A faite)
   - Loader "Analyse en cours…" pendant max 30s avec polling `analysis_jobs.status`
   - Au passage à `completed` : re-fetch dernier `analysis_reports`, toast "Analyse mise à jour"
   - En cas de timeout : message clair "L'analyse prend plus longtemps que prévu — le résultat apparaîtra automatiquement"
2. Supprimer la dépendance "doit charger /dashboard pour déclencher autoRefreshRunner".

### Livraison D — Migration progressive et nettoyage

1. Garder `autoRefreshRunner` actif 1 release comme fallback silencieux (ne plus le déclencher automatiquement, seulement si aucun report < 10 min et server-side processing a échoué).
2. Documenter dans `docs/data-model-audit.md` : "analysis_reports écrit uniquement par process-analysis-job côté serveur. autoRefreshRunner = fallback déprécié."
3. Une fois 1 semaine sans incident : supprimer `autoRefreshRunner` (Livraison E future).

## Ordre d'exécution proposé

1. **Livraison A** (port reportAssembler) — bloquant, ~le plus de code, fait dans un PR dédié.
2. **Livraison B** (cron) — dépend de A pour être utile, mais structurellement indépendant.
3. **Livraison C** (bouton) — dépend de A.
4. **Livraison D** (cleanup) — après stabilisation.

## Validation finale fleevalo (commune aux 4 livraisons)

Après A+B en place :
- nouveau job queued → cron consomme → `analysis_reports` créé → snapshot mis à jour
- Dashboard rechargé : score = 25, breakdown affiche Affiliation, point de blocage = Contenu, action = "Transforme ton dernier live en au moins 1 clip publiable"
- aucune mention "Monétisation" ou "données partielles"

## Question

Livraison A représente ~600-900 lignes de port Deno (recommendationEngine + weeklyActions/* + copy + glue + tests parité). Est-ce qu'on part directement sur Livraison A maintenant, ou tu veux qu'on valide d'abord Livraison B (cron sur le snapshot seul) pour avoir un quick-win serveur en attendant le port complet ?
