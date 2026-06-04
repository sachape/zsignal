# Meta / Instagram App Review — Streamnco

> Document de préparation pour la soumission App Review (Meta for Developers).
> Les secrets Meta peuvent être ajoutés dès la phase test/dev pour valider le flow OAuth avec des utilisateurs testeurs déclarés dans la Meta Developer Console. L'App Review est nécessaire avant d'ouvrir l'intégration en production à des utilisateurs réels (et avant que la publication Post/Reel/Story soit activée pour tous).

## 1. Objectif de l'intégration

Permettre à un streamer/créateur connecté à Streamnco de **préparer, prévisualiser, planifier et publier** ses contenus Instagram (Post / Reel / Story) directement depuis l'app — sans quitter son cockpit éditorial.

## 2. Use case Streamnco

Streamnco est un copilote de croissance pour créateurs (Twitch d'abord, multi-plateformes ensuite). Le module Content Studio :

- importe des clips/idées générés depuis l'activité du streamer
- propose un Composer Instagram (Post / Reel / Story) avec preview fidèle
- enregistre des brouillons et planifie une date de publication
- publie réellement sur Instagram via Graph API une fois Meta validé

## 3. Choix technique (V1)

- **Flow choisi** : **Instagram API with Instagram Login** (direct Instagram OAuth)
- **PAS** : Facebook Login for Business / `/me/accounts` / `instagram_business_account`
- **Type d'app Meta** : Business
- **Compte requis côté utilisateur Streamnco** : compte **Instagram professionnel** (Business **ou** Creator)
- **Page Facebook côté utilisateur** : **NON imposée**. C'est une décision produit assumée :
  notre audience cible (streamers / créateurs) n'a souvent pas de Page Facebook et nous refusons cette friction.
- **API runtime** : Instagram Graph API via `graph.instagram.com` (pas `graph.facebook.com`),
  versionnée par `META_GRAPH_API_VERSION` (défaut `v21.0`).

## 4. Permissions / scopes (V1)

| Scope | Raison |
|---|---|
| `instagram_business_basic` | Récupérer l'identité du compte Instagram pro (`user_id`, `username`, `account_type`, `profile_picture_url`) pour l'afficher dans Réseaux. |
| `instagram_business_content_publish` | Publier Post / Reel / Story depuis le Composer une fois l'App Review approuvée. |

**Scopes explicitement retirés** (utilisés par l'ancien flow Facebook Login, plus pertinents) :

- `instagram_basic` (déprécié pour le flow Instagram Login direct)
- `instagram_content_publish` (déprécié pour le flow Instagram Login direct)
- `pages_show_list`
- `pages_read_engagement`
- `business_management`

Pas de demande pour Marketing API, Ads, Insights utilisateur, DMs, commentaires en V1.

## 5. Endpoints utilisés (flow Instagram Login direct)

- **Authorize** : `GET https://www.instagram.com/oauth/authorize`
  - params : `client_id`, `redirect_uri`, `state`, `scope`, `response_type=code`
- **Token court** : `POST https://api.instagram.com/oauth/access_token`
  - form-encoded : `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code`
  - retourne `access_token` + `user_id`
- **Token long (~60 j)** : `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=…&access_token=…`
- **Refresh long-lived** : `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…`
- **Identité compte** : `GET https://graph.instagram.com/{v}/me?fields=user_id,username,account_type,profile_picture_url`
- **Publication (préparée, désactivée tant que `INSTAGRAM_PUBLISH_ENABLED=false`)** :
  - `POST https://graph.instagram.com/{v}/{ig-user-id}/media` — création du container
  - `GET  https://graph.instagram.com/{v}/{container-id}?fields=status_code` — polling
  - `POST https://graph.instagram.com/{v}/{ig-user-id}/media_publish` — publication

**Aucun appel à `/me/accounts`** et **aucune dépendance Page Facebook** dans le flow Streamnco.

### Paramètres par format

| Format | Champs |
|---|---|
| **Post** (image ou vidéo simple) | `image_url` **ou** `video_url`, `caption` |
| **Reel** | `media_type=REELS`, `video_url`, `caption`, `share_to_feed` |
| **Story** | `media_type=STORIES`, `image_url` **ou** `video_url` |

## 6. Limites & contraintes média (officielles Meta)

- **Image** : JPEG, ratio 4:5 à 1.91:1, max 8 Mo
- **Video Reel** : MP4/MOV, H.264/AAC, 9:16 idéal, 3–90 s, max 1 Go
- **Video Story** : MP4/MOV, 9:16, jusqu'à 60 s, max 100 Mo
- **Caption** : ≤ 2200 caractères, max 30 hashtags
- **URLs médias** : publiquement accessibles en HTTPS pendant la création du container
- **Quotas** : 50 publications API par compte IG par 24 h glissantes (Content Publishing API)

## 7. Gestion des tokens

- Token court → échangé immédiatement contre **long-lived (~60 jours)** via `graph.instagram.com`
- Stockage : `creator_meta_connections.access_token_encrypted` (chiffré)
- Refresh : appel périodique à `refresh_access_token` avant expiration
- Sur révocation / 401 / OAuthException : `connection_status = 'expired'` ou `'revoked'`, UI invite à reconnecter

### Dette connue — clé de chiffrement

- Aujourd'hui, le module `_shared/tokenCrypto.ts` utilise `TWITCH_TOKEN_ENC_KEY` comme clé générique
  pour chiffrer les tokens de **toutes** les plateformes (Twitch, YouTube, Instagram).
- **Cible** : la renommer en `TOKEN_ENCRYPTION_KEY` (nom déjà documenté dans `.env.example`).
- **Migration** : non faite maintenant — la rotation casserait Twitch & YouTube déjà en prod.
  À planifier avec un déchiffrement double (ancienne clé → nouvelle clé) puis dépréciation.

## 8. Erreurs principales à gérer

| Code | Sens | Action UX |
|---|---|---|
| `OAuthException` (190) | Token expiré / révoqué | Marquer `expired`, demander reconnexion |
| `ig_account_not_professional` | Le compte n'est pas Business/Creator | Message clair, demander de basculer en pro |
| `9004` | Media URL inaccessible | Retry après ré-upload signed URL |
| `36003` | Container en cours, retry | Poll `status_code` |
| `2207026` | Format vidéo invalide | Refuser côté Composer avant envoi |

## 9. Données stockées

Table `creator_meta_connections` :
- identité IG (`instagram_account_id`, `instagram_username`, avatar, `account_type`)
- tokens chiffrés (`access_token_encrypted`, `refresh_token_encrypted`)
- statut (`connection_status`, `error_code`, `error_message`)
- `page_id` / `page_name` : **colonnes legacy laissées nullable**, jamais peuplées par le flow
  Instagram Login. Conservées pour compat ascendante, à retirer dans une migration ultérieure si
  aucun autre usage n'apparaît.

RLS stricte : `user_id = auth.uid()`. Les tokens ne sont jamais retournés au frontend.

## 10. Politique de confidentialité / suppression

- Page publique : `/legal/privacy`
- Suppression compte → cascade `creator_meta_connections` via `ON DELETE CASCADE`
- Endpoint de désinscription : `instagram-disconnect` (révoque côté Streamnco) + lien vers les paramètres Meta du user

## 11. Parcours utilisateur pour le screencast App Review

1. Connexion à Streamnco (compte test fourni à Meta)
2. Aller dans **Réseaux** → carte Instagram
3. Cliquer **Connecter Instagram**
4. Flow OAuth Instagram (instagram.com) → autorisation des permissions
5. Retour dans Streamnco → carte Instagram passe à **Connecté** avec username + avatar
6. Aller dans **Content Studio → Composer**
7. Créer un Reel : sélection vidéo, caption, hashtags, preview 9:16
8. Cliquer **Publier maintenant**
9. Vérifier dans **Publications** : statut `published`, lien vers le post Instagram
10. Optionnel : montrer **Déconnecter** depuis Réseaux pour révocation

## 12. Limites V1

- Pas de carrousel multi-images (V1.1)
- Pas de réponses automatiques aux commentaires/DMs
- Pas d'A/B testing de captions
- Pas d'analytics Instagram
- Scheduler automatique non livré (status `scheduled` = repère éditorial uniquement)

## 13. Étapes manuelles côté Meta Developer Console (mode test / dev)

1. Créer une **Meta App** type **Business** dans https://developers.facebook.com/
2. Ajouter le produit **Instagram → Instagram API setup with Instagram Login**
   (et **NON** Facebook Login for Business)
3. Dans **App Settings → Basic** : récupérer `App ID` et `App Secret`
4. Dans **Instagram → API setup with Instagram Login → Business Login Settings** :
   ajouter dans **OAuth Redirect URIs** :
   `https://streamnco.fr/auth/instagram/callback`
   (et l'URL de preview Lovable si tu testes depuis le preview)
5. Dans **App Roles** : ajouter les utilisateurs testeurs (compte Instagram Business/Creator).
   Aucune Page Facebook n'est requise côté testeur.
6. Renseigner **Privacy Policy URL** : `/legal/privacy` et **Data Deletion** côté Streamnco
7. Ajouter dans **Lovable Cloud Secrets** :
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `META_REDIRECT_URI` (la même URL que ci-dessus — `https://streamnco.fr/auth/instagram/callback`)
   - `META_GRAPH_API_VERSION` (défaut `v21.0`)
   - `INSTAGRAM_OAUTH_ENABLED=true` (active le flow côté edge functions)
8. Côté frontend, mettre `VITE_INSTAGRAM_OAUTH_ENABLED=true` pour afficher le bouton Connecter Instagram
9. Tester le flow avec un compte testeur. Tant que l'App Review n'est pas validée, seuls les rôles
   déclarés dans la console peuvent compléter le flow.
10. Pour ouvrir à tous les utilisateurs : soumettre l'App Review pour
    `instagram_business_basic` + `instagram_business_content_publish`,
    puis activer `INSTAGRAM_PUBLISH_ENABLED=true`.

## 14. Domaine canonique

Le redirect URI **officiel** est :

```
https://streamnco.fr/auth/instagram/callback
```

Ne **pas** utiliser `streamnco.com` comme redirect URI Meta — `.fr` est le domaine canonique
Streamnco. Les autres domaines (`streamnco.com`, `www.streamnco.fr`, `www.streamnco.com`,
`*.lovable.app`) peuvent être ajoutés en redirect URIs additionnels seulement si on a besoin
de tester depuis ces hôtes, jamais comme valeur primaire dans `META_REDIRECT_URI`.
