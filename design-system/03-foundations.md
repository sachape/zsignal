# Fondations & ordre de construction

> L'artefact du Vol.1 Ch.07 : l'ordre de construction du DS, avec **ce qui est
> décidé et ce qui ne l'est pas**. Produit après les tokens — donc à contre-ordre,
> assumé (on extrayait d'un produit vivant). Ce document remet l'ordre droit.
>
> Critère de sortie du Ch.07 : *pouvoir nommer les 3 patterns métier.* Voir §3.

---

## 1. L'ordre de construction, et où on en est

L'ordre n'est pas indicatif : chaque étage repose sur le précédent. Statut réel :

| # | Étage | État | Ce qui manque |
|---|---|---|---|
| 1 | Principes de marque & expérience | 🟡 ce doc | Écrits ci-dessous, à valider. |
| 2 | Grille, breakpoints, responsive | ✅ | `04-type-grid.md` — 3 breakpoints réels (sm/md/lg). |
| 3 | Tokens primitifs | ✅ | — |
| 4 | Tokens sémantiques | ✅ | — |
| 5 | Typographie & styles de texte | ✅ | `04-type-grid.md` — corps = 14px assumé, Boogaloo morte. |
| 6 | Composants fondamentaux | 🟡 | 49 primitives shadcn inventoriées, pas spécifiées (Phase 3). |
| 7 | Composants composites | 🟡 | Inventoriés, pas spécifiés. |
| 8 | **Patterns métier** | 🟡 | **Nommés ci-dessous.** Pas encore encodés. |
| 9 | Documentation | 🟡 | Ce dossier ; Storybook à venir (Phase 4). |
| 10 | Gouvernance & versioning | ✅ | `02-tokens.md`. |

**Conséquence sur le pipeline** : avant de spécifier des composants (Phase 3),
il faut fermer les étages 1, 2, 5. Un composant sans principes ni échelle de type
est un dessin (Ch.07).

## 2. Principes de marque & expérience (étage 1)

Extraits du **vrai produit** (commentaires de code, `streamScoreTier.ts`,
stratégie), pas supposés. Chaque principe cite sa preuve.

### P1 — Un seul signal d'action primaire : le lime
> Preuve : `index.css` — `--accent … Never used for primary actions`.

Le lime (`--primary`) est réservé aux actions primaires. L'accent teal sert à la
différenciation non-CTA (marqueurs concurrents, « next action »). Ne jamais
diluer le lime sur des éléments non actionnables.

### P2 — La marque reste lisible, quitte à s'adapter
> Preuve : `--primary-strong` s'assombrit en texte sur fond clair.

Le lime vif est illisible en texte sur clair. Le token `primary-strong` porte la
version lisible. La marque ne se sacrifie jamais à la lisibilité, ni l'inverse.

### P3 — Le thème ne touche que les surfaces
> Preuve : `.light` ne redéfinit que les surfaces ; marque + statuts identiques.

Un bouton lime est identique en clair et sombre. Seules les surfaces flippent.

### P4 — Le StreamScore a trois paliers, avec un signal couleur assumé
> Preuve : `streamScoreTier.ts` — `low→red`, `mid→orange`, `high→brand`.

**Décision produit tranchée dans le code** : un score bas EST un signal d'alerte
(rouge). C'est l'inverse de ce que suggérait l'exemple pédagogique du handbook
(« jamais alarmant ») — et c'est le vrai produit qui fait foi. La logique est
centralisée (une source de vérité pour les paliers), à préserver.

> ✅ Tranché (2026-07-18) : le rouge `low` est aligné sur `--destructive`. Le
> service `streamScoreTier.ts` l'utilisait déjà ; seul le `ScoreRing` inline de
> `ReseauxPage` divergeait (`#ef4444`) — désormais sur tokens. Dérive app = 0.

### P5 — Encourager sans mentir
> Preuve : stratégie (ICP streamer émergent, ton confiant zéro défensif) +
> `getScoreTier` narratif.

Le produit parle à un streamer émergent. Le ton est confiant, jamais défensif ni
condescendant. Mais P4 prime : encourager ne veut pas dire cacher un score bas.

## 3. Les 3 patterns métier (étage 8 — le critère de sortie)

Le test du Ch.07. Nommés d'après le **vrai repo**, pas d'après des instances.

### Pattern 1 — `GenerationJob`  · état : éparpillé, à encoder
Le flux récurrent des deux piliers générateurs (Clips, Visuels) :
`générer → progression → partiel | complet → reprise`.

- **La décision qu'il encode** : une génération est un objet visible, annulable,
  repris ; un résultat partiel (2/3) est un résultat, pas une erreur.
- **Réalité** : dupliqué dans `ClipGenerationDialog`, `VisualGenerationDialog`,
  `ClipPreparationPanel`. Aucune abstraction commune. `ProgressRow` et
  `ui/progress` existent mais ne portent pas la décision.
- **Cible Phase 3** : un pattern unique consommé par les deux features.

### Pattern 2 — `ScoreDisplay`  · état : logique centralisée, visuel dupliqué ×7
L'affichage du StreamScore.

- **La décision qu'il encode** : le score porte toujours son palier (P4) ; c'est
  une opinion tierée, pas un nombre nu.
- **Réalité** : la **décision est déjà bien faite** — `streamScoreTier.ts` est la
  source de vérité des paliers, avec un `TierTheme` qui mappe vers des tokens.
  Mais le **visuel** est dupliqué : `ScoreCard`, `ScoreInsightCard`,
  `StreamScoreEvolutionCard`, `ShareScoreCard`, `QualitativeScoreCard`,
  `StreamScoreLeaderboard`, `ShareScoreButton`.
- **Cible Phase 3** : un pattern d'affichage qui consomme `getScoreTier`, que les
  7 composants réutilisent au lieu de redessiner.

### Pattern 3 — `AccessGate`  · état : déjà un pattern
La monétisation (le modèle Pro).

- **La décision qu'il encode** : une capacité Pro est bloquée de façon cohérente,
  avec un chemin d'upgrade — jamais un cul-de-sac.
- **Réalité** : `PaywallGate` et `ProFeatureGate` sont déjà réutilisés (≥3 usages,
  détectés en Phase 1). Le pattern existe ; il lui manque une API de variant (aucun
  des deux n'utilise CVA) et sa documentation.
- **Cible Phase 3** : unifier `PaywallGate`/`ProFeatureGate`, leur donner une API.

## 4. Signaux AI-ready (Ch.07) — scorecard Streamnco

| Sujet | État | Preuve |
|---|---|---|
| Nommage | 🟡 | Tokens OK (`--primary`) ; composants mixtes (`TeaserResultLayout` 733 l). |
| Structure | 🟡 | shadcn = auto-layout propre ; custom variable. |
| Composants | ❌ | 0 composant custom avec API de variant (CVA). |
| Documentation | 🟡 | `design-system/` en cours ; Storybook à venir. |
| États | ❌ | Pas de couverture systématique (loading/error/empty…). |
| Responsive | ❌ | Règles non documentées (étage 2). |
| Copy | ✅ | Terminologie réelle (streamer, clip, StreamScore), pas de lorem. |

## 5. Le gate du Ch.07

- [x] L'ordre de construction est écrit, avec le statut de chaque étage.
- [x] Les principes de marque sont extraits du vrai produit (§2), à valider.
- [x] **Je peux nommer les 3 patterns métier** : `GenerationJob`, `ScoreDisplay`,
      `AccessGate` — et dire l'état de chacun.
- [x] Étages 2 (grille/responsive) et 5 (typographie) fermés — `04-type-grid.md`.

Le critère de sortie du Ch.07 est tenu, et les fondations sont complètes
(étages 1-5 + 10). Restent les étages 6-7-8 (composants et patterns) = la Phase 3,
maintenant sur des fondations solides.
