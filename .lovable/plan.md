
# Plan d'exécution P1 — StreamPulse

Ordre strict : **P1.1 → P1.2 → P1.3**, avec checkpoint après chaque étape.

---

## P1.1 — Rewording du loader d'enrichissement post-OAuth

**Fichier cible** : `src/pages/TwitchCallbackPage.tsx`

**Problème actuel** : le loader affiche des libellés génériques ("Enrichissement de ton diagnostic…") qui ne donnent pas le sentiment que quelque chose de précis se passe.

**Direction validée** :

Séquence de 3 étapes qui tournent pendant l'enrichissement (chaque étape = ~1/3 du temps perçu ou calée sur les phases réelles quand possible) :

1. `On vérifie ta chaîne Twitch…`
2. `On lit tes 30 derniers jours de stream…`
3. `On calcule ton StreamScore et ton plan…`

**Sous-texte fixe, toujours visible sous la séquence** :

`Tu arrives sur ton cockpit dans quelques secondes.`

**Implémentation** :
- Remplacer le titre/texte statique actuel par un composant qui fait défiler les 3 lignes (par ex. `useEffect` + `setInterval` qui cycle un index toutes les ~1.8–2.2s), OU synchroniser sur les vraies phases (`resolving identity`, `running analysis`, `assembling report`) si elles sont déjà exposées. Je vais regarder le code existant avant de trancher — privilégier le mapping sur les vraies phases si c'est simple, sinon cycler visuellement.
- Sous-texte fixe sous la liste.
- Garder la même carte / layout visuel que l'actuel pour ne pas casser la perception.
- Ne rien changer aux écrans d'erreur (`Connexion Twitch impossible`, `Diagnostic enrichi indisponible`) — uniquement le loader "succès en cours".

**Pas de changement** :
- Logique de redirection (`/dashboard?welcome=1`)
- Gestion d'erreur
- Appel `runAnalysis`

**Checkpoint après P1.1** : je confirme le diff exact et demande OK avant P1.2.

---

## P1.2 — Mode exploration / reconstruction pour comptes trop faibles

**Fichiers cibles probables** :
- `src/services/lowSignalMode.ts` (existe déjà — `diagnoseLowSignal`)
- `src/services/foundationMode.ts` (existe déjà)
- `src/components/FoundationModeBanner.tsx` (existe déjà)
- `src/pages/ResultPage.tsx` (consommation)
- `src/pages/DashboardPage.tsx` (consommation)
- Possiblement `src/components/ScoreCard.tsx` pour masquer le score chiffré en mode reconstruction

**Problème actuel** :
- Sur compte très faible, certains blocs affichent des valeurs punitives (`0`, `50/100`, "progression vers affiliation") alors qu'il n'y a simplement pas assez de signal.
- Check P0.4 n'était que "partial PASS" → c'est ici qu'on le finit.

**Règles à appliquer** :

### Détection
Utiliser `diagnoseLowSignal` + `diagnoseFoundationMode` existants. Deux niveaux :
- **Mode reconstruction** (`lowSignal.isActive`) : 0 stream / quasi pas d'activité → aucune lecture chiffrée pertinente.
- **Mode exploration** (`foundationMode.isActive` mais pas `lowSignal`) : signal faible mais présent → on peut lire certaines choses, pas encore les progressions fines.

### Affichage — mode reconstruction
- Masquer le StreamScore chiffré. Remplacer par un état qualitatif : `Signal insuffisant pour un score fiable`.
- Masquer "progression vers l'affiliation" / milestones chiffrés.
- Masquer "concurrents directs" (fit_score non calculable proprement sur 0 stream) — on peut garder des "inspirations" si le service les produit, sinon masquer la section.
- Afficher le `FoundationModeBanner` existant, avec wording adapté reconstruction.
- Remplacer les métriques à 0 par `Pas encore mesurable` (déjà partiellement fait en P0.3, à auditer).
- Ne jamais afficher `0 / 50 / 100` comme si c'était une note.

