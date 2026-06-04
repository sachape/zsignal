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

## 3. Choix technique recommandé

- **Type d'app Meta** : Business
- **Compte Instagram requis** : Instagram **Business** ou **Creator**
- **Lien Facebook Page** : recommandé (Instagram Login for Business permet le flow sans Page mais certaines features restent liées à un Business Portfolio)
- **Flow OAuth** : Instagram Login for Business (`facebook.com/{v}/dialog/oauth` côté Meta) → callback côté serveur Streamnco
- **API** : Instagram Graph API (versionnée, `META_GRAPH_API_VERSION` par défaut `v21.0`)

## 4. Permissions demandées

| Permission | Raison |
|---|---|
| `instagram_business_basic` | Récupérer l'identité du compte Instagram pro (id, username, avatar) pour l'afficher dans Réseaux. |
| `instagram_business_content_publish` | Publier Post / Reel / Story depuis le Composer. |
| `instagram_business_manage_comments` | (optionnel V1.1) Afficher l'engagement sur les publications créées via Streamnco. |
| `instagram_business_manage_messages` | (optionnel V2) Réponses rapides aux DMs depuis le cockpit. |

Pas de demande de `pages_*` au-delà du strict minimum exigé par Meta pour le flow choisi. Aucune permission liée à Marketing API, Ads, Insights utilisateur.

## 5. Endpoints utilisés

- `POST /{v}/oauth/access_token` — échange code → token court
- `GET /{v}/oauth/access_token?grant_type=fb_exchange_token` — long-lived token
- `GET /{v}/me/accounts` puis résolution Instagram Business Account
- `POST /{v}/{ig-user-id}/media` — création du container
- `GET /{v}/{container-id}?fields=status_code` — polling
- `POST /{v}/{ig-user-id}/media_publish` — publication

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

- Token court → échangé immédiatement contre **long-lived (~60 jours)**
- Stockage : `creator_meta_connections.access_token_encrypted` (chiffré avec `TOKEN_ENCRYPTION_KEY`, même stratégie que Twitch/YouTube)
- Refresh : appel périodique au refresh long-lived avant expiration
- Sur révocation / 401 / OAuthException : `connection_status = 'expired'` ou `'revoked'`, UI invite à reconnecter

## 8. Erreurs principales à gérer

| Code | Sens | Action UX |
|---|---|---|
| `OAuthException` (190) | Token expiré / révoqué | Marquer `expired`, demander reconnexion |
| `100` `subcode 33` | IG account introuvable | `error`, message clair |
| `9004` | Media URL inaccessible | Retry après ré-upload signed URL |
| `36003` | Container en cours, retry | Poll `status_code` |
| `2207026` | Format vidéo invalide | Refuser côté Composer avant envoi |

## 9. Données stockées

Table `creator_meta_connections` :
- identité IG (`instagram_account_id`, `instagram_username`, avatar, `account_type`)
- tokens chiffrés (`access_token_encrypted`, `refresh_token_encrypted`)
- statut (`connection_status`, `error_code`, `error_message`)
- métadonnées Page (`page_id`, `page_name`) si flow Page-based

RLS stricte : `user_id = auth.uid()`. Les tokens ne sont jamais retournés au frontend.

## 10. Politique de confidentialité / suppression

- Page publique : `/legal/privacy`
- Suppression compte → cascade `creator_meta_connections` via `ON DELETE CASCADE`
- Endpoint de désinscription Meta : `instagram-disconnect` (révoque côté Streamnco) + lien vers les paramètres Meta du user

## 11. Parcours utilisateur pour le screencast App Review

1. Connexion à Streamnco (compte test fourni à Meta)
2. Aller dans **Réseaux** → carte Instagram
3. Cliquer **Connecter Instagram**
4. Flow OAuth Meta → sélection du compte Business + autorisation des permissions
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
- Scheduler automatique non livré (status `scheduled` = repère éditorial uniquement)

## 13. Étapes manuelles côté Meta Developer Console (mode test / dev)

1. Créer une **Meta App** type **Business** dans https://developers.facebook.com/
2. Ajouter le produit **Facebook Login for Business** (et/ou **Instagram → Instagram API with Facebook Login**)
3. Dans **App Settings → Basic** : récupérer `App ID` et `App Secret`
4. Dans **Facebook Login → Settings** : ajouter dans **Valid OAuth Redirect URIs** :
   `https://streamnco.com/auth/instagram/callback` (et l'URL de preview Lovable si test depuis preview)
5. Dans **App Roles** : ajouter les utilisateurs testeurs (compte Instagram Business/Creator + Page Facebook liée requis)
6. Renseigner **Privacy Policy URL** : `/legal/privacy` et **Data Deletion** côté Streamnco
7. Ajouter dans **Lovable Cloud Secrets** :
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `META_REDIRECT_URI` (la même URL que ci-dessus)
   - `META_GRAPH_API_VERSION` (défaut `v21.0`)
   - `INSTAGRAM_OAUTH_ENABLED=true` (active le flow côté edge functions)
8. Côté frontend, mettre `VITE_INSTAGRAM_OAUTH_ENABLED=true` pour afficher le bouton Connecter Instagram
9. Tester le flow avec un compte testeur. Tant que l'App Review n'est pas validée, seuls les rôles déclarés dans la console peuvent compléter le flow.
10. Pour ouvrir à tous les utilisateurs : soumettre l'App Review pour `instagram_basic` + `instagram_content_publish` (+ `pages_show_list`, `business_management`), puis activer `INSTAGRAM_PUBLISH_ENABLED=true`.
