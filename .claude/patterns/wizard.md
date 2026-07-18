# Pattern — Wizard (flux multi-étapes)

Découper une tâche complexe en étapes séquentielles.

## Quand l'utiliser
Tâche longue/branchée où l'ordre compte et où l'on veut réduire la charge cognitive.

## Quand ne pas l'utiliser
Formulaire court (→ `form.md`) ; étapes non séquentielles (→ `settings.md` par sections).

## Structure recommandée
Indicateur de progression → contenu de l'étape → navigation (Précédent / Suivant / Terminer).
Une intention par étape. Sauvegarde de l'état entre étapes.

## Hiérarchie des informations
Progression visible (étape n/N + libellés). Chaque étape : un objectif clair, validation locale.

## États indispensables
étape courante · étape valide/invalide · étape complétée · en soumission (dernière étape) ·
reprise (revenir en arrière sans perdre les données) · erreur d'une étape · flux terminé.

## Responsive
Indicateur compact sur mobile (n/N) ; navigation ancrée en bas ; une étape = un écran.

## Accessibilité
Progression annoncée ; focus déplacé au début de chaque étape ; erreurs par étape associées ;
ne pas piéger l'utilisateur (Précédent toujours possible sauf raison métier).

## Erreurs fréquentes
Perdre les données au retour arrière ; valider tout à la fin ; progression illisible ;
impossible de revenir en arrière.

## Anti-patterns
Wizard pour 2 champs ; étapes qui mélangent plusieurs intentions ; pas de sauvegarde d'état.

## Interactions recommandées
Validation à chaque étape ; retour arrière non destructif ; récap avant soumission finale.

## Checklist
- [ ] progression n/N · [ ] validation par étape · [ ] retour non destructif · [ ] état conservé · [ ] focus au changement d'étape.
