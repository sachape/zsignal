# Montée en gamme visuelle marketing Streamnco

Objectif : passer le site marketing à un rendu premium (Stripe / Linear / Framer-like), sans casser le produit interne ni le backend.

## Périmètre

**Touché (marketing uniquement) :**
- `LandingNav` + nouveau composant `MarketingDropdown`
- `index.css` + `tailwind.config.ts` (font Instrument Sans, tokens)
- `index.html` (préconnexion Google Fonts)
- Pages : `Index`, `FeaturesPage`, `SolutionsPage`, `PricingPage`
- Sections landing : `HeroSection`, `WowFeaturesSection`, `PricingSection`, `FaqSection`, `FinalCtaSection`, `primitives.tsx`
- Footer marketing si nécessaire

**Non touché :**
- App produit interne (`AppShell`, dashboard, studio, clips, etc.)
- Backend / edge functions / RLS
- `BillingPage` (réservé au produit)
- Logique métier, quotas, données

## 1. Typographie — Instrument Sans

- Import via Google Fonts dans `index.css` (poids 400/500/600/700) + preconnect dans `index.html`
- Ajout `font-sans` = Instrument Sans dans `tailwind.config.ts` (fallback system)
- `body` reste sur `font-sans` global → l'app produit héritera aussi, mais c'est cohérent (une seule famille = simple). Boogaloo (`font-display`) reste pour les titres uniquement si déjà utilisé — à arbitrer : on garde `font-display` actuel pour ne pas casser l'identité Streamnco, on remplace seulement la sans
- Vérif fallback + aucun conflit

## 2. Header marketing (`LandingNav`)

Refonte du composant :
- Liens principaux : `Fonctionnalités` (dropdown), `Solutions` (dropdown), `Tarifs` → `/pricing`, `Articles`, `À propos`
- Dropdowns premium desktop (Radix `NavigationMenu` ou popover custom) :
  - **Fonctionnalités** : 6 entrées (Clips réseaux, Studio visuel, File de contenu, StreamScore, Benchmark, Live Studio) avec icône + description courte, chacune pointant `/fonctionnalites#<anchor>`
  - **Solutions** : 5 personas vers `/solutions#<anchor>`
- Mobile : accordéons dans le drawer
- CTA principal : `Essayer gratuitement` → `/auth` (ou `/dashboard` si user)
- A11y : focus visible, navigation clavier, `aria-expanded`, fermeture Escape
- ⚠️ Bug détecté dans le code actuel : `link.anchor` référencé mais pas dans le type des `NAV_LINKS` → à supprimer

Vérif : aucun lien vers `/billing` depuis le marketing.

## 3. Direction artistique — alternance + profondeur

`primitives.tsx` étendu avec :
- Variante `SectionShell` `tone="dark" | "light" | "gradient"` pour alterner backgrounds
- Variante `glow` + `grid` déjà présents, on ajoute halos colorés + transitions douces entre sections (mask gradients en haut/bas)
- Nouveaux helpers : `FloatingCard` (légère animation float CSS), `GlassPanel`

Alternance home : Hero dark → SocialProof neutre → WowFeatures gradient → Audience clair → HowItWorks dark → Demo gradient → Pricing neutre → FAQ clair → FinalCTA dark.

## 4. Hero

Refonte `HeroSection` :
- Badge + titre + sous-titre conformes au brief
- Composition visuelle droite : mockups UI stylisés (pas de screenshots) en flottement subtil :
  - Card StreamScore (gauge + dimensions)
  - Preview clip vertical 9:16 (facecam haut / gameplay bas, sous-titre)
  - 3 cards Studio visuel (banner / story / post)
  - Mini file de contenu
- Animations `hero-float` déjà dispo, durées décalées
- `prefers-reduced-motion` respecté
- Responsive : mockups stack sur mobile

## 5. Sections premium

- `WowFeaturesSection` : avant/après pour clips, 3 variantes pour Studio visuel, tags visibles
- Nouvelle section StreamScore visuelle (score card + dimensions + recommandation)
- Section File de contenu (kanban léger)
- `PricingSection` + `PricingPage` : cards plus haut de gamme, Growth mis en avant, quotas lisibles
- `FaqSection` : accordéons premium, espacement éditorial

## 6. Pages Features / Solutions

- Garder structure pilier / persona et ancres existantes (`scroll-mt-24`)
- Améliorer cards : gradient borders subtils, icônes plus marquées, mini-mockups par pilier
- Alternance backgrounds entre piliers
- Respect des anchors : `#clips-reseaux`, `#studio-visuel`, `#file-de-contenu`, `#streamscore`, `#benchmark`, `#live-studio`, `#debutant`, `#regulier`, `#recycle`, `#image`, `#ambitieux`

## 7. Vérifications finales

- TypeScript clean
- Build OK (harness)
- Routes : `/pricing` public, `/billing` non lié depuis marketing
- Anchors testées via preview
- Responsive desktop + mobile (988 et < 768)
- Pas d'overflow horizontal

## Risques / arbitrages

- **Font globale** : Instrument Sans s'appliquera aussi à l'app produit (design system partagé). Acceptable et cohérent, mais signalé.
- **Boogaloo** (`font-display` actuel sur titres) : je le conserve sur l'app produit, mais sur le marketing j'utilise Instrument Sans en headings pour un rendu plus premium/éditorial. À confirmer si tu veux Instrument Sans aussi sur les headings produit.
- **Pas de génération d'images** : tous les visuels sont des mockups UI faits en CSS/SVG (plus rapide, responsive, pas de poids supplémentaire).
- **Périmètre volumineux** : je livre en une passe cohérente, sans toucher au backend ni à l'app produit. Si tu préfères découper (header d'abord, puis hero, puis sections), dis-le avant que je commence.

## Confirmation

Avant d'attaquer, j'aimerais que tu confirmes :
1. Instrument Sans **partout** (marketing + produit) ou **marketing seulement** ?
2. Je garde Boogaloo (`font-display`) sur les gros titres marketing ou je passe tout en Instrument Sans (700) ?
3. OK pour livrer la passe complète en un seul lot (gros diff) ?
