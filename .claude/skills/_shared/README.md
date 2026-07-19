# Socle `_shared/` — contrat

Ce dossier est la **source de vérité opérationnelle** des Skills du dépôt. Il traduit
les décisions d'architecture (ADR) en faits vérifiés et règles communes que **tous**
les Skills réutilisent — sans les recopier.

## Hiérarchie
```
ADR (docs/adr/)            décisions structurantes + leur justification durable
   ↓
_shared/                   faits vérifiés du dépôt + règles opérationnelles communes
   ↓
Skills (SKILL.md)          orchestration spécialisée : activation, workflow, livrables
   ↓
Claude Code                exécution + preuves
```

## Où va une règle ? (à se poser AVANT d'écrire)
1. **Règle commune au dépôt ou au Design System** (échelle spacing, architecture des
   tokens, Quality Gates, commandes de validation, baseline ratchet, hiérarchie Storybook,
   modèle Health…) → **`_shared/`**.
2. **Décision structurante qui mérite une justification durable** → **un ADR** (`docs/adr/`),
   que `_shared/` référence ensuite.
3. **Règle propre à la façon dont CE Skill travaille** (conditions d'activation, périmètre,
   workflow, responsabilités, livrables, permissions de modification, stop-conditions,
   format du rapport) → **son `SKILL.md`**.

## Conséquence
Un Skill **garde** ses consignes procédurales, mais **ne duplique pas** les règles communes :
il écrit « Selon `_shared/design-system.md`… » plutôt que de recopier la règle. Ainsi une
règle commune se corrige **une seule fois**, ici, et tous les Skills en héritent.

## Fichiers
- `repo-map.md` — carte factuelle du dépôt (chemins, stack, ce qui existe / n'existe pas).
- `design-system.md` — architecture des tokens, Foundations, interdits, réutilisation, gouvernance spacing/Health.
- `validation.md` — commandes RÉELLES de validation + ordre + baseline ratchet.
- `storybook.md` — Storybook comme plateforme (discipline stories, navigation, pages).
- `accessibility.md` — a11y comme principe commun bloquant (exigences, sources, validation).
- `sources-and-evidence.md` — hiérarchie d'autorité, registres (fait/inférence/hypothèse), honnêteté.
