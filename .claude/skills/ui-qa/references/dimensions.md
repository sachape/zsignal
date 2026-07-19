# UI QA — dimensions à vérifier

## Fonctionnel
Scénario principal · actions · navigation · sauvegarde · retours utilisateur · erreurs ·
permissions · cohérence des données.

## UX
Hiérarchie · compréhension · charge cognitive · priorité des actions · feedback ·
prévention/récupération des erreurs · cohérence · affordance · contenu.

## UI
Alignements · espacements (échelle `--space-*`) · taille · rythme · densité · cohérence des
surfaces · icônes · typographie · contrastes · états · overlays · élévation · frontières · troncatures.

## Responsive
Petit mobile · mobile standard · tablette (si pertinent) · desktop · grand écran · zoom ·
textes longs · localisation · orientation · clavier virtuel (si pertinent).

## Interactions
hover · focus · active · pressed · selected · disabled · loading · transitions · fermeture ·
clic extérieur · Escape · navigation clavier · prévention du double submit · feedback asynchrone.

## États
loading · skeleton · empty · partial · error · retry · success · completed · offline ·
permission denied · contenu extrême.

## Accessibilité
Vérifier **dans le rendu réel** les exigences de `../../_shared/accessibility.md`. L'audit axe
(mode `error`) est un contrôle initial, **pas** un substitut à la vérification manuelle.
À l'œil / au clavier : focus réellement visible · ordre de focus · zoom 200 % · landmarks en
page réelle · tailles tactiles · contraste perçu.

## Robustesse visuelle
overflow · chevauchement · z-index · sticky · modales · scroll lock · contenu long ·
absence d'image · données extrêmes · layout shift · états asynchrones.
