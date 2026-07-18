# Pattern — Error State

Rendre un échec compréhensible et récupérable.

## Quand l'utiliser
Erreur réseau, erreur serveur, action échouée, permission refusée, timeout.

## Quand ne pas l'utiliser
Absence normale de contenu (→ `empty-state.md`) ; validation de champ (→ `form.md`, inline).

## Structure recommandée
Message clair (quoi + pourquoi si utile + quoi faire) → action de récupération (Réessayer)
→ chemin alternatif si bloquant. Réutiliser `StateView`/`ErrorState` du DS.

## Hiérarchie des informations
Dire ce qui s'est passé en langage humain (pas de code technique brut) ; l'action de sortie est primaire.

## États indispensables
erreur **récupérable** (Réessayer idempotent) · erreur **bloquante** (chemin alternatif/contact) ·
erreur **partielle** (isoler la section en échec, garder le reste) · permission refusée · hors-ligne/timeout.

## Responsive
Message centré et lisible ; action atteignable ; ne pas repousser le CTA hors écran.

## Accessibilité
Erreur annoncée (`role="alert"`/`aria-live`) ; information non portée par la seule couleur ;
focus déplacé vers le message/CTA si pertinent ; le bouton Réessayer a un nom accessible.

## Erreurs fréquentes
Message technique (« 500 ») ; pas de bouton Réessayer ; une erreur locale casse toute la page ;
Réessayer non idempotent (double effet).

## Anti-patterns
Toast d'erreur qui disparaît sans action possible ; page blanche ; blâmer l'utilisateur.

## Interactions recommandées
Réessayer idempotent ; distinguer récupérable/bloquant ; conserver la saisie en cas d'échec de soumission.

## Checklist
- [ ] message humain (quoi/pourquoi/action) · [ ] Réessayer idempotent · [ ] récupérable vs bloquant · [ ] erreur isolée par section · [ ] annonce a11y.
