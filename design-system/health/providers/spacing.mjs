// Provider Spacing — assemble collecte → classement → confidence → scoring →
// rapport conforme au contrat. Aucune écriture de fichier ici (rôle de run.mjs).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { collectFiles, describeScope, ROOT } from "../core/walk.mjs";
import { collectFromTsx, collectFromCss } from "./spacing.collect.mjs";
import { classify, recommend } from "./spacing.scale.mjs";
import { STATUS, SYSTEM, CONFIDENCE_WEIGHT, SCHEMA_VERSION } from "../contract.mjs";

const EXCEPTIONS_PATH = resolve(ROOT, "design-system/health/exceptions.json");
function loadExceptions() {
  if (!existsSync(EXCEPTIONS_PATH)) return [];
  try { return JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")).spacing ?? []; } catch { return []; }
}
function matchesException(f, exceptions) {
  return exceptions.find((e) =>
    (!e.file || f.file === e.file) &&
    (!e.property || f.property === e.property) &&
    (e.value == null || Math.abs(f.px) === e.value));
}

function confidenceOf(f, status) {
  if (status === STATUS.UNCLASSIFIED) return "low";
  if (f.negative) return "low";                    // marges négatives = souvent technique
  if (f.category === "position") return "medium";  // top/inset = spacing OU positionnement
  if (f.system === SYSTEM.TOKEN) return "medium";  // valeur non résolue statiquement
  return "high";
}

export function runSpacing() {
  const files = collectFiles();
  const exceptions = loadExceptions();
  const findings = [];
  let parseErrors = 0;

  for (const file of files) {
    const res = file.kind === "css" ? collectFromCss(file.code, file.file) : collectFromTsx(file.code, file.file);
    if (res.parseError) { parseErrors++; continue; }
    for (const c of res.candidates) {
      let status;
      if (c.system === SYSTEM.TOKEN) status = STATUS.COMPLIANT;      // passe par un token → conforme+adopté
      else if (c.px == null) status = STATUS.UNCLASSIFIED;
      else status = classify(c.px);
      const exc = status !== STATUS.COMPLIANT ? matchesException(c, exceptions) : null;
      if (exc) status = STATUS.EXCEPTION;
      const confidence = confidenceOf(c, status);
      findings.push({
        file: c.file, line: c.line, property: c.property, value: c.px == null ? c.value : `${c.px}px`,
        status, system: c.system, track: file.track, category: c.category, confidence,
        recommended: (status === STATUS.VIOLATION || status === STATUS.NEEDS_DECISION) ? recommend(c.px) : [],
        reason: reasonFor(status, c),
        exception: exc ? { reason: exc.reason, owner: exc.owner } : undefined,
      });
    }
  }

  // --- Agrégats & scores ---
  const by = (s) => findings.filter((f) => f.status === s).length;
  const compliant = by(STATUS.COMPLIANT), needsDecision = by(STATUS.NEEDS_DECISION),
    violations = by(STATUS.VIOLATION), exc = by(STATUS.EXCEPTION), unclassified = by(STATUS.UNCLASSIFIED);
  const detected = findings.length;
  const classifiable = compliant + needsDecision + violations + exc;
  const adopted = findings.filter((f) => (f.system === SYSTEM.SCALE || f.system === SYSTEM.TOKEN) && f.status !== STATUS.UNCLASSIFIED).length;

  const pct = (n, d) => (d === 0 ? 1 : +(n / d).toFixed(4));
  const valueCompliance = pct(compliant + exc, classifiable);
  const tokenAdoption = pct(adopted, classifiable);
  const health = +(0.7 * valueCompliance + 0.3 * tokenAdoption).toFixed(4);

  // Confidence = moyenne pondérée de la fiabilité par item (les non-classifiables tirent vers le bas).
  const confSum = findings.reduce((s, f) => s + CONFIDENCE_WEIGHT[f.confidence], 0);
  const confidenceValue = pct(confSum, detected);
  const lowConf = findings.filter((f) => f.confidence === "low").length;

  return {
    reportVersion: SCHEMA_VERSION,
    provider: "spacing",
    generatedAt: new Date().toISOString(),
    scope: { ...describeScope(files), parseErrors },
    totals: {
      detected, compliant, needsDecision, violations, exceptions: exc, unclassified, classifiable,
      byTrack: {
        error: findings.filter((f) => f.track === "error").length,
        warn: findings.filter((f) => f.track === "warn").length,
      },
      violationsByTrack: {
        error: findings.filter((f) => f.track === "error" && f.status === STATUS.VIOLATION).length,
        warn: findings.filter((f) => f.track === "warn" && f.status === STATUS.VIOLATION).length,
      },
    },
    scores: { valueCompliance, tokenAdoption, health },
    confidence: {
      value: confidenceValue,
      classifiableRatio: pct(classifiable, detected),
      unclassified, exceptions: exc, lowConfidence: lowConf,
      note: "Confidence = moyenne pondérée de la fiabilité par item (high=1, medium=0.6, low=0.3). Baisse avec les usages non classifiables (dynamiques, %, calc), les positionnements ambigus (top/inset) et les marges négatives.",
    },
    distribution: {
      byValue: tally(findings.filter((f) => f.status === STATUS.VIOLATION || f.status === STATUS.NEEDS_DECISION), (f) => f.value),
      bySystem: tally(findings, (f) => f.system),
      byStatus: tally(findings, (f) => f.status),
    },
    byProperty: groupCount(findings, (f) => f.property),
    topOffenders: groupOffenders(findings),
    topValues: Object.entries(tally(findings.filter((f) => f.status === STATUS.VIOLATION), (f) => f.value)).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([value, count]) => ({ value, count })),
    findings,
    recommendations: buildRecs({ violations, needsDecision, tokenAdoption }),
  };
}

