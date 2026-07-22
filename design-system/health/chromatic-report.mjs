// Écrit le rapport Visual Quality attendu par `providers/visual-quality.mjs`,
// à partir des sorties de l'action Chromatic. Appelé par .github/workflows/chromatic.yml
// après un build RÉUSSI sur main.
//
// Pourquoi un script et pas un heredoc dans le YAML : la forme du rapport est un
// CONTRAT (le provider la lit), elle doit vivre dans le code, être validée, et
// échouer bruyamment si Chromatic change ses sorties — pas produire un JSON
// invalide qu'un provider avalerait en silence.
//
// Le rapport ne contient PAS l'URL du build : elle change à chaque exécution,
// ce qui provoquerait un commit à chaque push. Ici le fichier ne bouge que si
// un chiffre bouge réellement.
//
// Usage : node design-system/health/chromatic-report.mjs
//   env : CHROMATIC_SPEC_COUNT, CHROMATIC_CHANGE_COUNT, CHROMATIC_ERROR_COUNT

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./core/walk.mjs";

const OUT = resolve(ROOT, "reports/design-system");

function intFromEnv(name) {
  const raw = process.env[name];
  if (raw == null || raw === "") throw new Error(`${name} absent : sortie Chromatic manquante ou renommée.`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name}="${raw}" n'est pas un entier positif.`);
  return n;
}

const specs = intFromEnv("CHROMATIC_SPEC_COUNT");
const changes = intFromEnv("CHROMATIC_CHANGE_COUNT");
const errors = intFromEnv("CHROMATIC_ERROR_COUNT");

// Sur main, `autoAcceptChanges: main` fait de ce build la baseline : dès qu'il
// passe, la référence EST établie. Les diffs y sont acceptés automatiquement —
// d'où `approved: changeCount`. Ce qui reste anormal, ce sont les stories en
// erreur (`errorCount`), pas les diffs.
const report = {
  reportVersion: 1,
  generatedFor: "main",
  baseline: "established",
  regression: errors === 0 ? "pass" : "fail",
  snapshots: specs,
  approved: changes,
  unexpected: errors,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "visual-quality.report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Visual Quality : ${report.regression.toUpperCase()} · ${specs} stories · ${changes} acceptés · ${errors} en erreur`);
