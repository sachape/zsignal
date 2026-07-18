# Pattern — Table

Données tabulaires : lecture, tri, sélection, pagination.

## Quand l'utiliser
Comparer/scanner des enregistrements sur plusieurs colonnes, agir en lot.

## Quand ne pas l'utiliser
< 3 enregistrements ou données non comparables (→ cartes/liste) ; 1 entité (→ `detail-page.md`).

## Structure recommandée
En-tête de colonnes (tri) → lignes → barre d'actions (sélection) → pagination/chargement.
Colonnes prioritaires à gauche ; actions par ligne à droite.

## Hiérarchie des informations
Colonne d'identité en premier. Aligner les nombres à droite, texte à gauche. Densité maîtrisée.

## États indispensables
loading (skeleton de lignes) · empty (aucune donnée / aucun résultat de filtre) · error ·
partial · ligne sélectionnée · tri actif · beaucoup de lignes (pagination/virtualisation).

## Responsive
Sous `md` : passer en cartes empilées OU colonnes réductibles avec scroll horizontal
**dans un conteneur** (jamais de scroll horizontal de la page). Garder l'action clé accessible.

## Accessibilité
`<table>` sémantique (ou rôles ARIA équivalents) ; en-têtes associés ; tri annoncé
(`aria-sort`) ; sélection au clavier ; focus visible sur les lignes/actions.

## Erreurs fréquentes
Empty state générique ; overflow horizontal de page ; tri sans indicateur ; actions cachées.

## Anti-patterns
Recréer une table en `div` sans sémantique ; charger 10 000 lignes sans pagination.

## Interactions recommandées
Tri au clic sur l'en-tête ; sélection multiple + actions en lot ; pagination ou « charger plus » ;
distinguer « aucune donnée » de « aucun résultat de filtre ».

## Checklist
- [ ] tri indiqué · [ ] empty vs aucun-résultat · [ ] overflow contenu (pas la page) · [ ] sémantique/clavier · [ ] pagination si volume.