function reasonFor(status, c) {
  if (status === STATUS.COMPLIANT) return c.system === SYSTEM.TOKEN ? "passe par un token" : "sur l'échelle 8/4";
  if (status === STATUS.NEEDS_DECISION) return "multiple de 4 mais hors grille 8 (décision requise)";
  if (status === STATUS.VIOLATION) return c.system === SYSTEM.ARBITRARY || c.system === SYSTEM.INLINE ? "valeur brute hors système" : "hors grille 8/4";
  if (status === STATUS.UNCLASSIFIED) return "non résoluble statiquement (%/calc/dynamique)";
  if (status === STATUS.EXCEPTION) return "dérogation documentée";
  return "";
}
function tally(arr, key) { const m = {}; for (const x of arr) { const k = key(x); m[k] = (m[k] || 0) + 1; } return m; }
function groupCount(findings, key) {
  const m = {};
  for (const f of findings) { const k = key(f); (m[k] ||= { total: 0, violations: 0, needsDecision: 0 }); m[k].total++; if (f.status === STATUS.VIOLATION) m[k].violations++; if (f.status === STATUS.NEEDS_DECISION) m[k].needsDecision++; }
  return Object.entries(m).map(([property, v]) => ({ property, ...v })).sort((a, b) => b.violations - a.violations);
}
function groupOffenders(findings) {
  const m = {};
  for (const f of findings) { if (f.status !== STATUS.VIOLATION && f.status !== STATUS.NEEDS_DECISION) continue; (m[f.file] ||= { file: f.file, violations: 0, needsDecision: 0, track: f.track }); if (f.status === STATUS.VIOLATION) m[f.file].violations++; else m[f.file].needsDecision++; }
  return Object.values(m).sort((a, b) => b.violations - a.violations).slice(0, 15);
}
function buildRecs({ violations, needsDecision, tokenAdoption }) {
  const r = [];
  if (violations) r.push(`${violations} violations hors grille à migrer (progressif, validation visuelle Chromatic).`);
  if (needsDecision) r.push(`${needsDecision} usages 12/20/28px « needs-decision » : trancher après revue (garder / migrer / exception).`);
  if (tokenAdoption < 0.5) r.push("Adoption des tokens faible : le spacing passe par l'échelle Tailwind, pas par var(--space-*). Décision Model A (fin P6) : contraindre l'échelle Tailwind aux tokens.");
  return r;
}
