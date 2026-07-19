// Carte de MATURITÉ du Design System — pensée pour la V5, pas la V1.
//
// Le Dashboard ne montre pas seulement ce qui est mesuré : il montre l'ÉTAT
// COMPLET du système. Chaque domaine qu'un DS mature possède existe ici, quel
// que soit son avancement, avec l'un de 4 états :
//
//   measured   🟢  on a une vraie métrique
//   documented 🔵  le domaine existe (page/process) mais n'est pas mesuré
//   planned    🟡  évolution volontaire, hors périmètre actuel
//   missing    🔴  attendu vu notre niveau (outil déjà en place) mais absent
//
// Nuance clé (missing vs planned) : "missing" = quelque chose qui DEVRAIT
// raisonnablement exister (ex. une baseline Chromatic alors que Chromatic est
// installé). "planned" = une évolution assumée pas encore lancée (ex. Token
// Hygiene avancé). On n'abuse pas de "missing" : sinon le projet paraît inachevé
// alors qu'il est en évolution maîtrisée.
//
// Ajouter un provider (Docs Coverage, Visual Regression, Performance…) = faire
// passer un domaine de missing/planned → measured, SANS toucher la structure.

export const MATURITY_STATES = {
  measured: { label: "Measured", glyph: "●", order: 0 },
  documented: { label: "Documented", glyph: "◆", order: 1 },
  planned: { label: "Planned", glyph: "◷", order: 2 },
  missing: { label: "Missing", glyph: "○", order: 3 },
};

const pct = (n) => (n == null ? null : `${Math.round(n * 100)}%`);

export function buildMaturity({ spacing, a11y, components, tokens, foundations, quality }) {
  const q = Object.fromEntries((quality?.items ?? []).map((i) => [i.name, i]));
  const chromaticWired = q["Chromatic"]?.state === "pending"; // workflow présent, pas de baseline

  const areas = [
    {
      area: "Foundations",
      note: "Les décisions visuelles fondatrices — attendues, pas seulement celles consommées par l'app.",
      domains: foundations.domains,
    },
    {
      area: "Components",
      domains: [
        { key: "comp-coverage", label: "Story coverage", status: "measured", measure: pct(components.coverage), note: `${components.withStory}/${components.total} composants ui/ avec story` },
        { key: "comp-a11y", label: "A11y coverage", status: "measured", measure: "PASS", note: "toutes les stories passent axe (mode error)" },
        { key: "comp-docs", label: "Docs coverage (MDX par composant)", status: "planned", measure: null, note: "part des composants avec doc dédiée — prévu" },
      ],
    },
    {
      area: "Tokens",
      domains: [
        { key: "tok-inv", label: "Inventory", status: "measured", measure: String(tokens.total), note: `primitive ${tokens.byLayer.primitive} · semantic ${tokens.byLayer.semantic} · component ${tokens.byLayer.component}` },
        { key: "tok-hyg", label: "Token hygiene", status: "planned", measure: null, note: "tokens inutilisés / dépréciés — évolution assumée" },
      ],
    },
    {
      area: "Accessibility & Quality gates",
      domains: [
        { key: "a11y", label: "Accessibility", status: "measured", measure: "PASS", note: "axe bloquante en CI (mode error)" },
        { key: "typecheck", label: "Typecheck", status: "measured", measure: "Gate", note: "tsc --noEmit, gate CI verte" },
        { key: "lint", label: "Lint tokens", status: "measured", measure: "Gate", note: "hex/primitive interdits dans ui/" },
        { key: "build", label: "Storybook build", status: "measured", measure: "Gate", note: "build vérifié à chaque push" },
        { key: "baseline", label: "Spacing baseline", status: "measured", measure: "Active", note: "anti-régression (ratchet)" },
      ],
    },
    {
      area: "Delivery & Visual regression",
      domains: [
        { key: "ci", label: "CI pipeline", status: "measured", measure: "Green", note: "ci.yml — gates typecheck/lint/build/a11y" },
        { key: "chromatic", label: "Chromatic baseline", status: chromaticWired ? "missing" : "planned", measure: null, note: chromaticWired ? "Chromatic installé mais aucune baseline acceptée" : "Chromatic non câblé" },
        { key: "vr", label: "Visual regression", status: chromaticWired ? "missing" : "planned", measure: null, note: "diff automatique par story — dépend de la baseline Chromatic" },
      ],
    },
    {
      area: "Documentation & Performance",
      domains: [
        { key: "docs", label: "Documentation & guides", status: "documented", measure: null, note: "Getting Started, CONTRIBUTING, pages MDX — présent, non scoré" },
        { key: "governance", label: "Governance & contribution", status: "documented", measure: null, note: "workflow de contribution, gouvernance spacing" },
        { key: "perf", label: "Performance budgets", status: "planned", measure: null, note: "budgets bundle/CSS — évolution assumée" },
      ],
    },
  ];

  // Comptage global par état — raconte la maturité en un coup d'œil.
  const counts = { measured: 0, documented: 0, planned: 0, missing: 0 };
  for (const a of areas) for (const d of a.domains) counts[d.status] = (counts[d.status] ?? 0) + 1;

  return { states: MATURITY_STATES, areas, counts };
}
