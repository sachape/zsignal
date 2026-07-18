# Catalogue des composants (étages 6-7)

> GÉNÉRÉ par `design-system/tools/catalog.mjs` depuis le manifeste — NE PAS
> ÉDITER À LA MAIN. Régénérer : `node design-system/tools/inventory.mjs && node design-system/tools/catalog.mjs`.
>
> Répond à *combien de composants, comment sont-ils construits* (Vol.1 Ch.07).

## En un coup d'œil

- **49 primitives** (shadcn/ui). Le socle.
- **88 composites + patterns**, groupés par feature. Des **consommateurs** du DS.
- **7 one-offs** (montés directement, non réutilisés).

### Les trous (E-06 de l'audit)

- **40/49 primitives sans API de variant** (pas de CVA).
  Normal pour beaucoup (un `Separator` n'a pas de variant) — mais à vérifier pour
  `Badge`, `Alert`, etc. où un variant manque souvent.
- **20 primitives sans import direct détecté** — le scaffold shadcn
  en livre 49, l'app en utilise ~29. Candidates
  au retrait, **à vérifier** avant (la détection est par chemin, elle peut rater un
  ré-export) :
  `alert`, `aspect-ratio`, `breadcrumb`, `carousel`, `chart`, `collapsible`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `radio-group`, `resizable`, `scroll-area`, `table`, `toaster`, `toggle-group`.
- **1 primitives personnalisées** (contiennent des valeurs en dur) :
  `chart`.

## Primitives (shadcn/ui)

| Composant | API variant | Importé par | Lignes | Signal |
|---|---|---|---|---|
| `accordion` | — | 1 | 53 | — |
| `alert` | ✅ | 0 | 44 | mort |
| `alert-dialog` | — | 2 | 105 | — |
| `aspect-ratio` | — | 0 | 6 | mort |
| `avatar` | — | 9 | 39 | — |
| `badge` | ✅ | 43 | 43 | — |
| `breadcrumb` | — | 0 | 91 | mort |
| `button` | ✅ | 82 | 54 | — |
| `calendar` | — | 1 | 58 | — |
| `card` | — | 66 | 44 | — |
| `carousel` | — | 0 | 225 | mort |
| `chart` | — | 0 | 304 | mort, personnalisé |
| `checkbox` | — | 2 | 27 | — |
| `collapsible` | — | 0 | 10 | mort |
| `command` | — | 3 | 133 | — |
| `context-menu` | — | 0 | 179 | mort |
| `dialog` | — | 15 | 96 | — |
| `drawer` | — | 0 | 88 | mort |
| `dropdown-menu` | — | 2 | 198 | — |
| `empty-state` | — | 2 | 73 | — |
| `form` | — | 0 | 130 | mort |
| `hover-card` | — | 0 | 28 | mort |
| `input` | — | 20 | 23 | — |
| `input-otp` | — | 0 | 62 | mort |
| `label` | ✅ | 18 | 18 | — |
| `menubar` | — | 0 | 208 | mort |
| `navigation-menu` | ✅ | 0 | 121 | mort |
| `pagination` | — | 0 | 82 | mort |
| `popover` | — | 5 | 30 | — |
| `progress` | — | 1 | 27 | — |
| `radio-group` | — | 0 | 37 | mort |
| `resizable` | — | 0 | 38 | mort |
| `scroll-area` | — | 0 | 39 | mort |
| `select` | — | 7 | 144 | — |
| `separator` | — | 1 | 21 | — |
| `sheet` | ✅ | 2 | 108 | — |
| `sidebar` | ✅ | 2 | 638 | — |
| `skeleton` | — | 2 | 8 | — |
| `slider` | — | 1 | 24 | — |
| `sonner` | — | 2 | 28 | — |
| `switch` | — | 2 | 28 | — |
| `table` | — | 0 | 73 | mort |
| `tabs` | — | 2 | 54 | — |
| `textarea` | — | 9 | 22 | — |
| `toast` | ✅ | 2 | 112 | — |
| `toaster` | — | 0 | 25 | mort |
| `toggle` | ✅ | 1 | 40 | — |
| `toggle-group` | — | 0 | 50 | mort |
| `tooltip` | — | 2 | 29 | — |

## Composites & patterns (consommateurs, par feature)

Ces composants **consomment** le DS ; ils n'en sont pas membres. Ils apparaîtront
dans Storybook comme *exemples d'usage*, pas comme composants du système.

| Feature | Nb | Composants |
|---|---|---|
| `(racine)/` | 67 | AccountMenu, ActivationChecklist, AnalysisStep, AppShell, AppSidebar, CommandPalette, CompetitorCard, CompetitorFeedbackBar, CompetitorTrendChart, ConnectNetworkModal, CreateNowBlock, DashboardNavCards, DashboardQuickActions, DimensionResources, EmptyReportState, EventSubCockpitSection, FoundationModeBanner, InactivityRelanceCard, LastVsAverageCard, LivePostGenerator, LiveStatusCard, LiveTimeline, LockedOverlay, MainBlockerCard, NavLink, NetworksTeaser, NextMilestoneCard, NicheChooser, OnboardingGuide, OpportunityCard, PageBreadcrumb, PageContainer, PageHeader, PaywallGate, PlatformValidationNotice, PlaybookCard, PreLiveChecklistCard, ProFeatureGate, ProgressRow, PublishClipDialog, QualitativeScoreCard, RecommendationCard, ScopeDriftBanner, ScoreCard, ScoreInsightCard, SectionHeader, SectionTabs, ShareScoreButton, ShareScoreCard, SidebarQuotaWidget, SidebarStreamerSearch, SmartAlertsCard, SocialPublishingSection, StatBlock, StateView, StreakBadge, StreamScoreEvolutionCard, StreamerBenchmarkCard, StreamerDNACard, SyncStatusCard, ThemeToggle, TrustCard, ValueCard, WeeklyDigestCard, WeeklyMilestoneCard, WeeklyQuestCard, WeeklySequenceCard |
| `content-queue/` | 7 | AfterPublishPanel, ClipGenerationDialog, ClipPreparationPanel, ManualMediaUploadDialog, ManualPublishPanel, NewContentDialog, YouTubeUploadDialog |
| `clips/` | 4 | CameraPlacementEditor, CaptionStylePreviewGrid, ManualFacecamPlacer, RenderCroppedSourceImage |
| `credits/` | 2 | BuyCreditsButton, CreditsSection |
| `live/` | 2 | AssistedDebriefPanel, AutoClipCandidatesPanel |
| `visual-studio/` | 2 | VisualGenerationDialog, VisualPlacementPreview |
| `auth/` | 1 | AuthForm |
| `composer/` | 1 | InstagramPreview |
| `leaders/` | 1 | StreamScoreLeaderboard |
| `live-setup/` | 1 | SuggestedTitles |

## Ce que ça dit pour la suite

- Les primitives sans variant ni usage sont le premier ménage (retrait ou API).
- Les composites restent des consommateurs — on ne les spécifie pas ; on documente
  les **patterns** qu'ils devraient réutiliser (voir `specs/`).
- Storybook (Phase 4) montrera les primitives + les 3 patterns, pas les 88
  composites de feature.
