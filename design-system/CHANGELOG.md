# Journal des changements — Design System

Suivi en langage clair de tout ce qui change dans le chantier DS. Git donne le
détail exact (chaque ligne) ; ce fichier donne le **pourquoi**, lisible d'un
coup d'œil. Le plus récent en haut.

Pour le détail visuel fichier par fichier : la **Pull Request** de la branche
`design-system` sur GitHub (voir le lien dans la conversation), qui se met à
jour à chaque changement.

---

## 2026-07-18

### Phase 1 — Inventaire & classification
- Écrit un **scanner** (`tools/inventory.mjs`) qui recense les 189 fichiers de
  l'app et les classe. Re-jouable : il resservira à mesurer la dérive.
- Résultat : le DS = **~65 composants** (49 primitives + ~16 patterns), pas 217.
  Le reste sont des consommateurs.
- Constat : **aucun pattern n'a d'API de variant** ; la dérive couleur (85
  valeurs) est concentrée sur **7 fichiers**.
- Fichiers : `01-inventory.md`, `artifacts/manifest.json`.

### Phase 0 — Cadrage & preuves
- Écrit l'**audit** : le problème n'est pas esthétique, c'est l'absence de
  source de vérité partagée. Diagnostic chiffré, non-objectifs, décisions.
- Fichiers : `00-audit.md`, `README.md`.

### Décisions validées (Sacha, 2026-07-18)
- **Branche** : travail sur `design-system`, isolé des édits Lovable.
- **Systèmes** : app uniquement (dark+lime) ; le marketing `el/Fraunces` hors
  scope pour l'instant.
- **Périmètre** : exhaustif, mais chaque fichier classé par rôle.
- **Patterns métier** (`StreamScoreLeaderboard`, `ShareScoreCard`,
  `CreditsSection`) → **entrent dans le DS**.
- **Couleurs de plateformes** (Twitch/YT/Insta) → famille de tokens
  `brand.platform.*`, pas de valeurs en dur.
- **Palette data-viz** → famille de tokens `data.*`
  (categorical / sequential / divergent).

