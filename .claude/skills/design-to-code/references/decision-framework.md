# Decision Framework — raisonner comme un Senior Product Designer / Design Engineer

À dérouler AVANT toute création de code (Phase C/D). Ce n'est pas une checklist à cocher :
c'est un arbre de décision où chaque « non » doit être **justifié par une preuve** (fichier,
API, token), pas par confort. Répondre dans l'ordre ; s'arrêter au premier « oui » suffisant.

## 1. Puis-je RÉUTILISER un composant existant tel quel ?
- Chercher dans `src/components/ui/` (primitives) puis `src/components/**` (métier).
- Oui si un composant couvre le besoin **sans** nouvelle prop ni style de contournement.
- Preuve du « non » : citer le composant et la capacité manquante.

## 2. Puis-je ÉTENDRE un composant existant (variante) ?
- Oui si une variante CVA cohérente suffit et **n'élargit pas l'API de façon contradictoire**
  (pas de booléens qui s'excluent, pas d'explosion de variantes).
- Non si l'extension dégrade l'API ou mélange des responsabilités → passer à composer/créer.

## 3. Puis-je COMPOSER à partir de primitives existantes ?
- Beaucoup de besoins « nouveaux » sont une composition (`Card` + `Button` + `Badge`…).
- Préférer une composition locale à un nouveau composant tant qu'elle n'est pas dupliquée ≥ 2 fois.

## 4. Dois-je CRÉER un nouveau composant ? À quel niveau ?
- Seulement si 1–3 échouent. Choisir le niveau : primitive (`ui/`) < composé < métier < pattern.
- Documenter : pourquoi l'existant ne suffit pas, où il vit, variantes incluses ET exclues.
- Ne pas recréer le markup interne d'un composant existant.

## 5. Dois-je CRÉER un token ?
- D'abord vérifier qu'aucun token sémantique équivalent n'existe (`tokens/semantic/*`).
- Oui seulement pour une décision réutilisable, pas une valeur accidentelle d'une seule composition.
- Déterminer la couche (primitive/semantic/component), analyser l'impact light/dark, puis
  `npm run tokens:build`. Jamais changer la SIGNIFICATION d'un token existant pour un fix local.

## 6. Dois-je MODIFIER le Design System ?
- Modifier un composant `ui/` ou un token impacte TOUT le produit → plus haut niveau de prudence.
- Exiger : une raison système (pas un besoin d'écran), la préservation des API publiques,
  et une revue `design-system-review` après coup.

## 7. Quels impacts sur STORYBOOK ?
- Toute création/extension → story(ies) : nom = rendu, Controls cohérents, prop d'identité
  verrouillée, états significatifs, interactions si comportement. Voir `../../_shared/storybook.md`.

## 8. Quels impacts sur les TESTS ?
- Tester les comportements / critères d'acceptation, pas l'implémentation. Interaction (`play`)
  pour les composants à comportement ; a11y (bloquante) automatiquement.

## 9. Quels impacts sur l'ACCESSIBILITÉ ?
- Nom accessible, clavier, focus, contraste, information non portée par la seule couleur.
  Voir `references/accessibility.md`. L'a11y est bloquante dans la validation.

## 10. Quels impacts sur le RESPONSIVE ?
- Décider ce qui se masque/replie/déplace/change de pattern à chaque breakpoint réel.
  Voir `references/responsive.md`. Partir du comportement, pas d'une réduction proportionnelle.

---
**Sortie du framework** : renseigner les sections « Composants réutilisés / à étendre / à créer »,
« Tokens concernés » et « Risques » du plan (`../templates/plan.md`). Chaque décision de créer
plutôt que réutiliser doit être défendable par une preuve.
