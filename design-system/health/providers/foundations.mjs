// Provider Foundations — état de maturité de chaque fondation ATTENDUE dans un
// DS mature, croisé avec ce qui est RÉELLEMENT documenté (page story présente)
// ET avec sa mesure d'adoption réelle (provider foundations-adoption).
//
// Une fondation est :
//   measured   → sa page existe ET une métrique réelle porte sur elle ;
//   documented → sa page existe, mais aucune métrique ne la couvre encore ;
//   missing    → attendue dans un DS mature, page absente.
//
// La mesure affichée ici est l'ADOPTION (part des usages sur l'échelle
// gouvernée), sauf Spacing qui expose son score de santé composite historique.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../core/walk.mjs";
import { pctSafe } from "../core/format.mjs";

const FDN_DIR = resolve(ROOT, "design-system/stories/foundations");

// Ce qu'un DS mature expose. L'ordre = ordre d'affichage.
//   `metric` = clé dans foundations-adoption ; `rule` = ce que mesure le chiffre.
const EXPECTED = [
  { key: "colors", label: "Colors", file: "Colors", metric: "colors", rule: "passent par un token (hors palette Tailwind / valeur arbitraire)" },
  { key: "typography", label: "Typography", file: "Typography", metric: "typography", rule: "sur l'échelle de tailles ADR 0004" },
  { key: "spacing", label: "Spacing", file: "Spacing" },
  { key: "radius", label: "Radius", file: "Radius", metric: "radius", rule: "sur l'échelle radius.*" },
  { key: "motion", label: "Motion", file: "Motion", metric: "motion", rule: "sur l'échelle duration.*/easing.*" },
  { key: "shadows", label: "Shadows", file: "Shadows", metric: "shadow", rule: "sur l'échelle shadow.*/elevation.*" },
  { key: "borders", label: "Borders", file: "Borders", metric: "borders", rule: "sur l'échelle border.width.*" },
  { key: "elevation", label: "Elevation", file: "Elevation", metric: "elevation", rule: "z-index sur l'échelle layer.*" },
  { key: "icons", label: "Icons", file: "Icons", metric: "icons", rule: "icônes issues de lucide-react (vs <svg> à la main)" },
  { key: "grid", label: "Grid", file: "Grid", metric: "grid", rule: "découpages sur la grille de référence 12 colonnes" },
  { key: "opacity", label: "Opacity", file: "Opacity", metric: "opacity", rule: "sur l'échelle opacity.*" },
  { key: "darkmode", label: "Dark Mode", file: "DarkMode", metric: "darkmode", rule: "tokens de couleur sémantiques ayant une valeur explicite en thème clair" },
];

export function runFoundations({ spacingHealth, foundationsAdoption } = {}) {
  const metricFor = (e) => (e.metric ? foundationsAdoption?.byFoundation?.[e.metric] : null);
  const noteFor = (e, d) => {
    const top = d.topOffenders.slice(0, 3).map((o) => `${o.value} ×${o.count}`).join(", ");
    return `${d.token + d.scale}/${d.total} ${e.rule}${top ? ` · reste : ${top}` : ""}`;
  };
  let present = new Set();
  try {
    present = new Set(
      readdirSync(FDN_DIR)
        .filter((f) => f.endsWith(".stories.tsx"))
        .map((f) => f.replace(".stories.tsx", "")),
    );
  } catch { /* dir absente → tout missing */ }

  const domains = EXPECTED.map((e) => {
    const documented = present.has(e.file);
    if (!documented) {
      return { key: e.key, label: e.label, status: "missing", measure: null, note: "attendu dans un DS mature — page absente" };
    }
    if (e.key === "spacing") {
      return { key: e.key, label: e.label, status: "measured", measure: pctSafe(spacingHealth), note: "audit spacing (value + scale adoption)" };
    }
    const d = metricFor(e);
    if (d && d.total) {
      return { key: e.key, label: e.label, status: "measured", measure: pctSafe(d.adoption), note: noteFor(e, d) };
    }
    // Page publiée mais aucun usage détecté : la fondation existe, la mesure non.
    return { key: e.key, label: e.label, status: "documented", measure: null, note: "page de référence publiée — aucun usage mesurable détecté" };
  });

  return { provider: "foundations", domains };
}
