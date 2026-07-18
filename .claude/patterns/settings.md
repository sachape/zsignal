# Pattern — Settings

Réglages groupés par section thématique, sauvegarde claire.

## Quand l'utiliser
Configurer préférences, compte, intégrations, notifications.

## Quand ne pas l'utiliser
Création d'une entité (→ `form.md`) ; flux séquentiel obligatoire (→ `wizard.md`).

## Structure recommandée
Sections avec `SectionHeader` → champs/toggles → aide contextuelle brève. Navigation par
ancres/onglets si nombreux groupes. Sauvegarde : auto-save (feedback) OU bouton explicite par section.

## Hiérarchie des informations
Grouper par tâche, pas par type de donnée. Réglages les plus utilisés en haut.
Chaque réglage : libellé clair (pas d'explication requise), description courte si besoin.

## États indispensables
default · en cours de sauvegarde · sauvegardé (feedback) · erreur de sauvegarde · disabled
(réglage indisponible selon le plan/permission) · valeur invalide.

## Responsive
Libellé + contrôle : côte à côte desktop, empilés mobile. Navigation de sections repliable.

## Accessibilité
Chaque contrôle a un label associé ; un toggle a un `aria-label`/label ; erreurs annoncées ;
état disabled explicité (pourquoi).

## Erreurs fréquentes
Sauvegarde silencieuse sans feedback ; toggles sans label ; « Enregistrer » global ambigu.

## Anti-patterns
Un seul bouton « Enregistrer » pour 40 réglages hétérogènes ; réglage grisé sans raison.

## Interactions recommandées
Feedback immédiat sur toggle ; confirmation pour les réglages destructifs/irréversibles ;
annulation possible.

## Checklist
- [ ] groupé par tâche · [ ] feedback de sauvegarde · [ ] labels sur tous les contrôles · [ ] disabled expliqué · [ ] confirmation si destructif.
