
# Packaging UX Streamnco — plan d'exécution

## Audit express (constats avant action)

| Zone | Constat | Action |
|---|---|---|
| **Sidebar** | 9 entrées plates, "Content Studio" + "Clips réseaux" + "Studio visuel" côte à côte = confusion | Regrouper sous 3 sections : Créer / Analyser / Live |
| **Dashboard** | `DashboardQuickActions` existe mais noie les 2 features "wow" | Ajouter bloc premium "Créer maintenant" en haut, 2 CTA clairs |
| **Clips réseaux** | URL clair (`/clips-reseaux`), wording OK, mais empty state à premiumiser | Empty state + quota visible (déjà OK) |
| **Studio visuel** | OK fonctionnellement, empty state à enrichir | Empty state premium |
| **Content Studio (queue)** | Label ambigu vs Clips réseaux | Renommer "File de contenu" + sous-titre explicatif, empty state clarifié |
| **Live Studio / Planning / Titres** | Bien isolés mais éparpillés dans la nav | Regrouper sous "Live" |
| **Analyse / StreamScore / Benchmark / Progression** | 4 entrées éparses | Regrouper sous "Analyser" |
| **Réseaux** | YouTube stable, Instagram/TikTok présentés comme égaux | Badge "Bêta" sur IG/TikTok |
| **Billing** | Quotas OK, CTA cohérents (vérifié dans QA précédente) | Aucun changement |
| **Wording technique** | "job", "processing", "generated_visuals" dans les empty states | Remplacer par "génération", "en cours", "visuels" |

Aucune feature supprimée. Aucune route déplacée (pas de redirections à gérer).

## Architecture navigation appliquée

Nav nested avec groupes `SidebarGroup` collapsibles, état actif persistant. Routes inchangées.

```text
Tableau de bord                 → /dashboard

Créer
  ├─ Clips réseaux              → /clips-reseaux
  ├─ Studio visuel              → /studio-visuel
  └─ File de contenu            → /content-queue

Analyser
  ├─ StreamScore                → /analyse
  ├─ Benchmark                  → /competitors
  └─ Progression                → /progression

Live
  ├─ Live Studio                → /live-setup
  ├─ Planning                   → /planning
  └─ Titres                     → /outils/titres

Réseaux                         → /reseaux
Ressources                      → /playbooks
```

"Créer" est ouvert par défaut (priorité produit). Footer inchangé (Progression XP, upgrade CTA, account popover).

## Changements ciblés

### 1. `src/components/AppSidebar.tsx`
- Refactor `primaryItems` en `navGroups` (4 groupes).
- Utiliser `SidebarGroup` + `SidebarGroupLabel` (groupe "Créer" `defaultOpen`).
- Reste du fichier (header, footer XP, popover) intact.

### 2. `src/pages/DashboardPage.tsx` + `src/components/DashboardQuickActions.tsx` (ou nouveau `CreateNowBlock.tsx`)
- Nouveau composant `CreateNowBlock` placé en tête du dashboard :
  - Titre "Créer maintenant" + sous-titre.
  - 2 cards larges : "Créer un clip réseau" → `/clips-reseaux`, "Générer un visuel" → `/studio-visuel`.
  - Style premium : gradient subtil, icônes Clapperboard + Palette, hover lift.
- Les quick actions existantes restent en dessous mais en version secondaire.

### 3. Empty states premium
Fichiers ciblés (vérification puis remplacement du copy + visuel) :
- `src/pages/ClipsReseauxPage.tsx`
- `src/pages/VisualStudioPage.tsx`
- `src/pages/ContentQueuePage.tsx`
- `src/pages/ReseauxPage.tsx`

Composant partagé léger `src/components/ui/empty-state.tsx` (nouveau, ~40 lignes) : icône, titre, description, CTA primaire. Réutilisé sur les 4 pages.

### 4. Badges Bêta réseaux
- `src/pages/ReseauxPage.tsx` + `src/pages/ReseauxPlatformPage.tsx` : badge `<Badge variant="outline">Bêta</Badge>` à côté de "Instagram" et "TikTok". Note courte "Publication automatique en validation API".
- YouTube : pas de badge (stable).

### 5. Wording harmonisé
- "Content Studio" → "File de contenu" (label sidebar) ; route inchangée.
- Empty/erreur copy : remplacer "job", "processing brut", "generated_visuals", "quota_exceeded" par "génération", "en cours", "visuels", "limite mensuelle atteinte".
- Cibles principales : empty states + messages d'erreur des 4 pages ci-dessus. Pas de chasse globale (risque de casser des libellés internes).

## Hors scope

- Pas d'onboarding refondu (section 5 du brief) — le `OnboardingGuide` existant reste tel quel ; un audit fin mériterait son propre passage dédié.
- Pas de textes landing (section 9) — la landing n'est pas en context, à traiter séparément si demandé.
- Pas de refonte design tokens.
- Pas de changement de route (aucune redirection à gérer).

## Tests

1. Navigation : cliquer chaque entrée des 4 groupes, vérifier route + état actif.
2. Dashboard : cliquer les 2 CTA "Créer maintenant" → routes attendues.
3. Empty states : forcer état vide (compte sans visuels/clips) et inspecter visuel.
4. Réseaux : vérifier badge Bêta sur IG/TikTok.
5. Billing : déjà validé en QA précédente (Free/Pro/Growth), pas de retest.
6. Responsive : sidebar collapsible="icon" déjà fonctionnel, vérifier que les groupes restent utilisables en mobile (Sheet).

Build + TypeScript : vérifiés automatiquement après les edits.

## Risques

- **Faible** : refactor sidebar peut casser le highlight actif si `matchSection` mal porté → conserver `matchSection` sur chaque item.
- **Faible** : nouveau `CreateNowBlock` peut allonger le dashboard sur mobile → grid responsive `md:grid-cols-2`.
- **Nul** : aucune migration DB, aucune edge function modifiée.

## Livrables

~6 fichiers édités, 2 fichiers créés (`CreateNowBlock.tsx`, `empty-state.tsx`). Zéro migration, zéro changement backend.
