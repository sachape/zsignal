# Pivot Streamnco — Audit + plan en 2 passes

## 1. Audit de l'existant

### Plans & pricing
- `src/lib/planAccess.ts` : hiérarchie `free < pro < growth < agency` (utilisée partout pour les paywalls). **À conserver côté backend** pour ne pas casser les users existants.
- `src/lib/quotas.ts` : quotas mensuels clips/visuels par plan (`free 3/1`, `pro 50/10`, `growth 150/40`, `agency 1000/600`) — encore utilisé côté frontend ET backend (edge functions).
- `src/pages/PricingPage.tsx` (606 lignes) : 4 colonnes Free/Pro/Growth/Agency, tableau détaillé avec sections **Publication**, **Réseaux connectés**, **Publications directes/mois**, **Instagram/YouTube/TikTok/X**.
- `src/pages/BillingPage.tsx` (394 lignes) : gère Stripe subscription + StreamCoins.

### StreamCoins
- Packs en DB : `pack_1200` (12€), `pack_3000` (27€), `pack_7000` (59€), `pack_16000` (129€) — **tous `is_active = false` et `stripe_price_id = NULL`**. Structure prête, ventes désactivées.
- `FEATURE_FLAGS.PAYG_CREDITS_ENABLED` (env `VITE_PAYG_CREDITS_ENABLED`, défaut `false`) gate l'UI d'achat.
- Coûts fixés côté front + back : `visual = 120`, `clip = 350`.
- RPC `consume_generation_credit`, ledger `creator_credit_ledger`, refund idempotent : **tout fonctionne**.

### Génération (edge functions)
- `visual-job-create` et `clip-job-create` font aujourd'hui : **quota mensuel d'abord, StreamCoins en fallback**. C'est l'inverse du modèle cible.
- Refund automatique sur job failed : OK.

### Zernio / publication
- `zernio-list-accounts` appelé uniquement depuis `src/hooks/useSocialPublishing.ts` (page Réseaux). **Aucun appel global** — le patch précédent l'a déjà isolé.
- Pages `ReseauxPage`, `PublicationsPage`, `InstagramCallbackPage`, `TikTokCallbackPage`, `YouTubeCallbackPage` toujours présentes.

### Sidebar produit
- `AppSidebar.tsx` : nav produit + lien /billing.
- `SidebarQuotaWidget.tsx` : affiche encore "X visuels / Y clips restants ce mois-ci" avec `PLAN_LABEL` incluant Growth/Agency.

### Stripe
- Subs actives : `STRIPE_PRICE_PRO_MONTHLY/ANNUAL`, `STRIPE_PRICE_GROWTH_MONTHLY/ANNUAL` (secrets présents). Agency non-secret → probablement contact-sales.
- Packs StreamCoins : **aucun `stripe_price_id`** en DB.

---

## 2. Stratégie : 2 passes séparées

### Passe 1 — Pivot visible (cette PR)
Zéro changement backend / Stripe / logique génération. On rend le produit lisible immédiatement.

**Marketing**
- `PricingPage.tsx` : réécrire complètement avec 2 offres.
  - **À la carte** — "Gratuit pour commencer" — inclut compte gratuit, diagnostic Twitch, achat StreamCoins à la demande, génération clips/visuels via StreamCoins, téléchargement. CTA `/auth`.
  - **Pro** — 9,99€/mois ou 99,90€/an ("2 mois offerts") — inclut tout À la carte + StreamScore complet, débriefs, historique lives, calendrier optimal, benchmark, classements, playbooks, recommandations, suivi progression, **bonus +20% StreamCoins** (mention "bientôt" si Passe 2 pas finie). CTA `/auth?plan=pro`.
  - Section StreamCoins packs (affichage marketing, prix + estimations visuels/clips).
  - Section FAQ mise à jour (les 6 Q/R demandées).
- Supprimer du pricing public : colonnes Growth/Agency, groupes "Publication" + tout ce qui parle Instagram/TikTok/YouTube/multi-réseaux/publications directes.
- Header marketing (`SiteNav`) : simplifier — Créer / Progresser / Tarifs. Vérifier hero de `Index.tsx`.
- `FeaturesPage`, `SolutionsPage` : passer en revue et retirer les promesses publication.

