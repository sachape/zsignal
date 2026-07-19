// Overall Health — score global PONDÉRÉ (pas une moyenne simple). Toutes les
// dimensions n'ont pas la même criticité : un échec d'accessibilité est plus
// grave qu'une faible couverture de stories. Les poids sont documentés ici ET
// affichés dans le Dashboard pour que le score soit crédible et discutable.
//
// RÈGLE : seules les dimensions RÉELLEMENT MESURÉES entrent dans le calcul.
// Ajouter une dimension future (ex. régression visuelle) = l'ajouter ici avec
// un poids justifié, une fois qu'elle produit une vraie valeur.

export const WEIGHTS = [
  {
    key: "accessibility",
    label: "Accessibility",
    weight: 0.5,
    tier: "critique",
    why: "Un échec exclut de vrais utilisateurs — enjeu éthique et légal. C'est le garde-fou qu'on a rendu bloquant : le pire résultat possible pour un DS.",
  },
  {
    key: "spacing",
    label: "Spacing",
    weight: 0.3,
    tier: "important",
    why: "Cohérence visuelle et rythme — la fondation gouvernée avec un audit réel. Impacte la qualité perçue sur tout le produit.",
  },
  {
    key: "componentCoverage",
    label: "Component coverage",
    weight: 0.2,
    tier: "important",
    why: "Couverture doc/test des composants : un manque ralentit la contribution mais ne casse pas le produit — métrique interne, pas user-facing.",
  },
];

export function labelFor(score) {
  if (score >= 0.9) return "Excellent";
  if (score >= 0.8) return "Good";
  if (score >= 0.6) return "Fair";
  return "À risque";
}

export function computeOverall({ a11yPass, spacingHealth, componentCoverage }) {
  const values = {
    accessibility: a11yPass ? 1 : 0,
    spacing: spacingHealth,
    componentCoverage,
  };
  const dimensions = WEIGHTS.map((w) => ({ ...w, value: values[w.key] }));
  const score = dimensions.reduce((acc, d) => acc + d.weight * d.value, 0);
  return { score, label: labelFor(score), dimensions };
}
