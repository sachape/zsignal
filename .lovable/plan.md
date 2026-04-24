## Diagnostic

Le blocage du publish ne vient pas de Browserslist.
Le vrai problème est l’import suivant dans `src/pages/ResultPage.tsx` :

- `@/components/result/TwitchUnlockModal`

Le build essaie de charger ce module et échoue avec `ENOENT`. Dans l’état actuel du projet, le fichier est visible en lecture, mais la résolution du module reste instable côté build. Tant que cet import n’est pas fiabilisé, le publish continuera d’échouer.

## Flow de correction recommandé

1. Stabiliser le composant de modale Twitch
   - déplacer ou recréer `TwitchUnlockModal` dans un chemin simple et déjà éprouvé, par exemple `src/components/TwitchUnlockModal.tsx`
   - éviter de dépendre du sous-dossier `src/components/result` pour ce composant

2. Mettre à jour `ResultPage.tsx`
   - remplacer l’import actuel par le nouveau chemin stable
   - vérifier que le rendu de la modale reste inchangé
   - conserver le flow Twitch-first déjà défini

3. Vérifier le parcours concerné
   - résultat gratuit → modale Twitch-first → `/connect-twitch?teaser=...`
   - aucun retour vers l’auth générique
   - `teaserId` toujours propagé

4. Vérifier l’UI visible
   - confirmer qu’aucun bloc debug n’est rendu sans `?debug=1`
   - garder uniquement les surfaces produit

5. Valider le build
   - relancer `vite build --mode development`
   - relancer `vite build`
   - confirmer que le publish peut repartir

## Décision technique

La correction la plus robuste est de **sortir `TwitchUnlockModal` du dossier `src/components/result`** et de le rattacher à un chemin d’import plus simple.

Alternative acceptable si besoin de rapidité :
- intégrer temporairement la modale directement dans `ResultPage.tsx`

Les deux options suppriment la dépendance au module actuellement non résolu.

## Détails techniques

Fichiers à toucher après approbation :
- `src/pages/ResultPage.tsx`
- `src/components/result/TwitchUnlockModal.tsx` ou nouveau `src/components/TwitchUnlockModal.tsx`

Points à vérifier après correction :
- plus d’erreur `Could not load /dev-server/src/components/result/TwitchUnlockModal`
- build dev OK
- build prod OK
- publish OK
- flow Twitch-first toujours cohérent

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>