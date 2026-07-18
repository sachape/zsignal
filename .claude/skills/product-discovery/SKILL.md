---
name: product-discovery
description: Transforme une demande floue, un retour utilisateur, un ticket, un audit ou une idée en cadrage produit exploitable pour Streamnco (problème, utilisateurs, parcours, états, critères d'acceptation, handoff). À utiliser AVANT toute implémentation. Ne modifie aucun fichier produit et n'écrit pas de code.
---

# Product Discovery

Cadrer un problème produit **avant** de concevoir ou coder. Sortie = un document de
cadrage exploitable par `design-to-code`. Read-only : ce Skill ne touche à aucun fichier.

## Quand l'utiliser
Cadrer une feature, analyser un problème utilisateur, transformer une idée/ticket
incomplet en spécification, synthétiser des retours, établir des critères d'acceptation.
S'applique à **n'importe quel domaine Streamnco** (dashboard, onboarding, paramètres,
auth, paiements/StreamCoins, génération de contenu, analyse de lives, recommandations,
connexions Twitch/YouTube, composants, modales, formulaires, tables, états vides, navigation).

## Quand NE PAS l'utiliser
Implémenter du code (`/design-to-code`), documenter du code existant (`/code-to-design`),
auditer la conformité DS (`/design-system-review`), faire la QA visuelle (`/ui-qa`).

## Entrées acceptées
Brief, ticket, notes, feedback, audit UX, métriques fournies, interface existante,
doc produit — ou une combinaison. Si une source manque, le signaler, ne pas l'inventer.

## Workflow
1. Lister les sources réellement disponibles (voir `../_shared/sources-and-evidence.md`).
2. Séparer **faits / contraintes / hypothèses**.
3. Reformuler le problème **sans présumer de la solution**.
4. Identifier utilisateurs, job-to-be-done, et distinguer objectif **utilisateur** vs **business**.
5. Inspecter le produit existant quand pertinent (routes, composants, services) — sans le modifier.
6. Relever dépendances fonctionnelles/techniques, données et permissions/rôles nécessaires.
7. Définir parcours principal, parcours secondaires, **états et cas limites** (vide, chargement,
   erreur récupérable/bloquante, permission refusée, contenu extrême…).
8. Écrire des **critères d'acceptation observables** (vérifiables, pas « intuitif/premium »).
9. Lister hypothèses à valider, risques, questions non résolues.
10. Proposer un **périmètre MVP** et distinguer hors-périmètre / évolutions futures.
11. Produire le **handoff Design to Code**.

Utiliser le format de `templates/discovery.md`. Détail des contrôles : `references/checklist.md`.

## Garde-fous
- Le problème avant la solution. Ne pas inventer de besoins ni de métriques.
- Ne pas confondre output et outcome, ni présenter une hypothèse comme un fait.
- La logique métier existante est une **contrainte**, pas une variable.
- Signaler explicitement toute information absente.

## Définition de terminé
Problème/solution distingués ; sources/hypothèses séparées ; parcours et états explicités ;
critères d'acceptation observables ; dépendances et risques identifiés ; handoff exploitable
présent ; **aucun fichier produit modifié**.

## Références communes
- Faits du dépôt (chemins, stack, ce qui existe) : `../_shared/repo-map.md`.
- Patterns d'écran, à charger **uniquement si** le besoin y correspond (jamais automatiquement) :
  `../../patterns/README.md` (page, dashboard, form, table, empty-state, onboarding…).

## Handoff
Produit une spécification pour `/design-to-code`. Ne délègue rien automatiquement.
