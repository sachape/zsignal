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
      domains: (quality?.items ?? []).map((i) => {
        const map = { pass: ["measured", "PASS"], enforced: ["measured", "Gate"], active: ["measured", "Active"], off: ["missing", null] };
        const [status, measure] = map[i.state] ?? ["missing", null];
        return { key: `q-${i.name}`, label: i.name, status, measure, note: i.detail };
      }),
    },
    {
      area: "Visual Quality",
      note: "Domaine durable — ses sous-métriques passeront de missing/planned à measured dès que la CI Chromatic produira un rapport.",
      domains: visualQuality.metrics.map((v) => ({ key: `vq-${v.key}`, label: v.label, status: v.status, measure: v.measure, note: v.note })),
    },
    {
      area: "Delivery, Docs & Governance",
      domains: [
        { key: "ci", label: "CI pipeline", status: "measured", measure: "Green", note: "ci.yml — gates typecheck/lint/build/a11y" },
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
