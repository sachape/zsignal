// Garde-fou DETTE COMPOSANTS — anti-régression (ratchet), calqué sur `check:foundations`.
//
// Mesurer la dette (rawElements : <button|input|select|textarea> natifs hors DS) ne
// suffit pas : sans garde-fou, elle ne fait que se documenter. Ce script échoue si le
// nombre de bruts AUGMENTE pour une balise, quelle qu'elle soit.
//
// Il ratchette sur des COMPTES ABSOLUS par balise, pas sur un pourcentage : convertir
// 5 <button> ne donne pas le droit d'ajouter 5 <input> bruts. La dette historique NE
// BLOQUE PAS (la baseline la gèle). Une baisse est autorisée sans mise à jour. Relever
// la baseline (`npm run baseline:components`) = accepter volontairement une nouvelle
// dette, avec justification en commit.
//
// Périmètre = strictement celui du provider adoption (ADR 0005) : <input type="file">
// caché (upload par ref) n'est pas compté, la surface marketing est exemptée.
//
// Usage :
//   node design-system/health/check-components.mjs            → vérifie (exit 1 si régression)
//   node design-system/health/check-components.mjs --freeze   → fige la baseline

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./core/walk.mjs";
import { runAdoption } from "./providers/adoption.mjs";

const HIST = resolve(ROOT, "reports/design-system/history");
const BASELINE = resolve(HIST, "components-baseline.json");

const RATCHETED = ["button", "input", "select", "textarea"];
const LABEL = { button: "<button>", input: "<input>", select: "<select>", textarea: "<textarea>" };

function measure() {
  const report = runAdoption();
  const raw = {};
  for (const k of RATCHETED) raw[k] = report.rawByTag?.[k] ?? 0;
  return { report, raw };
}

function freeze({ report, raw }) {
  mkdirSync(HIST, { recursive: true });
  const data = {
    $doc: "Baseline de dette composants (éléments natifs hors Design System). check:components échoue si le nombre de bruts AUGMENTE pour une balise. Une baisse est autorisée SANS mise à jour. Ne relever ce fichier (npm run baseline:components) QUE pour accepter volontairement une nouvelle dette — avec justification en commit.",
    frozenAt: new Date().toISOString(),
    raw,
    total: report.rawElements ?? Object.values(raw).reduce((a, b) => a + b, 0),
  };
  writeFileSync(BASELINE, JSON.stringify(data, null, 2) + "\n");
  console.log(`baseline composants figée → ${BASELINE}`);
  for (const k of RATCHETED) console.log(`  ${LABEL[k].padEnd(12)} ${raw[k]} bruts`);
}

function check({ raw }) {
  if (!existsSync(BASELINE)) {
    console.log("check: pas de baseline composants — mode observation (aucun blocage).");
    console.log("Fige-la avec 'npm run baseline:components' pour activer le garde-fou.");
    return 0;
  }
  let base;
  try { base = JSON.parse(readFileSync(BASELINE, "utf8")); } catch {
    console.error("::error::Baseline composants illisible.");
    return 1;
  }

  const problems = [];
  for (const k of RATCHETED) {
    const ref = base.raw?.[k];
    if (ref == null) continue; // balise ajoutée après la baseline : pas de référence, on n'invente pas
    if (raw[k] > ref) problems.push(`${LABEL[k]} : ${raw[k]} bruts > baseline ${ref}`);
  }

  if (problems.length) {
    console.error(`::error::Régression dette composants : ${problems.length} balise(s) en hausse.`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error("Passe ces éléments sur un composant DS, ou accepte la dette explicitement");
    console.error("via 'npm run baseline:components' + commit justifié.");
    return 1;
  }

  const improved = RATCHETED.filter((k) => base.raw?.[k] != null && raw[k] < base.raw[k]);
  console.log(`check: OK — aucune balise en régression sur ${RATCHETED.length} mesurées.`);
  if (improved.length) {
    console.log(`  ↓ en baisse : ${improved.map((k) => `${LABEL[k]} ${base.raw[k]}→${raw[k]}`).join(" · ")}`);
    console.log("  (baisse autorisée sans mise à jour de la baseline)");
  }
  return 0;
}

const m = measure();
process.exit(process.argv.includes("--freeze") ? (freeze(m), 0) : check(m));
