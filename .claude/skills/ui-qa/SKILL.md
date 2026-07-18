---
name: ui-qa
description: Vérifie le résultat visible et interactif d'une page, feature ou set de stories Streamnco comme un Product Designer QA — fonctionnel, UX, UI, responsive, interactions, états et accessibilité, en s'appuyant sur Storybook, l'app et les tests réels. Ne se limite pas à lire le JSX. Ne corrige que si demandé explicitement.
---

# UI QA

Contrôler le **rendu** et le **comportement**, pas seulement le code. Read-only sauf mode fix.

## Quand l'utiliser
QA d'une story, d'une route/feature, d'un comportement responsive, d'une régression, ou
des critères d'acceptation — après implémentation et, idéalement, après `/design-system-review`.

## Modes
Story QA · Feature QA · Responsive QA · Regression QA (si références existent) ·
Acceptance QA (vérifier des critères) · Fix mode (correction explicite uniquement).

## Préconditions (poser AVANT de juger)
- Cible identifiée (route, story, composant).
- Comment rendre : `npm run storybook` (stories), `npm run dev` (app), `npm run build-storybook`
  (statique). Les stories montent avec le client Supabase **mocké**.
- Données/mocks, viewports, critères d'acceptation.
- Signaler ce qui est **impossible à vérifier** dans l'environnement courant.

> Ne jamais affirmer qu'un comportement visuel a été vérifié si aucune interface n'a été
> rendue/observée. Voir `../_shared/sources-and-evidence.md`.

## Dimensions (détail : references/dimensions.md)
Fonctionnel · UX · UI · Responsive · Interactions · États · Accessibilité · Robustesse visuelle.

## Viewports
Utiliser ceux déjà configurés s'ils existent ; sinon définir une sélection raisonnable et
**documenter les dimensions réellement testées** (ne pas prétendre couvrir tous les appareils).
Breakpoints du produit : `sm 640 · md 768 · lg 1024 · xl 1280`.

## Sévérités
`BLOCKER` (empêche le parcours) · `MAJOR` (dégrade fortement compréhension/a11y/action essentielle) ·
`MINOR` (défaut contournable) · `POLISH` (amélioration non nécessaire à la livraison).

## Rapport de bug (par problème)
Environnement · Route/story · Viewport · Précondition · Étapes · Résultat observé · attendu ·
Preuve · Impact utilisateur · Cause probable (si démontrable) · Recommandation · Confiance.

## Verdict
`PASS` · `PASS WITH ISSUES` · `FAIL` · `INCOMPLETE`. Sortie : `templates/report.md`.

## Définition de terminé
Cible réellement observée quand les outils le permettent ; scénarios et viewports documentés ;
critères d'acceptation contrôlés ; problèmes reproductibles avec preuves ; limites explicites ;
verdict justifié.

## Handoff
Vérifie le rendu après la review système. Peut renvoyer des bugs vers `/design-to-code`
(correction). Ne délègue rien automatiquement.
