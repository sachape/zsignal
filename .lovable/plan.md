# Audit final — Landing StreamPulse

## Verdict global

**Score global : 7.8 / 10**

La landing est solide, cohérente visuellement et raconte déjà une vraie histoire produit. Le hero et l'aperçu du diagnostic sont au niveau attendu. Le funnel est lisible. Mais la page **souffre encore de redondances de promesse** entre 4 sections (Hero, Aperçu, How It Works, Social Proof) qui répètent toutes une variante de *"diagnostic en moins d'une minute"*. La densité est trop élevée au milieu (Personas + Features + Social Proof = 3 sections rapprochées qui parlent toutes de bénéfices). Le pricing a un CTA cassé (`navigate("/")`). Le footer est OK mais sous-exploité.

**3 priorités max pour passer de 7.8 à 9 :**
1. Couper les répétitions de promesse au milieu de page (gain de tension immédiat)
2. Réparer la cohérence du funnel free → paid (Pricing CTA + Hero "Se connecter")
3. Compresser le bloc Personas + Features ou fusionner Social Proof avec Features

---

## Audit section par section

### 1. Hero — **8.5 / 10** — Garder avec micro-ajustements

**Ce qui marche :**
- Promesse claire, badge + H1 + sous-titre + champ + réassurance bien hiérarchisés
- 3 cartes flottantes utiles (Score / Blocage / Plan d'action) qui montrent la valeur produit
- CTA principal sans concurrent

**Ce qui affaiblit :**
- Cartes flottantes en `pointer-events-none` mais elles **chevauchent visuellement le H1 sur viewport 1239px** (top 26%/34%) — risque de gêne sur écrans 13-14"
- Lien "Déjà un compte ? Se connecter" centré sous l'input mais visuellement isolé — un placement dans la nav (top right) serait plus standard
- Réassurance répétée plus loin (Hero + Social Proof + Final CTA disent tous *"Aucune connexion Twitch requise"*)

**Décision : garder avec micro-ajustements**
- Vérifier le non-chevauchement des cartes flottantes en 1280-1440px
- Confirmer que "Se connecter" est bien aussi présent dans `LandingNav` (le lien sous l'input devient redondant)

---

### 2. Aperçu du diagnostic — **9 / 10** — Garder tel quel

**Ce qui marche :**
- Bento 4 blocs parfaitement aligné sur les 4 sorties produit
- Animation score + barres de progression = effet "wow" crédible
- Phrase de transition discrète et utile en bas

**Ce qui affaiblit :**
- Quasiment rien. Petit doute sur *"Impact estimé : -18% de rétention"* — chiffre plausible mais à valider côté crédibilité produit (règle "metric honesty" du project-knowledge)

**Décision : garder tel quel**
- Optionnel P2 : remplacer "-18% de rétention" par "Impact estimé : significatif" si le chiffre n'est pas fondé

---

### 3. Comment ça marche — **7.5 / 10** — Garder avec micro-ajustements

**Ce qui marche :**
- 3 étapes lisibles, ligne de connexion subtile entre cartes
- Pédagogique sans être bavarde

**Ce qui affaiblit :**
- Étape 1 ("Entre ton pseudo Twitch") = redite exacte du Hero
- Étape 2 ("Score, blocage principal, progression, recommandations") = redite exacte de l'Aperçu juste au-dessus
- La section apporte peu après l'Aperçu qui montre déjà visuellement les sorties

**Décision : garder avec micro-ajustements (raccourcissement)**
- Réduire à 3 lignes ultra courtes plutôt que 3 cartes hautes
- OU déplacer cette section **avant** l'Aperçu (logique "explication → preuve") — actuellement elle arrive après la preuve, ce qui la rend redondante

---

### 4. Pour qui (Personas) — **7 / 10** — Raccourcir

**Ce qui marche :**
- 3 profils nets, badge "Le plus fréquent" sur le bon
- Format compact

**Ce qui affaiblit :**
- Section très courte mais qui prend toute une hauteur de viewport — déséquilibre densité
- "Débutant sérieux" et "Créateur structuré" sont presque interchangeables — les pitches manquent de différenciation
- Arrive juste avant Features qui parle aussi d'identification

**Décision : raccourcir / compresser**
- Réduire le padding vertical de la section
- OU intégrer les 3 profils en 1 ligne d'icônes + label sous le titre, sans cartes — gagne 600px de scroll

---

### 5. Fonctionnalités — **8 / 10** — Garder avec micro-ajustements

**Ce qui marche :**
- 5 cartes orientées bénéfice, wording correct
- Layout bento 6-cols avec hero cells bien équilibré

**Ce qui affaiblit :**
- Carte 1 ("Vois immédiatement où ta chaîne en est") = redite directe de l'Aperçu (Score global)
- Carte 2 ("Identifie ce qui te freine") = redite directe de l'Aperçu (Blocage principal)
- Carte 3 ("Suis ta progression vers l'affiliation") = redite directe de l'Aperçu (Progression)
- Carte 4 ("Décide quoi tester") = redite directe de l'Aperçu (Action prioritaire)
- → **4 des 5 cartes répètent le contenu de l'Aperçu**. Seule la carte 5 (Comparaison) apporte une valeur nouvelle

**Décision : garder avec recadrage fort**
- Repositionner cette section comme *"Au-delà du premier diagnostic"* : montrer ce que la version complète apporte EN PLUS
- Garder uniquement 3-4 cartes qui ne répètent pas l'Aperçu : Comparaison concurrents, Historique/évolution, Plan détaillé, Recommandations enrichies
- Sinon : supprimer purement et simplement (l'Aperçu fait déjà le travail)

---

### 6. Preuve / Social Proof — **6.5 / 10** — Fusionner ou raccourcir

**Ce qui marche :**
- Témoignages sobres, ton crédible, pas de fake stars
- 3 piliers + 2 notes = format équilibré

**Ce qui affaiblit :**
- Pilier 1 ("Diagnostic en moins d'une minute") = **3e répétition** de la même promesse (Hero + How It Works + ici)
- Pilier 2 ("Aucune connexion Twitch requise") = **3e répétition** (Hero réassurance + How It Works + ici)
- Pilier 3 ("Passage au suivi complet") = pré-pricing, mais Pricing arrive juste après
- → Les 3 piliers sont des redites. Seules les 2 notes apportent de la vraie preuve sociale
- Phrase finale *"Déjà utilisé pour analyser des chaînes Twitch à différents stades"* est faible (pas un chiffre, pas un nom)

**Décision : raccourcir fortement**
- **Supprimer les 3 piliers** (déjà dits 2× ailleurs)
- Garder uniquement les 2 témoignages + le titre/sous-titre
- Section devient courte (300-400px) et plus crédible

---

### 7. Pricing — **6.5 / 10** — Garder avec correctifs critiques

**Ce qui marche :**
- 2 plans bien différenciés, micro-réassurance "Sans engagement"
- Recommandé clairement marqué

**Ce qui affaiblit :**
- **BUG : `onClick={() => navigate("/")}` sur les deux CTA** — le bouton "Analyser ma chaîne" et "Débloquer le suivi complet" renvoient tous deux à la home. Aucun ne déclenche le vrai flow (analyse teaser ou auth modal vers checkout)
- "Analyses illimitées" pour 9€/mois est plausible mais peut sembler trop généreux — vérifier la cohérence produit
- Pas de mention de la durée d'historique côté Suivi complet (30j ? illimité ?)

**Décision : garder avec correctifs critiques (P0)**
- CTA "Aperçu gratuit" → scroll vers Hero ou ouvre directement le focus sur le champ
- CTA "Suivi complet" → ouvre `useAuthModal` avec `redirectTo: "/dashboard"` ou route checkout future
- Préciser ce que couvre l'historique

---

### 8. FAQ — **8.5 / 10** — Garder tel quel

**Ce qui marche :**
- 7 questions pertinentes, réponses courtes et calmes
- Première question ouverte par défaut
- Vocabulaire cohérent ("diagnostic", "suivi complet", "lecture seule")

**Ce qui affaiblit :**
- Quasiment rien. Question 7 (multi-chaînes) un peu spéculative ("c'est prévu") — risque de promesse non tenue

**Décision : garder tel quel**
- Optionnel P2 : reformuler Q7 en *"L'expérience actuelle est centrée sur une chaîne. Le multi-chaînes pourra arriver selon les besoins."*

---

### 9. Final CTA — **8 / 10** — Garder avec micro-ajustements

**Ce qui marche :**
- Bloc 2 colonnes propre, image latérale qui ne parasite pas
- Reprise du HeroChannelSearch (cohérence)
- Réassurance dense en 3 puces

**Ce qui affaiblit :**
- Promesse "Diagnostic en moins de 60 secondes" = **4e répétition** de la même promesse temporelle
- Sous-texte *"Entre ton pseudo et vois en moins d'une minute ce qui bloque vraiment ta chaîne"* = quasi copie du Hero (qui dit "en moins d'une minute ton score, ton frein…")
- Les 2 chips visuels à droite (StreamScore 62 / Action prioritaire) répètent l'Aperçu

**Décision : garder avec micro-ajustements**
- Changer l'angle du sous-texte : ne pas répéter la promesse temporelle. Exemples :
  - *"Tu n'as plus à deviner ce qui freine ta chaîne. Lance ton diagnostic."*
  - *"Un diagnostic gratuit, puis le suivi complet si tu veux aller plus loin."*
- Garder les 2 chips visuels — ils résument bien

---

### 10. Footer — **7 / 10** — Garder tel quel

**Ce qui marche :**
- 3 colonnes claires, baseline courte, copyright sobre
- Micro-réassurance finale crédible

**Ce qui affaiblit :**
- Lien "Aperçu" pointe vers `/` (= home, pas vers la section Aperçu) — devrait pointer vers `#preview` ou similaire
- Liens Légal pointent tous vers `/` (pages inexistantes) — risque crédibilité

**Décision : garder tel quel**
- P1 : corriger l'ancre du lien "Aperçu"
- P2 : créer ou retirer les liens Légal qui pointent dans le vide

---

## Carte de chaleur des répétitions

```text
Promesse "diagnostic < 1 minute"     : Hero, How It Works, Social Proof, Final CTA  (4×)
Promesse "aucune connexion Twitch"   : Hero, How It Works, Social Proof, Pricing, Final CTA (5×)
Description Score global             : Hero card, Aperçu, Features card 1   (3×)
Description Blocage principal        : Hero card, Aperçu, Features card 2   (3×)
Description Action prioritaire       : Hero card, Aperçu, Features card 4   (3×)
Description Progression              : Aperçu, Features card 3              (2×)
```

Le milieu de page (How It Works → Personas → Features → Social Proof) **ne fait que recycler ce qui a déjà été dit dans Hero + Aperçu**. C'est le principal levier de tension à gagner.

---

## Plan de polish final priorisé

### P0 — Critique (à faire avant validation)

1. **Pricing — réparer les 2 CTA cassés** (`navigate("/")`)
   - Aperçu gratuit → scroll vers Hero / focus champ
   - Suivi complet → `openAuthModal({ redirectTo: "/dashboard" })`

2. **Features OU Social Proof — supprimer les redondances avec Aperçu**
   - Option A : recadrer Features sur "ce que la version complète ajoute" (Comparaison, Historique, Plan détaillé, Recommandations enrichies)
   - Option B : couper les 3 piliers de Social Proof, garder uniquement les 2 témoignages

3. **Final CTA — réécrire le sous-texte** pour ne plus répéter la promesse temporelle
   - Nouveau sous-texte centré sur la valeur, pas sur la durée

### P1 — Important (gain de tension net)

4. **How It Works — raccourcir** ou déplacer avant l'Aperçu
   - Soit format ultra-compact (3 lignes texte + icônes inline, pas de cartes hautes)
   - Soit déplacement avant Aperçu (explication → preuve)

5. **Personas — compresser** en bandeau d'identification d'1 ligne
   - 3 icônes + 3 labels courts, pas de cartes hautes
   - Gain : ~600px de scroll, meilleure densité

6. **Hero — vérifier le chevauchement** des cartes flottantes en 1280-1440px

7. **Footer — corriger l'ancre du lien "Aperçu"** vers `#preview` (et ajouter `id="preview"` sur DemoPreviewSection)

### P2 — Polish (nice to have)

8. **Aperçu** — remplacer "-18% de rétention" par "Impact estimé : significatif" si non fondé
9. **FAQ Q7** — reformulation moins promissoire sur le multi-chaînes
10. **Footer** — créer ou retirer les pages Légal vides
11. **Hero "Se connecter"** — supprimer le lien sous l'input s'il est déjà présent dans LandingNav

---

## Résultat attendu après application

- Landing **plus courte de ~30%** (Personas compressé + Social Proof allégé + How It Works raccourci)
- **Plus aucune répétition de la promesse temporelle** au-delà du Hero
- **Funnel free → paid fonctionnel** (Pricing CTA réparés, modal cohérent)
- Score global cible : **9 / 10**, prêt pour validation finale
