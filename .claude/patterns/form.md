# Pattern — Form

Saisie structurée avec validation et feedback.

## Quand l'utiliser
Créer/éditer une entité, collecter des informations.

## Quand ne pas l'utiliser
Réglages persistants groupés (→ `settings.md`) ; un seul choix rapide (→ contrôle inline).

## Structure recommandée
Champs groupés logiquement (label + input + aide + erreur) → actions (primaire + annuler).
Ordre des champs = ordre mental de l'utilisateur. Smart defaults plutôt que champs vides.

## Hiérarchie des informations
Champs requis d'abord ; libellés clairs ; placeholder = exemple de format, pas un label.
Action primaire unique et non ambiguë.

## États indispensables
default (avec defaults) · en saisie · invalide (par champ) · en soumission (bouton loading) ·
succès · erreur serveur · disabled (soumission tant qu'invalide) · champs longs/contenu extrême.

## Responsive
1 colonne par défaut ; 2 colonnes seulement pour des champs courts liés. Actions ancrées/visibles.

## Accessibilité
`label`+`htmlFor` sur chaque champ ; erreur associée (`aria-describedby`) et annoncée ;
validation **au blur**, pas seulement au submit ; erreur À CÔTÉ du champ, pas seulement en bandeau ;
focus sur le premier champ en erreur au submit.

## Erreurs fréquentes
Erreurs uniquement en haut ; placeholder utilisé comme label ; submit sans état loading
(double soumission) ; message d'erreur technique.

## Anti-patterns
Formulaire vide sans defaults ; validation uniquement au submit ; désactiver le bouton sans dire pourquoi.

## Interactions recommandées
Validation inline au blur ; prévention du double submit ; message d'erreur = quoi + pourquoi + comment.

## Checklist
- [ ] labels associés · [ ] erreurs inline + annoncées · [ ] validation au blur · [ ] anti double-submit · [ ] action primaire unique.
