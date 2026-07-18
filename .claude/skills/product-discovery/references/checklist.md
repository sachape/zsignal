# Product Discovery — checklist détaillée

## Séparer les registres
- [ ] Faits (prouvés par un fichier / une source fournie).
- [ ] Contraintes (métier, techniques, réglementaires).
- [ ] Hypothèses (à valider — jamais présentées comme faits).

## Problème
- [ ] Reformulé sans solution implicite.
- [ ] Utilisateurs nommés (rôles réels du produit, pas « l'utilisateur » générique).
- [ ] Job-to-be-done / besoin principal identifié.
- [ ] Objectif utilisateur ≠ objectif business, les deux explicités.

## Parcours & états
- [ ] Parcours principal (happy path).
- [ ] Parcours secondaires.
- [ ] États : initial, chargement, skeleton (si pertinent), succès, vide, données
      partielles, erreur récupérable, erreur bloquante, permission refusée, hors-ligne/timeout
      (si pertinent), contenu extrême (labels longs, quantité min/max).
- [ ] Marquer « non applicable » les états absents, avec justification.

## Données & permissions
- [ ] Données nécessaires (formes, sources : hooks/services existants ?).
- [ ] Rôles/permissions concernés.

## Sortie
- [ ] Critères d'acceptation **observables** (ex. « le bouton X est désactivé tant que Y »,
      pas « l'expérience est fluide »).
- [ ] Risques et questions non résolues listés.
- [ ] MVP proposé ; hors-périmètre et évolutions futures séparés.
- [ ] Handoff `design-to-code` prêt.

## Anti-patterns à bannir
« intuitif », « premium », « moderne », « simple » sans critère concret et mesurable.
