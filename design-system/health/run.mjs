// Orchestrateur Health — exécute les providers, valide le contrat, écrit les
// rapports versionnés (JSON machine + MD humain + snapshot d'historique).
// Usage : node design-system/health/run.mjs [--check]
//   (sans flag) : génère/rafraîchit les rapports (read-only sur le code).
//   --check     : compare aux violations baseline, sort 1 si NOUVELLE violation.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./core/walk.mjs";
import { assertReport, buildSummary } from "./contract.mjs";
import { runSpacing } from "./providers/spacing.mjs";
import { runAccessibility } from "./providers/accessibility.mjs";

const OUT = resolve(ROOT, "reports/design-system");
const HIST = resolve(OUT, "history");
const EXC = resolve(ROOT, "design-system/health/exceptions.json");

function ensureDirs() { mkdirSync(HIST, { recursive: true }); }
function seedExceptions() {
  if (existsSync(EXC)) return;
  writeFileSync(EXC, JSON.stringify({
    $schema: "health exceptions v1",
    $doc: "Dérogations documentées. Une exception compte comme conforme. Champs : value(px), file, property, reason, owner, date, review.",
    spacing: [],
  }, null, 2) + "\n");
}

function spacingMarkdown(r) {
  const pc = (n) => `${(n * 100).toFixed(1)}%`;
  const t = r.totals;
  const lines = [
    `# Spacing Health — rapport humain`, ``,
    `> Généré le ${r.generatedAt} · contrat v${r.reportVersion} · **read-only** (aucune migration).`, ``,
    `## Score`, ``,
    `| Indicateur | Valeur |`, `|---|---|`,
    `| **Spacing Health** | **${pc(r.scores.health)}** |`,
    `| Spacing value compliance | ${pc(r.scores.valueCompliance)} |`,
    `| Scale adoption (échelle, pas var(--space-*)) | ${pc(r.scores.scaleAdoption)} |`,
    `| CSS token adoption (var(--space-*)) | ${pc(r.scores.cssVarAdoption)} |`,
    `| **Confidence** | **${pc(r.confidence.value)}** |`, ``,
    `_${r.confidence.note}_`, ``,
    `## Totaux`, ``,
    `- Usages détectés : **${t.detected}** (classifiables : ${t.classifiable})`,
    `- **Preferred** (échelle principale) : ${t.preferred} · **Compact-allowed** (4/12/20, secondaire) : **${t.compactAllowed}** · Exceptions : ${t.exceptions}`,
    `- **Violations** : **${t.violations}** · Needs-decision : ${t.needsDecision} · Non classifiés : ${t.unclassified}`,
    `- Compact-allowed détaillé — ${Object.entries(r.compactBreakdown.byValue).map(([v, n]) => `${v} × ${n}`).join(" · ")}`,
    `- Violations par piste — cœur DS (ERROR) : **${t.violationsByTrack.error}** · app (WARN) : ${t.violationsByTrack.warn}`, ``,
    `> ⚠ Transparence : preferred et compact-allowed comptent tous deux conformes, mais **${t.compactAllowed}** usages reposent sur la sous-grille compacte — préférer l'échelle principale.`, ``,
    `## Top valeurs hors-échelle (violations)`, ``,
    ...r.topValues.map((v) => `- \`${v.value}\` × ${v.count}`), ``,
    `## Composants/fichiers les plus touchés`, ``,
    ...r.topOffenders.slice(0, 10).map((o) => `- ${o.violations ? `**${o.violations} viol.**` : ""}${o.compactAllowed ? ` ${o.compactAllowed} compact` : ""} — \`${o.file}\` _(${o.track})_`), ``,
    `## Recommandations`, ``,
    ...r.recommendations.map((x) => `- ${x}`), ``,
    `## Périmètre`, ``,
    `- Fichiers scannés : ${r.scope.filesScanned} (cœur ERROR : ${r.scope.errorTrackFiles} · app WARN : ${r.scope.warnTrackFiles})`,
    `- Erreurs de parsing : ${r.scope.parseErrors}`,
  ];
  return lines.join("\n") + "\n";
}

