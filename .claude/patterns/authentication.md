# Pattern — Authentication

Connexion / inscription / récupération, sûres et sans friction inutile.

## Quand l'utiliser
Connexion, inscription, mot de passe oublié, OAuth (ex. connexions tierces).

## Quand ne pas l'utiliser
Réglages de compte une fois connecté (→ `settings.md`).

## Structure recommandée
Formulaire minimal (email + mot de passe OU OAuth) → action primaire → liens secondaires
(inscription / mot de passe oublié). S'appuyer sur `form.md`. Erreurs claires, non divulgantes.

## Hiérarchie des informations
Une seule action primaire par écran. Ne pas mélanger connexion et inscription sur le même bouton.
OAuth mis en avant si c'est le chemin recommandé.

## États indispensables
default · en soumission (bouton loading, anti double-submit) · identifiants invalides ·
erreur serveur/réseau · succès (redirection) · compte verrouillé/limité · OAuth en cours/annulé.

## Responsive
Pleine largeur mobile ; champs confortables ; clavier virtuel ne masque pas l'action.

## Accessibilité
Labels associés ; type d'input correct (`email`, `password`) ; erreurs annoncées et non
dépendantes de la couleur ; focus sur le premier champ ; bouton avec nom accessible.

## Erreurs fréquentes
Message révélant si l'email existe (fuite) ; pas d'état loading (double soumission) ;
placeholder comme label ; erreurs uniquement en couleur.

## Anti-patterns
Formulaire d'auth surchargé ; validation trompeuse ; bloquer OAuth déjà configuré.

## Interactions recommandées
Feedback immédiat sur erreur ; lien « mot de passe oublié » ; anti double-submit ;
messages génériques et sûrs.

## Checklist
- [ ] 1 action primaire · [ ] messages sûrs (non divulgants) · [ ] loading + anti double-submit · [ ] types d'input + labels · [ ] erreurs a11y.
