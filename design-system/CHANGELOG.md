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
