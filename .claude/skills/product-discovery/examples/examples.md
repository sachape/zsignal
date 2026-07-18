# Exemples — niveau de précision attendu

Fragments courts, multi-domaines. Ils montrent la PRÉCISION visée, pas une spec figée.
Adapter au domaine réel de la demande (dashboard, onboarding, paiements/StreamCoins,
génération de contenu, analyse de lives, connexions Twitch/YouTube, paramètres, auth…).

## Fragment A — critères d'acceptation observables
Mauvais : « La page doit être claire et rapide. »
Bon :
- Le tableau affiche un **skeleton** tant que les données ne sont pas chargées.
- Si la liste est vide, un **état vide** explique quoi faire ensuite (1 CTA).
- Une erreur réseau affiche un message + un bouton **Réessayer** ; l'action est idempotente.
- L'action principale est **désactivée** tant que le formulaire est invalide (raison affichée inline).

## Fragment B — états d'un solde / d'un compteur
Domaine : un solde (ex. StreamCoins) ou un quota.
- **Chargé** : valeur + libellé.
- **Chargement** : skeleton, jamais un « 0 » trompeur.
- **Zéro légitime** : « 0 » affiché avec l'incitation appropriée.
- **Insuffisant pour une action** : l'action est bloquée avec un chemin de résolution explicite.
- Distinguer **output** (« le solde s'affiche ») et **outcome** (« l'utilisateur sait s'il peut agir »).

## Fragment C — handoff vers design-to-code
- Réutiliser les patterns existants (`design-system/03-foundations.md`) avant d'en créer.
- Contraintes prioritaires : logique métier des services concernés, critères d'acceptation ci-dessus.
- Sources : le brief + la route existante (à inspecter, pas à supposer).
