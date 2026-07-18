# États à contrôler (design-to-code)

Selon la nature de la feature. Couvrir ceux qui s'appliquent ; **documenter** les non-applicables.

## Données / asynchrone
- initial
- loading, skeleton (quand pertinent)
- success
- empty (état vide utile : dit quoi faire ensuite — voir `EmptyState` du DS)
- partial data
- error récupérable (message + Réessayer idempotent)
- error bloquante
- offline / timeout (quand pertinent)

## Interaction (composants)
- disabled (raison compréhensible)
- hover, focus-visible, active
- selected, checked/indeterminate (si applicable)
- completed
- permission denied

## Contenu extrême
- labels longs / traductions
- contenu absent
- quantité minimale
- quantité importante (listes longues, overflow)

## Règle
Ne pas fabriquer des états qui n'existent pas dans le domaine. Chaque état couvert doit
avoir un rendu **déterministe** et, si documenté dans Storybook, une story dédiée
(nom = état, prop d'identité verrouillée).
