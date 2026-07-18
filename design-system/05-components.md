# Composants & patterns (Phase 3)

> Étages 6, 7, 8 du Vol.1 Ch.07. Méthode : Vol.2 Ch.05 — *un composant est une
> API avant d'être un dessin.* On écrit les specs (le contrat), pas encore
> l'implémentation. Règle d'or : **ne pas inventer** — la spec colle au vrai code.

---

## Pourquoi des specs, et pas juste du Storybook

Storybook (Phase 4) *montre* les composants. La spec *définit* ce qu'ils sont —
et c'est elle que l'agent MCP servira (Phase 5) et que le prompt-to-UI lira
(Phase 6). Une spec est lisible par un humain **et** par une machine : c'est la
source de vérité du composant, Storybook n'en est qu'une vue.

## Priorité : les 3 patterns métier d'abord

Le handbook est explicite : les patterns métier « sont les unités les plus utiles
pour le prompt-to-UI — parce qu'elles portent une décision, là où un bouton ne
porte qu'une forme ». On les spécifie avant les 49 primitives shadcn (bien
documentées en amont).

| Pattern | Spec | État réel du code |
|---|---|---|
| `ScoreDisplay` | ✅ `specs/score-display.md` | Logique centralisée (`streamScoreTier`), visuel dupliqué ×7. |
| `GenerationJob` | ✅ `specs/generation-job.md` | Éparpillé ×2 ; l'état **partiel** manque. |
| `AccessGate` | ✅ `specs/access-gate.md` | Déjà 3 variantes + analytics ; `ProFeatureGate` à fusionner. |

Les 3 specs sont écrites (étage 8 du Ch.07 franchi au niveau contrat).
**L'implémentation** (unifier les composants pour qu'ils suivent les specs) est
une étape séparée, prudente — elle touche beaucoup de composants, donc après
validation des specs, en sync avec `main`. Ou via le prompt-to-UI (Phase 6).

Les primitives (shadcn) et composites suivront en catalogue léger — leur API est
connue, il s'agit surtout de noter lesquelles manquent d'une API de variant (E-06).

## Le format d'une spec

Chaque spec, un fichier dans `specs/`, avec ces sections fixes (parsables) :

```
# Nom
Rôle          — la décision que le composant encode, en une phrase.
Anatomy       — les parties.
API           — props, types, defaults.
Variants      — les dimensions de design (pas le contenu).
States        — default, loading, empty, error, disabled, + états métier.
Tokens        — ce qu'il consomme. Aucune valeur en dur.
A11y          — clavier, focus, alternative textuelle, contraste.
INVALIDE      — les combinaisons interdites. La partie qui encode la décision.
Anti-usages   — ce à quoi il ne sert pas.
État actuel   — où le pattern est aujourd'hui (dupliqué ? éparpillé ?).
```

Le bloc **INVALIDE** est le cœur (Vol.2 Ch.05) : il transforme une règle produit
en contrainte d'API. Sans lui, tout est permis — donc rien n'est décidé.