const BASELINE = resolve(HIST, "spacing-baseline.json");
function loadBaseline() {
  if (!existsSync(BASELINE)) return null;
  try { return JSON.parse(readFileSync(BASELINE, "utf8")); } catch { return null; }
}
function freezeBaseline(spacing) {
  const t = spacing.totals;
  const data = {
    $doc: "Baseline de dette spacing. check:spacing échoue si violations OU compact-allowed AUGMENTENT. Une baisse est autorisée SANS mise à jour. Ne relever ce fichier (npm run baseline:spacing) QUE pour accepter volontairement une nouvelle dette — avec justification en commit.",
    frozenAt: new Date().toISOString(),
    violations: t.violations,
    compactAllowed: t.compactAllowed,
    violationsByTrack: t.violationsByTrack,
    scores: spacing.scores,
  };
  writeFileSync(BASELINE, JSON.stringify(data, null, 2) + "\n");
  console.log(`baseline figée : violations ${t.violations}, compact-allowed ${t.compactAllowed} → ${BASELINE}`);
}

function main() {
  ensureDirs();
  seedExceptions();
  const check = process.argv.includes("--check");
  const freeze = process.argv.includes("--freeze");

  const spacing = assertReport(runSpacing());
  const a11y = runAccessibility();
  const summary = buildSummary([spacing, a11y]);

  // Le rapport persisté ne liste que les usages NON conformes (les conformes sont
  // agrégés dans totals) — garde le fichier exploitable sans le faire exploser.
  // On liste tout SAUF « preferred » (le gros du volume) : violations, compact-allowed
  // (transparence), exceptions, non classifiés restent visibles.
  const persisted = { ...spacing, findings: spacing.findings.filter((f) => f.status !== "preferred"), findingsNote: `${spacing.totals.preferred} usages preferred agrégés dans totals, non listés.` };
  writeFileSync(resolve(OUT, "spacing-health.json"), JSON.stringify(persisted, null, 2) + "\n");
  // Résumé SLIM (sans findings) pour le Dashboard Storybook — évite d'embarquer
  // ~800 Ko dans le bundle. Le Dashboard ne lit QUE des agrégats.
  const { findings: _drop, ...spacingSlim } = spacing;
  writeFileSync(resolve(OUT, "spacing-health.summary.json"), JSON.stringify(spacingSlim, null, 2) + "\n");
  writeFileSync(resolve(OUT, "spacing-health.md"), spacingMarkdown(spacing));
  writeFileSync(resolve(OUT, "accessibility-health.json"), JSON.stringify(a11y, null, 2) + "\n");
  writeFileSync(resolve(OUT, "health-summary.json"), JSON.stringify(summary, null, 2) + "\n");

  const stamp = new Date().toISOString().slice(0, 10);
  writeFileSync(resolve(HIST, `spacing-${stamp}.json`), JSON.stringify({ generatedAt: spacing.generatedAt, scores: spacing.scores, totals: spacing.totals, confidence: spacing.confidence }, null, 2) + "\n");

  const s = spacing.scores, c = spacing.confidence;
  console.log(`Spacing Health ${(s.health * 100).toFixed(1)}% | value ${(s.valueCompliance * 100).toFixed(1)}% | scale-adoption ${(s.scaleAdoption * 100).toFixed(1)}% | confidence ${(c.value * 100).toFixed(1)}%`);
  console.log(`détectés ${spacing.totals.detected} · preferred ${spacing.totals.preferred} · compact-allowed ${spacing.totals.compactAllowed} · violations ${spacing.totals.violations} (cœur ${spacing.totals.violationsByTrack.error}) · exceptions ${spacing.totals.exceptions} · needs-decision ${spacing.totals.needsDecision}`);

  if (freeze) { freezeBaseline(spacing); return; }

  if (check) {
    const base = loadBaseline();
    if (!base) { console.log("check: pas de baseline — mode observation (aucun blocage)."); return; }
    const t = spacing.totals;
    const problems = [];
    if (t.violations > base.violations)
      problems.push(`violations ${t.violations} > baseline ${base.violations} (nouvelle dette hors-échelle)`);
    if (t.compactAllowed > base.compactAllowed)
      problems.push(`compact-allowed ${t.compactAllowed} > baseline ${base.compactAllowed} — ne pas remplacer violation→compact ; viser preferred`);
    if (problems.length) {
      console.error(`::error::Spacing régression : ${problems.join(" ; ")}.`);
      console.error("Corrige la régression, ou accepte-la explicitement via 'npm run baseline:spacing' + commit justifié.");
      process.exit(1);
    }
    console.log(`check: OK — violations ${t.violations} ≤ ${base.violations} · compact-allowed ${t.compactAllowed} ≤ ${base.compactAllowed}. (baisse autorisée sans mise à jour)`);
  }
}

main();
