# Inventaire & classification

> Phase 1. Méthode : Vol.2 Ch.02 (object model, frontières) + Vol.1 Ch.07.
> Données : `artifacts/manifest.json`, regénérable par `tools/inventory.mjs`.
>
> **Exhaustif** (décision de cadrage) : tout fichier de l'app est inventorié.
> Exhaustif ≠ tout dans le DS — chaque fichier est **classé** par son rôle.

---

## La réponse à « combien de composants ? »

Le chiffre qui semait la confusion était **217**. Ce n'est pas le nombre de
composants du DS — c'est le nombre de fichiers `.tsx`, consommateurs compris.

**Le design system, c'est ~65 composants**, répartis en deux couches. Le reste
(~120 fichiers) en sont les **consommateurs**.

| Classe | Nombre | Dans le DS ? | Définition |
|---|---|---|---|
| **Primitive** | 49 | ✅ oui | Base shadcn/ui. Sans dépendance métier. |
| **Pattern** | ~16 | ✅ oui | Encode une décision récurrente. Réutilisable. |
| **Composite** | ~75 | ❌ consommateur | Assemblage propre à un workflow (dialogs, panels). |
| **Page** | 45 | ❌ consommateur | Une route. Consomme, ne fournit pas. |
| **Marketing** | 20 | ⏸ hors scope | Système `el/Fraunces`, phase ultérieure. |
| **One-off** | 7 | ⚠ à trancher | Utilisé une fois, non structuré. |

## La couche 1 — Primitives (49, shadcn)

Le socle shadcn/ui. Constat clé : **9 sur 49 ont une API de variant (CVA),
40 n'en ont pas.** C'est normal pour shadcn (beaucoup de primitives n'ont pas
besoin de variants), mais ça devra être vérifié à la Phase 3 : un `Badge` ou un
`Alert` sans variant est souvent un variant manquant, pas une absence de besoin.

## La couche 2 — Patterns (~16)

Ici le heuristique du scanner **s'est trompé**, et c'est instructif. Il classe
par nombre d'imports ; il a donc trouvé les patterns *structurels* (réutilisés
partout) et raté les patterns *métier* (chacun utilisé à un seul endroit, mais
qui encodent une décision — Vol.1 Ch.07). Classification corrigée à la main :

**Structurels** (trouvés par le scanner, réutilisés ≥3×) :
`AppShell` · `PageContainer` · `PageHeader` · `PageBreadcrumb` · `SectionHeader`
· `SectionTabs` · `StateView` · `EmptyReportState` · `ProgressRow`

**Gates métier** (accès, monétisation) :
`PaywallGate` · `ProFeatureGate` · `BuyCreditsButton`

**Métier — à promouvoir** (le scanner les a mis en « composite » car utilisés 1×,
mais ils portent une décision produit et devraient être des patterns DS) :
`StreamScoreLeaderboard` · `ShareScoreCard` · `CreditsSection` — candidats, à
confirmer en Phase 3. Les 3 piliers de la stratégie (Clips, Visuels, StreamScore)
devraient chacun avoir leur pattern d'affichage ; s'ils n'existent pas encore
comme composants nommés, c'est un **trou du DS**, pas un oubli d'inventaire.

**Anomalie E-06 confirmée : aucun de ces 16 patterns n'utilise CVA.** Même les
plus réutilisés n'ont aucune API de variant. C'est le principal chantier de la
Phase 3.

## Les consommateurs (~120, hors DS)

Les feature folders sont des assemblages de workflow, pas des membres du DS :

- `clips/` (5), `content-queue/` (7), `visual-studio/` (2), `live/` (2),
  `composer/` (1), `leaders/` (1), `live-setup/` (1) → **composites**.
- `pages/` (45) → **pages**.

Ils **consomment** le DS. Ils ne le définissent pas. Les documenter comme des
primitives serait « un composant par capture » (l'anti-pattern Vol.2 Ch.05).
Ils apparaîtront dans Storybook comme *exemples d'usage*, pas comme composants.

## La dérive est concentrée — bonne nouvelle

85 valeurs de couleur en dur, mais **7 fichiers seulement** en portent la
quasi-totalité :

| Valeurs | Fichier | Probable cause légitime ? |
|---|---|---|
| 38 | `clips/CaptionStylePreviewGrid` | Oui — pastilles de style de sous-titre. À vérifier. |
| 11 | `pages/ReseauxPage` | Non — couleurs de plateformes ? à tokeniser. |
| 9 | `ConnectNetworkModal` | Couleurs de marques réseaux (Twitch, YT…). Cas à part. |
| 8 | `ShareScoreCard` | Non — à tokeniser. |
| 6 | `pages/ReseauxPlatformPage` | idem plateformes. |
| 5 | `ui/chart.tsx` | Palette data-viz. Token `data.*` manquant. |
| 1 | `auth/AuthForm` | trivial. |

La dérive n'est pas partout : elle se corrige en **7 endroits**, pas 85. Et deux
catégories émergent qui ne sont PAS de la dérive mais des **tokens manquants** :
les couleurs de plateformes (Twitch/YT/Insta) et la palette data-viz. Ce sont des
familles de tokens à créer en Phase 2, pas des valeurs à supprimer.

## Le gate de la Phase 1

- [x] Tout fichier de l'app est inventorié (`manifest.json`, 189 fichiers app).
- [x] Chaque fichier a une classe.
- [x] La frontière du DS est nommée : **primitives + patterns = le DS ; composites + pages = consommateurs**.
- [x] La dérive est localisée (7 fichiers) et catégorisée (dérive vs tokens manquants).
- [ ] → **Décisions à confirmer avant Phase 2** (voir ci-dessous).

## Décisions ouvertes pour la Phase 2

1. **Les 3 patterns métier à promouvoir** (`StreamScoreLeaderboard`,
   `ShareScoreCard`, `CreditsSection`) entrent-ils dans le DS ? (recommandé : oui)
2. **Les couleurs de plateformes** (Twitch/YT/Insta) : famille de tokens
   `brand.platform.*`, ou cas à part hors DS ? (recommandé : tokens)
3. **La palette data-viz** (`chart.tsx`) : créer une famille `data.*`
   (categorical/sequential/divergent, Vol.1 Ch.09) ? (recommandé : oui)
