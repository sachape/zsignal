# V3D — Guide de déploiement du worker FFmpeg

Ce guide explique étape par étape comment déployer le worker externe nécessaire à la génération réelle des clips, puis comment connecter Streamnco à ce worker.

Tant que ce déploiement n'est pas fait, l'app reste cohérente : le bouton « Générer » répond `worker_not_configured`, le content item passe en `generation_status=unavailable`, **aucun faux clip n'est créé**, aucun `generated_video_url` factice n'est écrit.

---

## 1. Préparer les secrets locaux

Sur ta machine, génère un secret partagé fort (utilisé pour authentifier les requêtes Streamnco ↔ worker) :

```bash
openssl rand -hex 32
```

Garde la valeur de côté — tu en auras besoin **deux fois** : une fois côté worker, une fois côté Lovable.

Récupère aussi :
- `SUPABASE_URL` : `https://poblhczgdbnfunroshul.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` : depuis **Lovable Cloud → Settings → Secrets** (tu peux la copier sans l'afficher dans le chat).

---

## 2. Choisir un hébergeur

Le worker est un conteneur Docker Node.js avec FFmpeg. N'importe quel hébergeur de containers fonctionne. Recommandation **Fly.io** pour le MVP (gratuit jusqu'à ~3 petites machines, déploiement en 2 commandes).

| Hébergeur | Coût MVP estimé | Difficulté |
|---|---|---|
| **Fly.io** | 0–5 €/mois | Facile (recommandé) |
| Google Cloud Run | 0–10 €/mois (free tier) | Facile |
| Render | 7 €/mois (instance always-on) | Facile |
| Railway | ~5 €/mois | Très facile |
| Modal | À l'usage | Moyen |

---

## 3. Déploiement Fly.io (recommandé)

```bash
# Pré-requis : flyctl installé (https://fly.io/docs/hands-on/install-flyctl/)
cd workers/clip-generator

# Crée l'app (répond non quand il propose Postgres/Redis)
fly launch --no-deploy --name streamnco-clip-gen --region cdg

# Renseigne les secrets
fly secrets set \
  SUPABASE_URL="https://poblhczgdbnfunroshul.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<colle ta service role key>" \
  WORKER_SHARED_SECRET="<colle le secret généré à l'étape 1>"

# Déploie
fly deploy
```

Récupère l'URL publique :
```bash
fly status
# → Hostname: streamnco-clip-gen.fly.dev
```

Teste le healthcheck :
```bash
curl https://streamnco-clip-gen.fly.dev/health
# → {"ok":true}
```

---

## 4. Déploiement Cloud Run (alternative)

```bash
cd workers/clip-generator
gcloud run deploy streamnco-clip-gen \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --timeout 600 \
  --set-env-vars "SUPABASE_URL=https://poblhczgdbnfunroshul.supabase.co" \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=<service-role-key>" \
  --set-env-vars "WORKER_SHARED_SECRET=<secret>"
```

L'URL renvoyée ressemble à `https://streamnco-clip-gen-xxxxxxxxx-ew.a.run.app`.

---

## 5. Connecter Streamnco au worker

Dans Lovable, dis-moi simplement :

> « Ajoute les secrets `WORKER_BASE_URL` et `WORKER_SHARED_SECRET` »

Je te générerai le formulaire sécurisé pour saisir :
- **WORKER_BASE_URL** : l'URL HTTPS du worker (ex : `https://streamnco-clip-gen.fly.dev`) — **sans slash final**
- **WORKER_SHARED_SECRET** : exactement la même valeur que celle utilisée à l'étape 1

Une fois ajoutés, la prochaine génération sera réelle. Aucun changement de code n'est requis.

---

## 6. Variables d'environnement — récap

### Côté worker (hébergeur)
| Variable | Source |
|---|---|
| `SUPABASE_URL` | `https://poblhczgdbnfunroshul.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Lovable Cloud Settings → Secrets |
| `WORKER_SHARED_SECRET` | Généré via `openssl rand -hex 32` |
| `PORT` | Optionnel, défaut `8080` |

### Côté Lovable Cloud (Supabase Edge Functions)
| Variable | Source |
|---|---|
| `WORKER_BASE_URL` | URL publique du worker déployé |
| `WORKER_SHARED_SECRET` | **Même valeur** qu'au-dessus |

Les autres (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) sont déjà fournis automatiquement aux edge functions par Lovable Cloud.

---

## 7. Test bout en bout

1. Va dans **Content Queue**, sur un item vidéo (YouTube Shorts / TikTok / Twitch Clip).
2. Clique **Définir les timestamps** → renseigne une URL VOD + début/fin (5–180 s).
3. Clique **Générer le clip**.
4. Choisis « Upload source » et envoie un .mp4 court.
5. Suis l'état dans la card : `En file d'attente` → `Découpe en cours XX%` → `Clip prêt`.
6. Le `<video>` apparaît, tu peux le prévisualiser.
7. Clique **Uploader le clip** → il est envoyé vers YouTube via l'edge function existante.

---

## 8. Sécurité

- `SUPABASE_SERVICE_ROLE_KEY` ne quitte **jamais** ton hébergeur worker. Elle n'est jamais exposée au frontend.
- `WORKER_SHARED_SECRET` protège l'edge function `clip-job-callback` : sans ce header, toute requête est rejetée en 403.
- Les buckets `creator-source-videos` et `creator-generated-clips` sont **privés**. Les URLs sont signées (durée limitée : 30 min pour le téléchargement source côté worker, 7 jours pour la preview/upload côté frontend).
- Aucune URL signée n'est loggée intégralement.
- Le worker supprime systématiquement ses fichiers temporaires (`/tmp/clip-{job_id}-*`) après chaque job, même en cas d'échec.

---

## 9. Limites assumées V3D MVP

- Découpe simple `start → end`, encodage H.264 / AAC, MP4, max 1080p
- Durée clip : 5 à 180 secondes
- Taille source max : 500 Mo
- Pas de sous-titres auto
- Pas de crop vertical intelligent
- Pas de face tracking
- Pas de détection automatique des best-of
- VOD Twitch / YouTube non téléchargeables directement (upload reste le parcours fiable)
- Pas de publication TikTok / Instagram (YouTube uniquement)