**Produit**
- `SidebarQuotaWidget.tsx` : remplacer l'affichage "quotas restants" par une carte **StreamCoins** (solde + CTA "Recharger" qui ouvre la modale `CreationCapacityDialog` existante, ou tag "Solde faible" en dessous d'un seuil).
- `AppSidebar.tsx` : masquer l'entrée "Réseaux" de la nav principale (garder la route accessible pour compat).
- Gating Pro : les pages Benchmark / Classements / Playbooks / Calendrier optimal / Débriefs / Historique lives affichent une **preview premium + CTA "Passer Pro" → /billing** pour un user non-Pro. Ne pas casser l'accès Growth/Agency existants (utiliser `hasPlanAtLeast(plan, "pro")`).
- `BillingPage.tsx` : cacher les tiers Growth/Agency en achat (garder l'affichage si l'user en a déjà un actif — traité comme ≥ Pro).

**Legacy**
- `planAccess.ts`, `quotas.ts`, `useSubscription.ts` : **inchangés**. Les tiers Growth/Agency restent dans les types pour compat.
- Users Growth/Agency existants : traités comme Pro+ (déjà le cas via `hasPlanAtLeast`).

**Bonus Pro +20% StreamCoins**
- **Passe 1 : préparation UI uniquement.** Afficher "Bonus Pro : +20% sur chaque recharge" dans le pricing et la modale de recharge. Ne PAS activer le calcul côté webhook.
- Signaler clairement à l'user que le bonus est visible mais pas encore débité côté Stripe.

### Passe 2 — Backend (PR suivante, à valider)
Ce qui reste à faire, listé pour être fait dans une seconde passe dédiée :

1. **Inverser la logique génération** : `visual-job-create` et `clip-job-create` → checker StreamCoins d'abord, quota mensuel en compat legacy uniquement (ou déprécié).
2. **Activer les packs Stripe** : créer les 4 prices Stripe StreamCoins, remplir `credit_packages.stripe_price_id`, flipper `is_active = true`, `VITE_PAYG_CREDITS_ENABLED=true`.
3. **Bonus Pro +20%** : dans le webhook `stripe-webhook` handler `credit_pack.paid`, si l'user a une subscription Pro active → créditer `credits * 1.2` au lieu de `credits`. Loguer clairement l'origine du bonus dans `creator_credit_ledger.metadata`.
4. Nettoyer/dépréquer les quotas mensuels si plus utilisés.

---

## 3. Fichiers touchés (Passe 1)

**Écriture**
- `src/pages/PricingPage.tsx` — refonte complète 2 tiers
- `src/components/SidebarQuotaWidget.tsx` — refonte carte StreamCoins
- `src/components/CreationCapacityDialog.tsx` — ajout section "Bonus Pro" (préparé, pas actif)
- `src/pages/BillingPage.tsx` — masquer upgrade Growth/Agency, ajouter mention bonus Pro
- `src/components/AppSidebar.tsx` — masquer entrée Réseaux
- Pages avancées (Benchmark, Classements, Playbooks, Calendrier, Débriefs, Historique lives) — wrapper preview + CTA Pro pour non-Pro

**Lecture uniquement (inchangés)**
- `src/lib/planAccess.ts`, `src/lib/quotas.ts`, `src/lib/credits.ts`
- `src/hooks/usePlan.ts`, `src/hooks/useSubscription.ts`, `src/hooks/useCreditPackages.ts`
- `supabase/functions/**` (aucune modif)
- `supabase/functions/stripe-webhook` (aucune modif — bonus +20% en Passe 2)

---

## 4. Risques et non-régressions

- **Stripe** : aucun secret touché, aucun webhook touché. Users Pro/Growth/Agency existants → `usePlan` continue de retourner leur vraie tier via `subscriptions`.
- **StreamCoins** : ledger + RPC + refund inchangés.
- **Génération clips/visuels** : logique quota→credits inchangée en Passe 1 (l'inversion arrive en Passe 2).
- **StreamScore** : inchangé, juste gating "complet" derrière Pro côté affichage.
- **Studio visuel** : accessible avec solde StreamCoins comme aujourd'hui.
- **/billing** : reste la seule page qui déclenche du Stripe. Aucun CTA public direct vers Stripe.
- Zernio : déjà safe (uniquement page Réseaux), on masque juste la nav.

---

## 5. Rapport de fin de Passe 1

À la livraison je te fournirai :
- diff des fichiers modifiés
- capture mentale du nouveau `/pricing` (2 tiers + packs + FAQ)
- confirmation sidebar montre StreamCoins (plus de quotas mensuels)
- liste des pages désormais gated Pro
- ce qui reste précisément pour la Passe 2 (backend + Stripe prices + bonus webhook)
- TypeScript OK + build OK

Est-ce que je pars sur cette Passe 1, ou tu veux ajuster le scope avant ?
