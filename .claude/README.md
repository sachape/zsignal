# Streamnco — Claude Code Skills

Workflows réutilisables et vérifiables pour le Product Design, le Design System, le
Design-to-Code et la QA de Streamnco. Chaque Skill est autonome et peut s'enchaîner.

```
Besoin / retour / audit / ticket
 → /product-discovery   (cadrer)
 → /design-to-code      (implémenter avec le DS)
 → /code-to-design      (documenter l'existant — quand nécessaire)
 → /design-system-review(auditer la conformité)
 → /ui-qa               (valider le rendu)
 → rapport vérifiable
```

## Les cinq Skills

| Skill | Périmètre | Modifie le code ? | Produit |
|---|---|---|---|
| `/product-discovery` | Cadrer un problème AVANT toute conception | Non | Spec de cadrage + handoff |
| `/design-to-code` | Implémenter/refondre avec le DS | Oui | Code + stories + tests + rapport PASS/PARTIAL/FAIL |
| `/code-to-design` | Reconstruire la logique de conception d'un code existant | Non (sauf stories si demandé) | Spécification Figma-ready |
| `/design-system-review` | Auditer la conformité DS | Non (sauf mode correction explicite) | Violations cotées + verdict |
| `/ui-qa` | Vérifier le rendu et le comportement | Non (sauf fix explicite) | Bugs cotés + verdict |

## Différences clés
- **product-discovery ≠ design-to-code** : cadrer un problème vs l'implémenter.
- **code-to-design ≠ design-to-code** : documenter l'existant vs produire du neuf.
- **design-system-review ≠ ui-qa** : conformité *système* (tokens, API, stories) vs rendu
  *visible* (UX/UI/responsive/a11y observés).

## Commandes réelles utilisées (aucune inventée)
`npm run typecheck` · `npm run lint` (eslint, dette legacy) · `npm run lint:tokens` ·
`npm run test` · `npm run build-storybook` · `npm run build` · `npm run tokens:build`.
Matrice complète : `skills/_shared/validation.md`.

## Sources d'autorité
Hiérarchie dans `skills/_shared/sources-and-evidence.md`. Faits durables du dépôt :
`skills/_shared/repo-map.md`. Règles DS/Storybook : `skills/_shared/{design-system,storybook}.md`.
Docs DS du dépôt : `design-system/*.md`, `design-system/CONTRIBUTING.md`.

## Limitations
- **Figma facultatif** : aucun Skill ne l'exige ; aucun frame n'est créé/modifié.
- Pas de tests e2e configurés (seulement vitest unit + storybook navigateur).
- `npm run lint` (eslint) échoue sur ~105 erreurs legacy Lovable → traité comme non bloquant.

## Invocation
Voir les exemples dans `skills/<name>/examples/`. Exemples génériques :
```
/product-discovery   Analyse la demande fournie et transforme-la en cadrage. Ne modifie aucun fichier.
/design-to-code      Implémente/refond la feature demandée. Conserve la logique métier. Réutilise DS + tokens.
/code-to-design      Analyse la route/feature/composant indiqué. Reconstruis architecture, états, tokens, doc.
/design-system-review Audite le diff/la feature indiqué en lecture seule. Cote et prouve chaque violation.
/ui-qa               Contrôle la page/les stories indiquées : critères, responsive, interactions, états, a11y.
```

## Maintenance
- Structure : `skills/<name>/{SKILL.md,references/,templates/,examples/,scripts/}`.
- Frontmatter minimal (`name`, `description` seulement) — ne pas inventer de champs.
- Mutualiser dans `skills/_shared/` ; ne pas dupliquer le handbook.
- Après modification d'un script : `chmod +x` puis l'exécuter.
- Évaluation : `skills/EVALUATION.md`.