### Affichage — mode exploration
- StreamScore visible mais avec badge `Estimation — signal partiel`.
- Milestones affichés mais avec ton "exploration" plutôt que "tu es à X% de l'affiliation".
- Concurrents : seulement s'il y a au moins 1 match avec confidence suffisante, sinon masquer.
- Banner exploration : ton plus léger que reconstruction, centré sur "on apprend encore ta chaîne".

### Comptes affiliés / partenaires
- Si `broadcaster_type === 'affiliate' || 'partner'` → ne jamais afficher "progression vers l'affiliation" (déjà partiellement géré, à vérifier dans `progressionSignals.ts` et les cards qui l'utilisent).
- Remplacer par "progression vers le palier suivant" générique ou masquer le bloc si rien de pertinent.

**Implémentation** :
1. Auditer les points d'affichage du score, des milestones, des concurrents, des métriques brutes sur `ResultPage` et `DashboardPage`.
2. Introduire un helper `getAccountDisplayMode(report)` qui retourne `'reconstruction' | 'exploration' | 'normal'` (combine lowSignal + foundationMode + broadcaster_type).
3. Gater les blocs punitifs derrière ce mode.
4. Ajuster les wordings dans `FoundationModeBanner` si besoin (ou créer une variante reconstruction/exploration).

**Checkpoint après P1.2** : je reviens avec la liste des blocs effectivement modifiés + screenshot mental du résultat sur compte faible, avant P1.3.

---

## P1.3 — Fusion landing Personas + Features + suppression SocialProof

**Fichiers cibles** :
- `src/pages/Index.tsx` (orchestration)
- `src/components/landing/PersonasSection.tsx` (à fusionner)
- `src/components/landing/FeaturesSection.tsx` (à fusionner / refondre)
- `src/components/landing/SocialProofSection.tsx` (à supprimer)

**Décision validée** :
- Supprimer `SocialProofSection` (pas de preuves réelles → pas de section).
- Fusionner Personas + Features en une seule section.

**Approche de fusion proposée** :

Une section unique intitulée (ex. `Pour qui et pour quoi faire`) qui raconte :
1. **Qui** : les 3 profils actuels (`Tu débutes`, `Tu stagnes`, `Tu structures`) — version compacte, en header de section.
2. **Quoi** : les 4 bénéfices actuels de `FeaturesSection` (Historique, Concurrents, Plan détaillé, Suivi) en grille.

Rendu : 1 section, 2 temps narratifs (personas en intro condensée, features en corps), au lieu de 2 sections pleines.

**Résultat landing** : 10 sections → **8 sections** :
1. Hero
2. DemoPreview
3. HowItWorks
4. **Personas + Features fusionnés** (nouveau)
5. Pricing
6. FAQ
7. FinalCTA
8. Footer

(suppression de : PersonasSection autonome, SocialProofSection, FeaturesSection autonome → remplacés par la section fusionnée)

**Implémentation** :
1. Créer `src/components/landing/AudienceValueSection.tsx` (ou renommer/refondre `FeaturesSection` et absorber Personas dedans — je trancherai selon ce qui est le plus propre).
2. Retirer `<PersonasSection />`, `<FeaturesSection />`, `<SocialProofSection />` de `Index.tsx`.
3. Ajouter `<AudienceValueSection />`.
4. Supprimer les 3 fichiers sources devenus inutiles (Personas, Features, SocialProof) pour ne pas laisser de dead code.
5. Vérifier que les commentaires numérotés dans `Index.tsx` restent cohérents.

**Checkpoint après P1.3** : diff final + rappel de l'état landing.

---

## Hors scope (confirmé)
- Pas de nouvelles features
- Pas de refonte visuelle globale
- Pas de touche à la logique OAuth / callback / redirection (stable en P0)
- Pas de changements backend / Supabase

## Arbitrages possibles à remonter
- **P1.1** : mapping sur vraies phases d'enrichissement vs cycle visuel simple → je choisirai selon le code existant, sauf objection.
- **P1.2** : faut-il masquer complètement les concurrents en mode reconstruction ou garder un état "on t'en proposera dès qu'on aura assez de signal" ? → proposerai l'option "état vide explicite" par défaut.
- **P1.3** : nom final de la section fusionnée (`Pour qui et pour quoi faire`, `Ce que tu vas débloquer`, autre) → je proposerai, tu trancheras au checkpoint.
