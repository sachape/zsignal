# Exemples — design-to-code (multi-domaines)

Fragments courts. Adapter au domaine réel (auth, paiements/StreamCoins, génération de
contenu, analyse de lives, recommandations, connexions Twitch/YouTube, paramètres, tables,
états vides, navigation…).

## A — réutiliser plutôt que créer
Besoin : un bouton d'action destructive dans une modale de confirmation.
- Inspecter : `src/components/ui/button.tsx` (variante `destructive`), `alert-dialog.tsx`.
- Décision : **réutiliser** `AlertDialog` + `Button variant="destructive"`. Ne PAS créer un
  nouveau composant ni un style en dur. Story : nom = rendu, `variant` verrouillé.

## B — token manquant (procédure)
Besoin : une surface « info » pour une bannière.
- Vérifier `tokens/semantic/color.json` : `color.background.info` existe déjà → l'utiliser.
- Si absent : l'ajouter en couche **semantic** (alias vers une primitive), `npm run tokens:build`,
  documenter. Jamais un `bg-[#...]`.

## C — états d'une feature de liste
Route affichant une liste (clips, lives, recommandations…) :
- Couvrir loading (skeleton), empty (`EmptyState`), error + Réessayer, contenu long.
- Chaque état déterministe ; stories dédiées si le composant est documenté.

## Validation
Après implémentation : `bash .claude/skills/design-to-code/scripts/validate.sh`
puis renseigner le rapport (`templates/report.md`) avec les résultats réels.