### Phase 2 — Consolidation des tokens (partie documentaire)
- Trouvé : le système de tokens est bon mais **plat** — il manque la couche
  primitive (`--primary` porte la valeur brute au lieu d'un alias).
- Écrit `artifacts/tokens.json` : les tokens réels réorganisés en **3 couches**
  (36 primitives, 20 sémantiques), **sans changer une seule valeur**.
- Décidé et documenté 2 familles manquantes (9 tokens `proposed`) :
  `brand.platform.*` (YouTube/Insta/TikTok/X) et `data.*` (data-viz).
- Reste à faire (touche le code, étape prudente) : câbler `index.css` sur les
  primitives + résorber les 7 poches de dérive.
- Fichiers : `02-tokens.md`, `artifacts/tokens.json`.

### Phase 2 — Fondation tokens (touche le code, invisible)
- `index.css` : ajout de la **couche primitive** (lime, teal, statuts) +
  familles `platform.*` et `data.*`. Chaque valeur chromatique partagée est
  désormais un alias vers sa primitive (le lime : 9 aliases → 1 source).
- `tailwind.config.ts` : câblage des classes `platform.*` et `data.*`.
- **Prouvé à valeur constante** : 22 tokens résolus, 0 divergence → aucun
  changement visuel. La couche primitive est de la plomberie, pas du design.
- Le `vite build` échoue sur un package Lovable non installé localement
  (`@lovable.dev/mcp-js`) — pré-existant, identique sur main, hors de mon
  périmètre. Le CSS lui-même compile (vérifié via Tailwind CLI).
- Thermomètre encore à 85 : la résorption de la dérive est l'étape suivante.

### Phase 2 — Résorption de la dérive
- Découverte clé : **tout n'était pas de la dérive.** Sur 85 valeurs en dur, la
  moitié sont des **littéraux légitimes** (styles de sous-titre = données, carte
  export html-to-image, sélecteurs Recharts, logo Google).
- **Résorbé les ~22 vraies dérives** : couleurs de plateformes (Twitch/YouTube/
  Instagram) → classes `text-platform-*`, `bg-platform-*`. Valeur constante.
- Corrigé la primitive Instagram (était approximative) au hex exact.
- Le thermomètre `inventory.mjs` distingue maintenant **dérive vraie vs littéraux
  légitimes** (allowlist documentée). Compteur : 85 brut → 63 brut, **vraie
  dérive app : 4** (la fonction score-tier de ReseauxPage, différée — 1 décision).
- Fichiers : `ReseauxPage`, `ConnectNetworkModal`, `ReseauxPlatformPage`,
  `index.css`, `tailwind.config.ts`, `tools/inventory.mjs`, `02-tokens.md`.

### Phase 2 — Conformité Ch.08 (générateur de tokens)
- Question de Sacha : ai-je bien suivi le Ch.08 ? Non, pas le pipeline. Corrigé.
- **`tools/tokens.mjs`** : génère `tokens.json` DEPUIS `index.css` (inversion —
  Lovable possède index.css, on ne peut pas le générer, donc on génère le JSON).
  → une seule source de vérité (Step 1), `tokens.json` ne peut plus diverger.
- **Validation** intégrée : aliases cassés, cycles, orphelins (Step 2).
- **Test du gate** vérifié (Step 4) : bouger `--lime-brand` déplace 5 aliases.
- **Gouvernance** écrite : table patch/minor/major + règle « index.css édité,
  tokens.json régénéré » (Step 5).
- `tokens.json` régénéré : structure fidèle au CSS réel (descriptions tirées des
  commentaires), remplace la version écrite à la main qui pouvait diverger.

### Fondations Ch.07 — l'artefact manquant
- Question de Sacha : a-t-on respecté le Ch.07 (l'ordre de construction, les
  3 patterns métier) ? Honnêtement, non — j'avais sauté aux tokens.
- Écrit `03-foundations.md` : l'ordre de construction en 10 étages avec le statut
  de chacun. On a fait 3-4 (tokens) et 10 (gouvernance), sauté 1 (principes),
  2 (grille), 5 (typo).
- **Principes de marque extraits du VRAI produit** (5 principes, chacun sourcé).
- **Les 3 patterns métier nommés** (le critère de sortie) : `GenerationJob`,
  `ScoreDisplay`, `AccessGate` — avec l'état réel de chacun. Ma liste de Phase 1
  était des instances, pas des patterns.
- Découverte : mon exemple Streamnco dans le handbook (« score bas jamais rouge »)
  CONTREDIT le vrai code (`streamScoreTier.ts` : low→red). Le produit fait foi ;
  l'exemple était pédagogique. Exactement pourquoi le Ch.07 met les principes en
  étage 1 : les extraire, pas les supposer.
- Reste à fermer avant les specs composant (Phase 3) : étages 2 et 5.

### Étages 2 & 5 fermés — grille + typographie (04-type-grid.md)
- Extraits du VRAI usage du code, pas décidés dans le vide.
- Typo : l'app utilise 2 familles (Instrument Sans + JetBrains Mono). `display`
  == `sans` (même font). **Boogaloo (`font-brand`) est morte dans l'app.**
  Corps de lecture par défaut = **14px** (1057 usages xs/sm vs 51 base) : produit
  dense assumé. Styles de texte nommés par rôle.
- Grille : les breakpoints réels sont **3** (sm/md/lg) — xl/2xl quasi inutilisés.
  Mobile-first, grille canonique `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`,
  container max 1400px.
- Fondations Ch.07 complètes (étages 1-5 + 10). Reste 6-7-8 = Phase 3.

### Décisions P4 + Boogaloo appliquées
- **P4 (rouge score-tier) tranché : aligné sur `--destructive`.** Le service
  `streamScoreTier.ts` l'utilisait déjà ; seul le `ScoreRing` inline de
  `ReseauxPage` divergeait (hex bruts) — passé sur tokens (`hsl(var(--primary))`,
  `--success`, `--warning`, `--destructive`, `--border`). **Dérive app = 0** ;
  les 7 valeurs restantes sont 100% marketing (hors scope).
- **Boogaloo retirée** : de la config Tailwind (`font-brand`, 0 usage), de
  l'import de fonts (plus téléchargée), commentaire périmé corrigé.
- Fondations Ch.07 : les 2 décisions ouvertes sont closes.

### Phase 3 — les 3 patterns métier spécifiés (étage 8 du Ch.07)
- Format de spec posé (`05-components.md`) : un composant est une API avant un
  dessin, avec un bloc INVALIDE qui encode la décision. Une spec sert le designer
  ET l'agent MCP.
- **3 specs écrites, ancrées dans le vrai code** (`specs/`) :
  - `ScoreDisplay` : logique déjà centralisée (`streamScoreTier`), visuel dupliqué
    ×7. Décision : un score porte toujours son palier ; locked → neutre, jamais
    un palier.
  - `GenerationJob` : éparpillé ×2, l'état **partiel** manque (le trou prédit).
    Décision : une génération est un objet visible/annulable/repris ; partiel =
    résultat, pas erreur ; retry = les échecs seulement.
  - `AccessGate` : déjà 3 variantes + analytics ; `ProFeatureGate` à fusionner.
    Décision : jamais de cul-de-sac, toujours un chemin d'upgrade, toujours mesuré.
- L'implémentation (unifier les composants) est une étape séparée, après
  validation des specs.

### Catalogue des composants (étages 6-7 du Ch.07)
- `06-catalog.md` GÉNÉRÉ depuis le manifeste (comme tokens.json — reste vrai à
  chaque régénération). `tools/catalog.mjs`.
- Répond à « combien de composants, comment construits » : 49 primitives shadcn,
  88 composites/patterns (consommateurs), 7 one-offs.
- Trous chiffrés : **40/49 primitives sans API de variant** ; **20 sans import
  direct détecté** (le scaffold shadcn en livre 49, ~29 utilisés) — candidates au
  ménage, à vérifier ; 1 personnalisée (`chart`).

### Phase 4 — Storybook = la source de vérité visuelle
- Storybook 10 (react-vite) installé, configuré **isolé du plugin Lovable**
  (viteFinal retire component-tagger + MCP Supabase). Tokens branchés via index.css,
  fond sombre par défaut (comme l'app).
- Stories : **Tokens** (générée en parcourant tokens.json — toujours vraie, 18
  primitives + sémantiques + composant en swatches), **ScoreDisplay** (ScoreCard
  aux 4 paliers, dont le rouge P4, avec contrôles interactifs), **Button** (variants).
- Addon a11y + docs gardés ; addon-vitest retiré (il restructurait vitest.config
  et cassait les tests) → config de test restaurée, les 12 tests repassent.
- `npm install` a synchronisé node_modules sans toucher au lockfile ; l'app build.

### Phase 4 — preview enrichi (via `storybook ai setup`)
- `npx storybook ai setup` génère un prompt de config — suivi dans son intention.
- Preview partagé : providers SANS effet de bord (QueryClient, Router, Tooltip)
  + racines de portail. Pas de MSW/Auth : les stories du DS sont présentationnelles,
  pas des pages connectées (les pages sont des consommateurs, pas le DS).
- **Toggle de thème clair/sombre** dans la barre d'outils — voir chaque composant
  dans les deux thèmes (la marque reste, les surfaces flippent : P2/P3).
- Story `Badge` ajoutée (6 variants dont success/warning custom). Zéro dépendance
  ajoutée ; les 12 tests repassent.
