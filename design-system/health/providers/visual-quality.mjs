// Provider Visual Quality — domaine DURABLE (pas un provider "Chromatic baseline"
// jetable). Une baseline n'est qu'un état transitoire ; ce domaine doit rester
// pertinent des années. Il expose une famille de sous-métriques qui passeront de
// missing/planned → measured au fil du temps, sans changer d'architecture.
//
// Source réelle : un rapport OPTIONNEL produit par la CI Chromatic
// (reports/design-system/visual-quality.report.json). Tant qu'il n'existe pas, le
// provider dégrade honnêtement : Chromatic est "documented" (workflow câblé),
// baseline/regression "missing" (Chromatic installé → attendu), et la télémétrie
// fine (snapshots, changes) "planned". Le jour où la CI écrit ce fichier, chaque
// sous-métrique bascule automatiquement en "measured".
//
// Forme attendue (future) du rapport CI :
//   { baseline: "established", regression: "pass"|"fail",
//     snapshots: <int>, approved: <int>, unexpected: <int>, build: "<url>" }

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../core/walk.mjs";

const CHROMATIC_WF = resolve(ROOT, ".github/workflows/chromatic.yml");
const REPORT = resolve(ROOT, "reports/design-system/visual-quality.report.json");

function readReport() {
  if (!existsSync(REPORT)) return null;
  try { return JSON.parse(readFileSync(REPORT, "utf8")); } catch { return null; }
}

export function runVisualQuality() {
  const wired = existsSync(CHROMATIC_WF);
  const r = readReport();

  // Un cran "attendu mais absent" (missing) si l'outil est là ; sinon "planned".
  const gapWhenWired = wired ? "missing" : "planned";

  const metrics = [
    {
      key: "chromatic",
      label: "Chromatic",
      status: wired ? "documented" : "planned",
      measure: wired ? "Câblé" : null,
      note: wired ? "workflow chromatic.yml présent" : "intégration Chromatic non câblée",
    },
    {
      key: "baseline",
      label: "Baseline",
      status: r?.baseline === "established" ? "measured" : gapWhenWired,
      measure: r?.baseline === "established" ? "Établie" : null,
      note: r?.baseline === "established" ? "baseline visuelle acceptée" : "aucune baseline acceptée à ce jour",
    },
    {
      key: "regression",
      label: "Visual regression",
      status: r?.regression ? "measured" : gapWhenWired,
      measure: r?.regression ? (r.regression === "pass" ? "PASS" : "FAIL") : null,
      note: "diff visuel automatique par story — dépend de la baseline",
    },
    {
      key: "snapshots",
      label: "Snapshot coverage",
      status: r?.snapshots != null ? "measured" : "planned",
      measure: r?.snapshots != null ? `${r.snapshots} stories` : null,
      note: "part des stories capturées par build",
    },
    {
      key: "approved",
      label: "Approved changes",
      status: r?.approved != null ? "measured" : "planned",
      measure: r?.approved != null ? String(r.approved) : null,
      note: "changements visuels revus et acceptés (dernier build)",
    },
    {
      key: "unexpected",
      label: "Unexpected changes",
      status: r?.unexpected != null ? "measured" : "planned",
      measure: r?.unexpected != null ? String(r.unexpected) : null,
      note: "régressions visuelles non intentionnelles (dernier build)",
    },
  ];

  return { provider: "visualQuality", wired, hasReport: Boolean(r), metrics };
}
