# Pattern — Modal / Dialog

Dialogue focalisé qui interrompt le flux pour une décision ou une tâche courte.

## Quand l'utiliser
Confirmation, action courte, contenu contextuel nécessitant du focus.

## Quand ne pas l'utiliser
Contenu long/complexe (→ page ou `wizard.md`) ; information non critique (→ inline/toast).
Action destructive irréversible → `AlertDialog` (bloquant), pas un Dialog.

## Structure recommandée
Titre → description → contenu → footer (action primaire + annuler). Réutiliser `Dialog`/
`AlertDialog`/`Sheet` du DS. Voile (overlay) + focus trap.

## Hiérarchie des informations
Titre = la décision. Action primaire à droite ; annuler à gauche/secondaire. Ne pas cacher l'enjeu.

## États indispensables
ouvert · fermé · en soumission (action asynchrone : bouton loading) · erreur dans la modale ·
contenu long (scroll interne, footer fixe).

## Responsive
Mobile : plein écran ou bottom-sheet plutôt qu'une petite boîte centrée. Footer atteignable.

## Accessibilité
Rôle `dialog`/`alertdialog` + titre lié (`aria-labelledby`) ; **focus trap** ; focus initial
dans la modale ; **retour du focus** au déclencheur à la fermeture ; fermeture **Escape** ;
`AlertDialog` ne se ferme pas au clic extérieur.

## Erreurs fréquentes
Titre absent → nom accessible manquant ; focus non restauré ; action async sans loading ;
modale imbriquée dans une modale.

## Anti-patterns
Mettre un formulaire long dans une modale ; deux actions primaires ; overlay non bloquant pour une confirmation critique.

## Interactions recommandées
Escape ferme (Dialog) ; clic extérieur ferme (Dialog, pas AlertDialog) ; loading sur l'action async ;
confirmation explicite pour le destructif.

## Checklist
- [ ] titre lié + focus trap · [ ] retour du focus · [ ] Escape · [ ] loading async · [ ] AlertDialog si destructif.
