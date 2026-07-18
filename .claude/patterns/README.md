# Bibliothèque de patterns UX/UI

Patterns **UX/UI réutilisables** (pas des composants) pour Streamnco. Ils décrivent des
structures d'interface et des règles de conception, pas du code.

## Comment les Skills les utilisent
- **À la demande uniquement.** Un Skill charge le pattern pertinent **quand le besoin y
  correspond** — jamais automatiquement, jamais tous à la fois.
- `product-discovery` : cadrer les états/parcours attendus d'un type d'écran.
- `design-to-code` : structurer une implémentation qui correspond à un pattern connu.
- `code-to-design` : reconnaître le pattern d'une feature existante et pointer ses écarts.
- `ui-qa` : vérifier qu'un écran respecte les états/interactions indispensables de son pattern.
- `design-system-review` : contrôler la cohérence composant/pattern.

Un pattern est un **guide**, pas une obligation : l'adapter au besoin réel, ne pas plaquer
une structure qui ne correspond pas.

## Structure d'un pattern
Chaque fichier contient : quand l'utiliser · quand ne pas l'utiliser · structure recommandée ·
hiérarchie des informations · états indispensables · responsive · accessibilité · erreurs
fréquentes · anti-patterns · interactions recommandées · checklist.

## Index
| Pattern | Usage |
|---|---|
| `page.md` | Gabarit de page générique |
| `dashboard.md` | Vue d'ensemble, métriques, cartes |
| `settings.md` | Réglages groupés par section |
| `table.md` | Données tabulaires, tri, pagination |
| `form.md` | Saisie et validation |
| `modal.md` | Dialogue focalisé / confirmation |
| `wizard.md` | Flux multi-étapes |
| `search.md` | Recherche et résultats |
| `filters.md` | Filtrage d'une collection |
| `empty-state.md` | Absence de contenu |
| `loading-state.md` | Attente / chargement |
| `error-state.md` | Échec récupérable ou bloquant |
| `onboarding.md` | Prise en main initiale |
| `authentication.md` | Connexion / inscription |
| `detail-page.md` | Fiche détaillée d'une entité |

Ces patterns sont **génériques** : aucun ne suppose une feature Streamnco précise.
