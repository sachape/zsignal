# Contribuer — zsignal

Règles **globales du dépôt** : Git, branches, commits, Pull Requests, CI, reviews.
Les règles **spécifiques au Design System** (stories, Storybook, composants) vivent dans
[`design-system/CONTRIBUTING.md`](design-system/CONTRIBUTING.md).

Ces conventions s'appliquent **aux futurs commits et PR uniquement** — on ne réécrit pas
l'historique existant.

---

## Convention des branches

| Branche | Rôle |
|---|---|
| `main` | Production. Protégée : jamais de push direct, uniquement via PR mergée. |
| `design-system` | Intégration du Design System. Reçoit les chantiers DS (P5, P6…) avant remontée vers `main`. |
| `feature/*` | Nouvelle fonctionnalité ou chantier (ex. `feature/spacing-8px`). Part de la branche d'intégration concernée. |
| `fix/*` | Correction de bug (ex. `fix/calendar-contrast`). |
| `docs/*` | Documentation seule (ex. `docs/contributing`). |
| `experiment/*` | Exploration jetable, non destinée au merge tel quel (ex. `experiment/radius-scale`). |

Une branche = un sujet. On la supprime après merge.

---

## Convention de commits — Conventional Commits

`type(scope): description` — impératif, court, technique, **atomique**, centré sur la modif
réelle. **Le commit ne raconte pas le chantier** (c'est le rôle de la PR).

- **Types** : `feat` · `fix` · `docs` · `refactor` · `test` · `ci` · `build` · `chore` · `perf`
- **Scopes** : `ds` · `a11y` · `tokens` · `storybook` · `stories` · `ci` · `build` · `deps` · ou un composant (`button`, `calendar`…)
- Sujet ≤ ~72 caractères ; corps optionnel pour le *pourquoi* si non évident.
- Un commit = un changement cohérent (pas de « et » qui trahit deux sujets).

Exemple :

```
fix(a11y): give Toast close button an accessible name

Le bouton de fermeture (icône X seule) n'exposait aucun nom accessible.
Ajout d'un <span class="sr-only">Fermer</span> dans ToastClose.
```

---

## Convention des Pull Requests

La PR **raconte le chantier** et le situe dans la construction du Design System.

**Titre :** `DS P<phase> — <objectif>`
_ex._ `DS P5 — Accessibility enforcement and WCAG AA remediation`

Le corps suit le template [`.github/pull_request_template.md`](.github/pull_request_template.md) :
Résumé · Objectif · Phase · Changements · Avant · Après · Impact · **Décisions d'architecture** ·
Validation · Notes.

> La section **Décisions d'architecture** est la mémoire durable du DS : y consigner les choix
> structurants et leur justification (ex. « token `text-danger` ajouté plutôt que modifier
> `--destructive` »). Avec le temps, elle devient l'historique des décisions du Design System.

### Quand une Pull Request est prête à être mergée (Ready)

Une PR est **Ready** uniquement si **tous** ces points sont vrais :

- [ ] CI verte
- [ ] Storybook construit
- [ ] Chromatic approuvé
- [ ] Aucune régression visuelle
- [ ] Aucun TODO bloquant
- [ ] Revue effectuée

Tant qu'un seul point manque, la PR reste en **Draft** / « à ne pas merger ». Pas de merge automatique.

---

## CI

- `.github/workflows/ci.yml` : typecheck · `lint:tokens` · fraîcheur des tokens · tests
  (unit + Storybook navigateur + **a11y bloquante**) · build Storybook · build prod.
- `.github/workflows/chromatic.yml` : régression visuelle.

Une PR ne se merge **pas** avec une CI rouge. Le statut Chromatic reste en attente tant que les
diffs visuels ne sont pas approuvés — c'est volontaire.

---

## Reviews

- Toute PR passe par une review avant merge.
- Le reviewer vérifie : le **périmètre** (aucun fichier hors sujet), le respect des conventions
  (commits, tokens, a11y) et la checklist **Ready** ci-dessus.
- Les diffs Chromatic intentionnels sont approuvés **explicitement dans Chromatic**, pas seulement
  dans GitHub.
- L'auteur garde la main : il vérifie la CI et approuve Chromatic avant tout merge.
