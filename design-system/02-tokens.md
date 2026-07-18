# Consolidation des tokens

> Phase 2. Méthode : Vol.1 Ch.08-10. Source : `artifacts/tokens.json`
> (regénérable en pensée depuis `src/index.css`, dont il est fidèle).

---

## Ce qu'on a trouvé

Le système de tokens de Streamnco est **meilleur que la moyenne** et **incomplet
d'une couche**.

Ce qui est bon (à garder) :
- Nommage sémantique (`--primary`, `--muted`, `--border`), pas par valeur.
- Thème propre : **seules les surfaces flippent** entre clair et sombre. La
  marque et les statuts restent identiques — un bouton lime est le même dans les
  deux thèmes. Décision juste, documentée en commentaire.
- L'astuce `--primary-strong` : le lime devient illisible en texte sur fond
  clair, donc il s'assombrit (`95 98% 61%` → `96 60% 30%`). Vraie décision.

Ce qui manque : **la couche primitive.** Aujourd'hui `--primary: 95 98% 61%`
porte la valeur brute directement sur le token sémantique. C'est un système à
2 couches écrasé en 1. Le Vol.1 Ch.08 : un écran consomme du sémantique, un
sémantique pointe vers une primitive. Ici l'étage du bas n'existe pas.

Conséquence concrète : le jour où le lime change, il faut le chercher dans ~10
endroits (`--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`,
`primary-strong` dark…) au lieu d'un seul primitive `lime.brand`.

## L'architecture cible — 3 couches

`tokens.json` réorganise l'existant sans en changer les valeurs :

```
primitive          semantic              component
─────────          ────────              ─────────
neutral.6     ───▶ surface.canvas (dark)
neutral.94    ───▶ surface.canvas (light)
lime.brand    ───▶ brand.primary   ───▶  (button, ring, sidebar…)
lime.text-light ─▶ brand.text-strong (light)
teal.500      ───▶ brand.accent
green.500     ───▶ status.success
```

**Aucune valeur n'a changé.** On a seulement rendu explicite l'étage qui
manquait. C'est ce qui permettra, plus tard, de changer le lime en un seul
endroit.

## Deux familles NOUVELLES (validées)

Ce ne sont pas de la dérive à supprimer — ce sont des **tokens manquants** que
les hex en dur remplaçaient faute de mieux (E-04 de l'audit).

### `brand.platform.*`
`twitch` existe déjà comme token. Les couleurs YouTube / Instagram / TikTok / X
sont aujourd'hui en dur dans `ConnectNetworkModal`, `ReseauxPage`,
`ReseauxPlatformPage`. → 4 primitives `platform.*` proposées.

### `data.*`
La palette data-viz est en dur dans `ui/chart.tsx`. → 5 primitives
`data.categorical-*` proposées, à valider pour le daltonisme (test niveaux de
gris, Vol.1 Ch.09) avant câblage.

Les deux familles sont marquées `"status": "proposed"` dans `tokens.json` : elles
existent comme **décision documentée**, pas encore comme code. Honnêteté du
document — il distingue le réel du planifié.

## Le plan de câblage (touche du code → étape prudente)

Jusqu'ici tout est additif (docs seulement). La suite touche `index.css` et 7
composants, donc elle est séparée et prudente — je la fais après validation, en
sync avec `main` pour éviter les conflits Lovable :

1. **Introduire la couche primitive dans `index.css`** — ajouter les `--lime-*`,
   `--neutral-*` etc., et faire pointer les sémantiques dessus. Purement additif :
   les noms sémantiques existants ne bougent pas, seules leurs valeurs deviennent
   `var(--lime-brand)`. Aucun composant ne casse.
2. **Câbler `brand.platform.*` et `data.*`** dans `tailwind.config.ts` + `index.css`.
3. **Résorber les 7 poches de dérive** une par une, en remplaçant chaque hex par
   son token. Vérifié à chaque fois par `tools/inventory.mjs` (le compteur doit
   descendre).
4. **Cas à part** : `CaptionStylePreviewGrid` (38 valeurs) — vérifier d'abord si
   ce sont de vraies pastilles de style (données), auquel cas elles restent, ou
   de la dérive, auquel cas elles tokenisent.

## Résultat de la résorption

Le point clé, découvert en résorbant : **tout n'était pas de la dérive.** Le
compteur brut disait 85 ; l'audit à la main donne trois catégories.

| Catégorie | Valeurs | Sort |
|---|---|---|
| **Dérive résorbée** | ~22 | Couleurs de plateformes → tokens `platform.*`. Fait. |
| **Littéraux légitimes** | 52 | Gardés, et documentés (voir ci-dessous). |
| **Marketing (hors scope)** | 7 | Système `el`, phase ultérieure. |
| **Dérive app différée** | 4 | La fonction score-tier de `ReseauxPage`. Voir plus bas. |

**Compteur : 85 brut → 63 brut. Vraie dérive app : 4.**

### Littéraux légitimes (à ne PAS tokeniser)

Une source de vérité qui tokenise des données est aussi fausse qu'une qui laisse
de la dérive. Ces quatre fichiers gardent des couleurs en dur pour une raison
structurelle — inscrite dans l'allowlist de `tools/inventory.mjs` :

- `CaptionStylePreviewGrid` (38) — définitions de styles de sous-titre (contour,
  glow). C'est de la donnée : un contour de caption est noir quel que soit le thème.
- `ShareScoreCard` (8) — carte exportée en image (html-to-image) ; les variables
  CSS ne se résolvent pas à la capture. Le code le documente déjà.
- `ui/chart.tsx` (5) — sélecteurs CSS ciblant les défauts de Recharts
  (`[stroke='#ccc']`). Des matchers, pas des couleurs appliquées.
- `auth/AuthForm` (1) — couleur officielle du logo Google (SVG). Identité de marque.

### Dérive app différée — 1 décision

`ReseauxPage:69` : `score >= 81 ? "#89FD3A" : score >= 61 ? "#22c55e" : ... "#ef4444"`.
Trois des quatre couleurs correspondent EXACTEMENT à des tokens (lime, success,
warning). La quatrième, `#ef4444`, **diffère** du `destructive` du DS
(`0 72% 51%` vs `0 84% 60%`). Tokeniser changerait ce rouge visiblement.

→ **Décision à prendre** : aligner le rouge « score bas » sur le `destructive`
du DS (léger changement visuel, gain de cohérence) ? Et tant qu'à faire,
extraire cette logique dans le service `getScoreTier` existant, car le pattern
score→couleur se répète sur plusieurs pages. Différé pour ne pas casser la
discipline « valeur constante » de ce commit.

## Le gate de la Phase 2

- [x] Les 3 couches sont explicites dans `tokens.json`, fidèles aux valeurs réelles.
- [x] La couche primitive manquante est identifiée et modélisée.
- [x] Les familles manquantes (`platform`, `data`) sont décidées et câblées.
- [x] `index.css` câblé sur les primitives — prouvé à valeur constante.
- [x] Dérive résorbée là où c'était de la vraie dérive (plateformes). Le compteur
      distingue désormais dérive et littéraux légitimes.
- [ ] 1 décision en attente : le rouge score-tier + consolidation dans `getScoreTier`.

Phase 2 franchie sur l'essentiel. `tokens.json` et `index.css` sont alignés ;
`inventory.mjs` mesure la vraie dérive (4). La Phase 5 (MCP) servira
`tokens.json` — la valeur existe déjà pour les agents.
