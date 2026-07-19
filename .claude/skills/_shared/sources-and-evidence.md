# Sources, preuves et honnêteté

Partagé par tous les Skills.

## Sources de vérité — arbitre, pas juge
Quatre sources décrivent le produit, chacune faisant autorité sur **ce qu'elle décrit** —
**aucune n'est prioritaire par défaut** :
- **Design Tokens** (`tokens/`) → valeurs de design (couleur, espacement, radius, typo…).
- **Code** (`src/`) → rendu de production réel.
- **Storybook** (`design-system/stories/`) → documentation interactive.
- **Figma** (si fourni) → intention de conception.

En cas de **divergence entre ces sources**, le Skill **détecte, il ne tranche pas** :
1. identifier les sources concernées ; 2. présenter les **preuves** (`chemin:ligne`, node Figma,
rapport…) ; 3. préciser ce que dit **chaque** source ; 4. qualifier la divergence ; 5. proposer
un handoff si utile. **La décision finale revient à l'utilisateur.** Ne jamais résoudre un conflit
Figma ↔ code ↔ Storybook ↔ tokens **en silence**, ni désigner un « gagnant » automatique : une
divergence peut être une implémentation **en retard** OU une maquette **désynchronisée** — le
Skill ne présume pas laquelle. Les rapports Health (`reports/design-system/*`) restent la **seule**
source des métriques : les citer, jamais les fabriquer.

## Contraintes dures (quand on IMPLÉMENTE, indépendant de l'arbitrage ci-dessus)
Quand un Skill **construit** (pas quand il arbitre entre sources), ces contraintes ne se
contredisent jamais en silence : elles se signalent.
- Logique métier et contrats de données (`src/services/`, `src/hooks/`, types Supabase).
- Critères d'acceptation explicitement fournis.
- **Décisions d'architecture (ADR, `docs/adr/`)** — une convention qui les contredit se signale.
- Architecture et conventions du dépôt (`_shared/repo-map.md`).

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
