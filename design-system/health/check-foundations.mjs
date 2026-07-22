// Garde-fou FONDATIONS — anti-régression (ratchet), calqué sur `check:spacing`.
//
// Mesurer ne suffit pas : sans garde-fou, un taux d'adoption ne fait que
// documenter la dérive. Ce script échoue si le nombre d'usages HORS ÉCHELLE
// augmente pour une fondation, quelle qu'elle soit (typographie, radius,
// ombres, motion, couleurs, bordures, élévation, opacité, grille, icônes).
//
// Il ratchette sur des COMPTES ABSOLUS, pas sur des pourcentages : un taux
// remonte tout seul quand le dénominateur grossit, un compte non. Ajouter
// 50 usages conformes ne doit pas donner le droit d'ajouter 5 violations.
//
// La dette historique NE BLOQUE PAS (la baseline la gèle). Une baisse est
// autorisée sans mise à jour. Relever la baseline (`npm run baseline:foundations`)
// = accepter volontairement une nouvelle dette, avec justification en commit.
//
// Usage :
//   node design-system/health/check-foundations.mjs            → vérifie (exit 1 si régression)
//   node design-system/health/check-foundations.mjs --freeze   → fige la baseline

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, collectFiles } from "./core/walk.mjs";
import { runFoundationsAdoption } from "./providers/foundations.adoption.mjs";

const HIST = resolve(ROOT, "reports/design-system/history");
const BASELINE = resolve(HIST, "foundations-baseline.json");

// `darkmode` mesure une couverture de tokens, pas des usages dans le code :
// son « off » ne se corrige pas en éditant un composant. Hors ratchet.
const RATCHETED = ["typography", "radius", "shadow", "motion", "colors", "borders", "elevation", "opacity", "grid", "icons"];

const LABEL = {
  typography: "Typographie", radius: "Radius", shadow: "Ombres", motion: "Motion",
  colors: "Couleurs", borders: "Bordures", elevation: "Élévation", opacity: "Opacité",
  grid: "Grille", icons: "Icônes",
};

function measure() {
  const r = runFoundationsAdoption(collectFiles());
  const off = {};
  for (const k of RATCHETED) off[k] = r.byFoundation[k]?.off ?? 0;
  return { report: r, off };
}

function freeze({ report, off }) {
  mkdirSync(HIST, { recursive: true });
  const data = {
    $doc: "Baseline de dette des fondations. check:foundations échoue si le nombre d'usages hors échelle AUGMENTE pour une fondation. Une baisse est autorisée SANS mise à jour. Ne relever ce fichier (npm run baseline:foundations) QUE pour accepter volontairement une nouvelle dette — avec justification en commit.",
    frozenAt: new Date().toISOString(),
    off,
    adoption: Object.fromEntries(RATCHETED.map((k) => [k, report.byFoundation[k]?.adoption ?? null])),
  };
  writeFileSync(BASELINE, JSON.stringify(data, null, 2) + "\n");
  console.log(`baseline fondations figée → ${BASELINE}`);
  for (const k of RATCHETED) console.log(`  ${LABEL[k].padEnd(12)} ${off[k]} hors échelle`);
}

function check({ report, off }) {
  if (!existsSync(BASELINE)) {
    console.log("check: pas de baseline fondations — mode observation (aucun blocage).");
    console.log("Fige-la avec 'npm run baseline:foundations' pour activer le garde-fou.");
    return 0;
  }
  let base;
  try { base = JSON.parse(readFileSync(BASELINE, "utf8")); } catch {
    console.error("::error::Baseline fondations illisible.");
    return 1;
  }

  const problems = [];
  for (const k of RATCHETED) {
    const ref = base.off?.[k];
    if (ref == null) continue; // fondation ajoutée après la baseline : pas de référence, on n'invente pas
    if (off[k] > ref) {
      const top = (report.byFoundation[k]?.topOffenders ?? []).slice(0, 3).map((o) => `${o.value} ×${o.count}`).join(", ");
      problems.push(`${LABEL[k]} : ${off[k]} hors échelle > baseline ${ref}${top ? ` — en tête : ${top}` : ""}`);
    }
  }

  if (problems.length) {
    console.error(`::error::Régression fondations : ${problems.length} fondation(s) en hausse.`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error("Repasse ces usages sur l'échelle gouvernée, ou accepte la dette explicitement");
    console.error("via 'npm run baseline:foundations' + commit justifié.");
    return 1;
  }

  const improved = RATCHETED.filter((k) => base.off?.[k] != null && off[k] < base.off[k]);
  console.log(`check: OK — aucune fondation en régression sur ${RATCHETED.length} mesurées.`);
  if (improved.length) {
    console.log(`  ↓ en baisse : ${improved.map((k) => `${LABEL[k]} ${base.off[k]}→${off[k]}`).join(" · ")}`);
    console.log("  (baisse autorisée sans mise à jour de la baseline)");
  }
  return 0;
}

const m = measure();
process.exit(process.argv.includes("--freeze") ? (freeze(m), 0) : check(m));
