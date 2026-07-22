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

import { pctSafe as pct } from "./core/format.mjs";

export const MATURITY_STATES = {
  measured: { label: "Measured", glyph: "●", order: 0 },
  documented: { label: "Documented", glyph: "◆", order: 1 },
  planned: { label: "Planned", glyph: "◷", order: 2 },
  missing: { label: "Missing", glyph: "○", order: 3 },
};

// Détail des balises brutes : on ne cite que celles réellement présentes
// (« 0 input · 0 select » est du bruit, pas de l'information).
const rawDetail = (byTag) =>
  Object.entries(byTag ?? {})
    .filter(([, n]) => n > 0)
    .map(([tag, n]) => `${n} ${tag}`)
    .join(" · ") || "aucun";

// Les 5 PILIERS de lecture exécutive. Une aire reste l'unité de mesure (et sa
// sous-page ne bouge pas) ; un pilier est le niveau auquel on RACONTE le système.
// Tokens rejoint Foundations (les tokens portent les fondations) ; Quality Gates
// et Visual Quality forment Quality (garde-fous automatisés) ; Spacing n'est plus
// un pilier autonome — c'est une métrique interne de Foundations.
export const PILLARS = [
  { key: "foundations", label: "Foundations", note: "Les décisions visuelles fondatrices et les tokens qui les portent.", extraLinks: [{ slug: "health-spacing", label: "Spacing Health" }] },
  { key: "components", label: "Components", note: "Le catalogue : couverture, stories, variantes, accessibilité.", extraLinks: [] },
  { key: "adoption", label: "Adoption", note: "Ce que le produit consomme réellement du système.", extraLinks: [] },
  { key: "quality", label: "Quality", note: "Les garde-fous automatisés et la qualité visuelle.", extraLinks: [] },
  { key: "governance", label: "Governance & Documentation", note: "Contribution, décisions, versioning, documentation.", extraLinks: [] },
];

export function buildMaturity({ spacing, a11y, components, tokens, foundations, quality, visualQuality, adoption, foundationsAdoption }) {
  // Adoption d'une fondation : « X conformes sur Y usages », plus le détail des
  // principaux contrevenants — la métrique dit quoi corriger, pas juste un score.
  const fa = (key) => foundationsAdoption?.byFoundation?.[key] ?? null;
  const faNote = (key, rule) => {
    const d = fa(key);
    if (!d || !d.total) return `${rule} — aucun usage détecté`;
    const top = d.topOffenders.slice(0, 3).map((o) => `${o.value} ×${o.count}`).join(", ");
    return `${d.token + d.scale}/${d.total} usages ${rule}${top ? ` · reste : ${top}` : ""}`;
  };
  const faLine = (key, label, rule) => {
    const d = fa(key);
    return {
      key: `ado-${key}`,
      group: "foundations",
      label,
      status: d && d.total ? "measured" : "planned",
      measure: d && d.total ? pct(d.adoption) : null,
      note: faNote(key, rule),
    };
  };

  const areas = [
    {
      area: "Foundations",
      pillar: "foundations",
      slug: "health-foundations",
      note: "Les décisions visuelles fondatrices — attendues, pas seulement celles consommées par l'app.",
      domains: foundations.domains,
    },
    {
      area: "Components",
      pillar: "components",
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
      pillar: "foundations",
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
      pillar: "quality",
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
      area: "Adoption",
      pillar: "adoption",
      slug: "health-adoption",
      note: "Mesure de l'utilisation réelle du Design System dans le produit.",
      // `group` = niveau de lecture. L'adoption se lit en deux domaines qui ne sont
      // PAS équivalents : les composants d'un côté, les fondations/tokens de l'autre.
      // Le spacing est une sous-métrique des fondations, pas un pilier de l'adoption.
      domains: [
        { key: "ado-components", group: "components", label: "Component adoption", status: "measured", measure: pct(adoption.componentAdoption), note: `${adoption.dsFiles}/${adoption.jsxFiles} fichiers app (avec JSX) importent le DS` },
        { key: "ado-raw", group: "components", label: "Éléments bruts restants", status: "measured", measure: String(adoption.rawElements), note: `<button/input/select/textarea> bruts hors DS (${rawDetail(adoption.rawByTag)})` },
        { key: "ado-deprecated", group: "components", label: "Composants dépréciés en usage", status: "planned", measure: null, note: "usage résiduel des composants marqués deprecated — nécessite un registre de dépréciation" },

        // Ordre FIXE (repris tel quel par la carte de résumé) : un rapport se relit
        // dans le temps, les lignes ne se réordonnent pas parce qu'un score a bougé.
        { key: "ado-spacing", group: "foundations", label: "Spacing", status: "measured", measure: pct(adoption.spacingScaleAdoption), note: "part des espacements sur l'échelle gouvernée (ADR 0002)" },
        faLine("typography", "Typographie", "sur l'échelle ADR 0004"),
        faLine("radius", "Radius", "sur l'échelle radius.*"),
        faLine("shadow", "Ombres", "sur l'échelle shadow.*/elevation.*"),
        faLine("motion", "Motion", "sur l'échelle duration.*/easing.*"),
        // La dette couleur en dur (compte brut) vit dans la carte « Dette tokens »
        // du résumé, pas ici : ce tableau ne compare que des taux d'adoption.
        faLine("colors", "Couleurs", "passant par un token (hors palette Tailwind / valeur arbitraire)"),
      ],
    },
    {
      area: "Visual Quality",
      pillar: "quality",
      slug: "health-visual-quality",
      note: "Domaine durable — ses sous-métriques passeront de missing/planned à measured dès que la CI Chromatic produira un rapport.",
      domains: visualQuality.metrics.map((v) => ({ key: `vq-${v.key}`, label: v.label, status: v.status, measure: v.measure, note: v.note, action: v.action ?? null })),
    },
    {
      area: "Governance",
      pillar: "governance",
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
