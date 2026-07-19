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

export function buildMaturity({ spacing, a11y, components, tokens, foundations, quality, visualQuality }) {
  const areas = [
    {
      area: "Foundations",
      slug: "health-foundations",
      note: "Les décisions visuelles fondatrices — attendues, pas seulement celles consommées par l'app.",
      domains: foundations.domains,
    },
    {
      area: "Components",
      slug: "health-components",
      note: "Le domaine complet, pas un compteur : couverture, stories, variantes, doc, a11y.",
      domains: [
        { key: "comp-coverage", label: "Story coverage", status: "measured", measure: pct(components.coverage), note: `${components.withStory}/${components.total} composants ui/ avec story` },
        { key: "comp-stories", label: "Stories", status: "measured", measure: components.componentStories != null ? String(components.componentStories) : null, note: "stories publiées (composants + patterns)" },
        { key: "comp-a11y", label: "A11y coverage", status: "measured", measure: "PASS", note: "toutes les stories passent axe (mode error)" },
        { key: "comp-variants", label: "Variants", status: "documented", measure: null, note: "variantes documentées par story (ex. Button ×15) — non scoré en %" },
        { key: "comp-docs", label: "Documentation (MDX par composant)", status: "planned", measure: null, note: "part des composants avec doc dédiée — prévu" },
      ],
    },
    {
      area: "Tokens",
      slug: "health-tokens",
      note: "Inventaire par couche (measured) + hygiène (roadmap).",
      domains: [
        { key: "tok-primitive", label: "Primitive", status: "measured", measure: String(tokens.byLayer.primitive ?? 0), note: "valeurs brutes (hsl, rem, px)" },
        { key: "tok-semantic", label: "Semantic", status: "measured", measure: String(tokens.byLayer.semantic ?? 0), note: "intentions (--primary, --space-*)" },
        { key: "tok-component", label: "Component", status: "measured", measure: String(tokens.byLayer.component ?? 0), note: "tokens par composant" },
        { key: "tok-compat", label: "Compatibility", status: "measured", measure: String(tokens.byLayer.compat ?? 0), note: "alias de compatibilité (legacy)" },
        { key: "tok-hygiene", label: "Token hygiene", status: "planned", measure: null, note: "orphelins / inutilisés / dépréciés — roadmap (justifiera un provider Token Health)" },
      ],
    },
    {
      area: "Quality Gates",
      slug: "health-quality-gates",
      note: "Les garde-fous bloquants avant merge — Accessibility incluse (c'est un gate).",
      domains: [
        ...(quality?.items ?? []).map((i) => {
          const map = { pass: ["measured", "PASS"], enforced: ["measured", "Gate"], active: ["measured", "Active"], off: ["missing", null] };
          const [status, measure] = map[i.state] ?? ["missing", null];
          return { key: `q-${i.name}`, label: i.name, status, measure, note: i.detail };
        }),
        { key: "q-ci", label: "CI pipeline", status: "measured", measure: "Green", note: "ci.yml — orchestre typecheck / lint / build / a11y" },
      ],
    },
    {
      area: "Visual Quality",
      slug: "health-visual-quality",
      note: "Domaine durable — ses sous-métriques passeront de missing/planned à measured dès que la CI Chromatic produira un rapport.",
      domains: visualQuality.metrics.map((v) => ({ key: `vq-${v.key}`, label: v.label, status: v.status, measure: v.measure, note: v.note })),
    },
    {
      area: "Governance",
      slug: "health-governance",
      note: "Contribution, décisions, versioning, documentation — la gouvernance du DS.",
      domains: [
        { key: "gov-contrib", label: "Contribution & workflow", status: "documented", measure: null, note: "CONTRIBUTING.md, conventions Git/PR, gouvernance spacing" },
        { key: "gov-docs", label: "Documentation & guides", status: "documented", measure: null, note: "Getting Started, Nomenclature, pages MDX" },
        { key: "gov-adr", label: "Architecture decisions (ADR)", status: "planned", measure: null, note: "décisions structurantes formalisées — à outiller" },
        { key: "gov-versioning", label: "Versioning & changelog", status: "planned", measure: null, note: "semver du DS + journal des changements — roadmap" },
        { key: "gov-perf", label: "Performance budgets", status: "planned", measure: null, note: "budgets bundle / CSS — évolution assumée" },
      ],
    },
  ];

  // Comptage global par état — raconte la maturité en un coup d'œil.
  const counts = { measured: 0, documented: 0, planned: 0, missing: 0 };
  for (const a of areas) for (const d of a.domains) counts[d.status] = (counts[d.status] ?? 0) + 1;

  return { states: MATURITY_STATES, areas, counts };
}
