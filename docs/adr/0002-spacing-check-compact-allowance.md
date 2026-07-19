# ADR 0002 — Faire évoluer `check:spacing` : distinguer hausse compact légitime vs gaming

- **Statut** : Proposé (différé — **ne pas implémenter maintenant**). DS P6.
- **Contexte** : issu du Lot 1 de migration (Badge `2px → 4px`).

## Problème

Aujourd'hui, `check:spacing` (voir `design-system/health/run.mjs`) échoue sur **toute**
hausse de `compact-allowed` vs baseline. C'est volontairement strict : ça empêche de
remplacer massivement `violation → compact` pour gonfler le score sans améliorer le rythme
principal (cf. ADR 0001, section anti-gaming).

Mais ce garde-fou ne distingue pas deux cas conceptuellement opposés :

- **Légitime** : `2px → 4px`, `10px → 12px` — une **migration officielle** d'une violation
  vers la valeur exacte de la sous-grille compacte (`4/12/20`). C'est une **amélioration** du DS.
- **Suspect** : `6px → 12px` — un contournement qui déplace une violation vers compact sans
  justification, potentiellement pour maquiller le score.

Résultat : une migration légitime (comme le Badge) fait échouer la CI et exige un ratchet
manuel — ce qui reste une **bonne sécurité** aujourd'hui, mais mérite d'être affiné.

## Décision

**On garde le comportement strict actuel** (toute hausse compact bloque → validation humaine
+ ratchet explicite) pour préserver la sécurité. **Aucune implémentation maintenant.**

## Évolution future envisagée (à implémenter dans une phase dédiée)

Distinguer les deux cas, par exemple via l'une de ces pistes :

1. **Autoriser une hausse de compact-allowed uniquement si les violations diminuent au moins
   d'autant dans le même lot** (bilan net d'amélioration), ET si la hausse est documentée.
2. **Tracer l'origine** : ne compter comme « légitime » qu'une transition `violation → compact`
   où la valeur cible est exactement `4/12/20` et où le nombre de violations baisse — sinon bloquer.
3. **Marquage explicite** : un commit `refactor(ds): …` de migration peut porter une note
   `compact-delta: +N (justifié)` que le check lit pour autoriser précisément ce delta.

Critère de réussite : `2px → 4px` passe sans ratchet manuel ; `6px → 12px` non justifié bloque toujours.

## Conséquences
- Rien ne change tant que cette ADR n'est pas implémentée.
- Un `TODO(ADR-0002)` est posé dans `design-system/health/run.mjs` près de la logique `--check`.
