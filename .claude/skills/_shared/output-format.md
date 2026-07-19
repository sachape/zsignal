# Annonce d'activation (convention de sortie commune)

Règle transversale : **tout Skill ouvre sa réponse par un en-tête d'activation** qui rend
visibles son déclenchement et son cadrage, **avant** le livrable (workflow, findings, rapport…).
But : l'utilisateur voit en un coup d'œil **quel** Skill agit, **pourquoi**, et **où il en est**.

## Squelette
> ## `<emoji>` `<Nom du Skill>`
> **Pourquoi** — pourquoi ce Skill s'active sur cette demande (le besoin, pas la solution).
> **`<Cadre>`** — un ou deux champs propres au Skill (ce qui a été analysé / classé).
> **`<Sortie>`** — la conclusion attendue du Skill : Décision, Verdict, etc.

Puis le livrable. Ne jamais commencer directement par le workflow / l'analyse sans cet en-tête.

## Champs par Skill
Chaque `SKILL.md` **déclare son instance** (emoji + champs) et référence cette convention ;
il **ne recopie pas** la règle.

| Skill | Emoji | Champs de l'en-tête |
|---|---|---|
| `product-discovery` | 🔍 | Pourquoi · Analyse (✓ exploration, ✓ existant, ✓ doublon) · Décision |
| `design-system-review` | 🔎 | Pourquoi · Classification (type de cible) · Domaines analysés · Verdict |

Les autres Skills adoptent le **même squelette** avec leurs propres champs lorsqu'ils
formalisent leur en-tête (candidats : `design-to-code`, `code-to-design`, `ui-qa`).
