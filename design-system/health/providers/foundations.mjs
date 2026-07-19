// Provider Foundations — état de maturité de chaque fondation ATTENDUE dans un
// DS mature, croisé avec ce qui est RÉELLEMENT documenté (page story présente).
// Une fondation attendue mais absente = "missing" (honnête). Spacing est la seule
// mesurée quantitativement aujourd'hui.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../core/walk.mjs";

const FDN_DIR = resolve(ROOT, "design-system/stories/foundations");

// Ce qu'un DS mature expose. L'ordre = ordre d'affichage.
const EXPECTED = [
  { key: "colors", label: "Colors", file: "Colors" },
  { key: "typography", label: "Typography", file: "Typography" },
  { key: "spacing", label: "Spacing", file: "Spacing" },
  { key: "radius", label: "Radius", file: "Radius" },
  { key: "motion", label: "Motion", file: "Motion" },
  { key: "shadows", label: "Shadows", file: "Shadows" },
  { key: "borders", label: "Borders", file: "Borders" },
  { key: "elevation", label: "Elevation", file: "Elevation" },
  { key: "icons", label: "Icons", file: "Icons" },
  { key: "grid", label: "Grid", file: "Grid" },
  { key: "opacity", label: "Opacity", file: "Opacity" },
  { key: "darkmode", label: "Dark Mode", file: "DarkMode" },
];

export function runFoundations({ spacingHealth } = {}) {
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
    if (e.key === "spacing" && documented) {
      return { key: e.key, label: e.label, status: "measured", measure: spacingHealth != null ? `${Math.round(spacingHealth * 100)}%` : null, note: "audit spacing (value + scale adoption)" };
    }
    return documented
      ? { key: e.key, label: e.label, status: "documented", measure: null, note: "page de référence publiée" }
      : { key: e.key, label: e.label, status: "missing", measure: null, note: "attendu dans un DS mature — page absente" };
  });

  return { provider: "foundations", domains };
}
