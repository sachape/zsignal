# ADR 0003 — Projection fidèle des Design Tokens vers Figma

- **Statut** : Accepté — 2026-07-19
- **Portée** : synchronisation code/tokens → Figma (Mode S de `code-to-design`). N'affecte pas l'audit lecture seule, qui suit déjà `_shared/sources-and-evidence.md`.

## Contexte (constaté, pas supposé)

- Les Design Tokens vivent en **3 couches** (`tokens/{primitives,semantic,components}/*.json`, DTCG) ;
  la couche composant est faite d'**aliases** (`{reference}`), jamais de valeurs brutes (vérifié :
  `tokens/components/badge.json`, `button.json`).
- Les **Variables Figma supportent l'aliasing** (une Variable peut référencer une autre, entre collections).
- En projetant vers Figma, deux stratégies s'opposent : **aplatir** les tokens vers leurs valeurs finales,
  ou **reproduire le graphe** (collections + aliases + modes). L'aplatissement détruit l'auditabilité des
  aliases / dépendances / régressions et inverse la source d'autorité (le rendu code deviendrait la vérité
  au lieu de l'intention portée par les tokens).

## Décision

1. **Projection, pas interprétation.** La synchronisation vers Figma est une **projection** des Design
   Tokens. **Aliases, collections, modes et dépendances sont reproduits à l'identique.** Aucun
   aplatissement vers les valeurs finales. Les arêtes exactes du graphe sont préservées, y compris les
   irrégularités (ex. `badge.padding`/`badge.gap` → primitives `{space.*}` en sautant le sémantique) :
   on ne « normalise » pas en douce, sinon Figma raconterait une autre histoire que les tokens.
2. **Divergences exposées, jamais résolues en silence.** Les écarts entre Tokens, Code, Storybook et
   Figma ne sont **jamais** corrigés automatiquement pendant la synchro ; ils vont au **rapport d'audit**
   (cf. `_shared/sources-and-evidence.md` — « arbitre, pas juge »). **Exemple canonique** :
   `badge.radius = {radius.pill}` (token) vs `rounded-md` (code) → Figma projette **pill** (l'intention) ;
   l'écart avec le code apparaît comme divergence, il n'est **pas** masqué en reliant Figma à `md`.
3. **Reconstruction ordonnée de la chaîne complète.** La synchro reconstruit **toutes** les Variables dont
   dépend le composant (transitivement), dans l'ordre **Primitives → Semantic → Component**, afin
   qu'**aucun alias ne pointe vers une Variable inexistante**. Pas de projection partielle laissant des
   aliases orphelins (Option B, retenue face à « ne créer que les variables directes du composant »).

## Conséquences

- Figma, tokens et code racontent la **même histoire** → les audits d'alias, de dépendances et de
  régressions deviennent fiables sur le long terme.
- Le **Mode S** de `code-to-design` applique cet ADR ; le détail opérationnel vit dans
  `.claude/skills/code-to-design/references/figma-mapping.md`.
- Créer un composant peut impliquer de créer d'abord **toute sa chaîne de dépendances** (surface d'écriture
  plus large, assumée) — le Plan de synchronisation la liste dans l'ordre avant toute écriture.
