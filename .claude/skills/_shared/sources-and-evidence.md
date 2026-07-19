# Sources, preuves et honnêteté

Partagé par tous les Skills.

## Hiérarchie d'autorité (adaptée au dépôt)
En cas de contradiction : signaler, ne pas résoudre en silence, appliquer la source
la plus haute, documenter la décision.

1. Logique métier et contrats de données existants (`src/services/`, `src/hooks/`, types Supabase).
2. Critères d'acceptation explicitement fournis.
3. **Décisions d'architecture (ADR, `docs/adr/`)** — gouvernent les conventions ; une convention
   qui les contredit doit être signalée, pas appliquée en silence.
4. Architecture et conventions du dépôt (voir `_shared/repo-map.md`).
5. Tokens et composants validés (`tokens/`, `src/components/ui/`).
6. Storybook (`design-system/stories/`) et rapports Health (`reports/design-system/*`, seule
   source des métriques : les citer, jamais les fabriquer).
7. Docs Design System / handbook du dépôt (`design-system/*.md`).
8. Figma — uniquement si un frame/fichier est explicitement fourni (facultatif).
9. Hypothèses du modèle (les plus basses).

## Distinguer les registres
Étiqueter explicitement chaque affirmation :
- **Fait** : prouvé par un fichier (citer `chemin:ligne` ou la zone).
- **Inférence** : déduit du code, marqué comme tel.
- **Hypothèse** : à valider, jamais présentée comme un fait.
- **Recommandation** : séparée des constats.

## Interdits d'honnêteté
- Ne pas inventer de résultat de test, de métrique, ou de commande.
- Ne pas prétendre avoir observé une interface qui n'a pas été rendue.
- Ne pas prétendre qu'un Quality Gate (typecheck, lint:tokens, check:spacing, a11y, build…)
  passe sans avoir exécuté la commande et lu sa sortie.
- Ne pas relever une baseline pour obtenir un résultat vert (voir `validation.md`).
- Ne pas affirmer qu'un frame Figma a été créé/modifié sans cible réelle fournie.
- Ne pas cacher un échec de validation.
- Citer les fichiers concernés (ou le rapport Health) pour toute violation ou métrique.
