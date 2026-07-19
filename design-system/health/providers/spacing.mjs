// Provider Spacing — collecte → classement (tiers) → confidence → scoring →
// rapport conforme au contrat. Aucune écriture de fichier ici (rôle de run.mjs).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { collectFiles, describeScope, ROOT } from "../core/walk.mjs";
import { collectFromTsx, collectFromCss } from "./spacing.collect.mjs";
import { classifyTier, recommendPreferred } from "./spacing.scale.mjs";
import { STATUS, COMPLIANT_STATUSES, SYSTEM, CONFIDENCE_WEIGHT, SCHEMA_VERSION } from "../contract.mjs";

const EXCEPTIONS_PATH = resolve(ROOT, "design-system/health/exceptions.json");
function loadExceptions() {
  if (!existsSync(EXCEPTIONS_PATH)) return [];
  try { return JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")).spacing ?? []; } catch { return []; }
}
// Match par valeur SIGNÉE (une exception -12 ne doit pas couvrir le 12px compact-allowed).
function matchesException(f, exceptions) {
  return exceptions.find((e) =>
    (!e.file || f.file === e.file) &&
    (!e.property || f.property === e.property) &&
    (e.value == null || f.px === e.value));
}

const TIER_TO_STATUS = {
  preferred: STATUS.PREFERRED,
  "compact-allowed": STATUS.COMPACT_ALLOWED,
  violation: STATUS.VIOLATION,
  unclassified: STATUS.UNCLASSIFIED,
};

function confidenceOf(f, status) {
  if (status === STATUS.UNCLASSIFIED) return "low";
  if (f.negative) return "low";
  if (f.category === "position") return "medium";
  if (f.system === SYSTEM.TOKEN) return "medium";
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
      if (c.system === SYSTEM.TOKEN) status = STATUS.PREFERRED;   // token = échelle principale assumée
      else if (c.px == null) status = STATUS.UNCLASSIFIED;
      else status = TIER_TO_STATUS[classifyTier(c.px)];
      // Exception documentée (surtout négatifs de positionnement) → conforme et
      // TRACÉE. S'applique aussi au compact (ex : -12px documenté devient exception).
      const exc = status !== STATUS.PREFERRED ? matchesException(c, exceptions) : null;
      if (exc) status = STATUS.EXCEPTION;
      findings.push({
        file: c.file, line: c.line, property: c.property, value: c.px == null ? c.value : `${c.px}px`,
        status, tier: status, system: c.system, track: file.track, category: c.category,
        confidence: confidenceOf(c, status),
        recommended: status === STATUS.VIOLATION ? recommendPreferred(c.px) : [],
        reason: reasonFor(status, c),
        exception: exc ? { reason: exc.reason, owner: exc.owner, date: exc.date } : undefined,
      });
    }
  }

  // --- Agrégats & scores ---
  const by = (s) => findings.filter((f) => f.status === s).length;
  const preferred = by(STATUS.PREFERRED), compactAllowed = by(STATUS.COMPACT_ALLOWED),
    violations = by(STATUS.VIOLATION), exc = by(STATUS.EXCEPTION),
    needsDecision = by(STATUS.NEEDS_DECISION), unclassified = by(STATUS.UNCLASSIFIED);
  const detected = findings.length;
  const compliant = preferred + compactAllowed + exc; // value-compliant
  const classifiable = preferred + compactAllowed + violations + exc + needsDecision;
  const adopted = findings.filter((f) => (f.system === SYSTEM.SCALE || f.system === SYSTEM.TOKEN) && f.status !== STATUS.UNCLASSIFIED).length;

  const pct = (n, d) => (d === 0 ? 1 : +(n / d).toFixed(4));
  const valueCompliance = pct(compliant, classifiable);
  // « Scale adoption » = passe par le SYSTÈME (classe d'échelle Tailwind OU token) vs
  // valeur brute. ≠ adoption des tokens CSS var(--space-*), mesurée à part (cssVarAdoption).
  const scaleAdoption = pct(adopted, classifiable);
  const cssVarUses = findings.filter((f) => f.system === SYSTEM.TOKEN && f.status !== STATUS.UNCLASSIFIED).length;
  const cssVarAdoption = pct(cssVarUses, classifiable);
  const health = +(0.7 * valueCompliance + 0.3 * scaleAdoption).toFixed(4);

  const confSum = findings.reduce((s, f) => s + CONFIDENCE_WEIGHT[f.confidence], 0);
  const confidenceValue = pct(confSum, detected);
  const lowConf = findings.filter((f) => f.confidence === "low").length;

  // Transparence : détail des usages compact-allowed (ne pas masquer les 988).
  const compact = findings.filter((f) => f.status === STATUS.COMPACT_ALLOWED);
  const compactBreakdown = { total: compactAllowed, byValue: tally(compact, (f) => f.value) };

  return {
    reportVersion: SCHEMA_VERSION,
    provider: "spacing",
    generatedAt: new Date().toISOString(),
    scope: { ...describeScope(files), parseErrors },
    totals: {
      detected, preferred, compactAllowed, violations, exceptions: exc, needsDecision, unclassified, classifiable, compliant,
      byTrack: {
        error: findings.filter((f) => f.track === "error").length,
        warn: findings.filter((f) => f.track === "warn").length,
      },
      violationsByTrack: {
        error: findings.filter((f) => f.track === "error" && f.status === STATUS.VIOLATION).length,
        warn: findings.filter((f) => f.track === "warn" && f.status === STATUS.VIOLATION).length,
      },
      compactByTrack: {
        error: findings.filter((f) => f.track === "error" && f.status === STATUS.COMPACT_ALLOWED).length,
        warn: findings.filter((f) => f.track === "warn" && f.status === STATUS.COMPACT_ALLOWED).length,
      },
    },
    scores: { valueCompliance, scaleAdoption, cssVarAdoption, health },
    confidence: {
      value: confidenceValue,
      classifiableRatio: pct(classifiable, detected),
      unclassified, exceptions: exc, lowConfidence: lowConf,
      note: "Confidence = moyenne pondérée de la fiabilité par item (high=1, medium=0.6, low=0.3). Baisse avec les usages non classifiables (dynamiques, %, calc), les positionnements ambigus (top/inset) et les marges négatives.",
    },
    compactBreakdown,
    distribution: {
      byTier: tally(findings, (f) => f.status),
      byValue: tally(findings.filter((f) => f.status === STATUS.VIOLATION), (f) => f.value),
      bySystem: tally(findings, (f) => f.system),
    },
    byProperty: groupCount(findings),
    topOffenders: groupOffenders(findings),
    topValues: Object.entries(tally(findings.filter((f) => f.status === STATUS.VIOLATION), (f) => f.value)).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([value, count]) => ({ value, count })),
    findings,
    recommendations: buildRecs({ violations, compactAllowed, needsDecision }),
  };
}

function reasonFor(status, c) {
  if (status === STATUS.PREFERRED) return c.system === SYSTEM.TOKEN ? "token (échelle principale)" : "échelle principale (preferred)";
  if (status === STATUS.COMPACT_ALLOWED) return "sous-grille compacte (4/12/20) — secondaire";
  if (status === STATUS.VIOLATION) return c.system === SYSTEM.ARBITRARY || c.system === SYSTEM.INLINE ? "valeur brute hors système" : "hors échelle (préférer preferred)";
  if (status === STATUS.EXCEPTION) return "dérogation documentée";
  if (status === STATUS.UNCLASSIFIED) return "non résoluble statiquement (%/calc/dynamique)";
  return "";
}
function tally(arr, key) { const m = {}; for (const x of arr) { const k = key(x); m[k] = (m[k] || 0) + 1; } return m; }
function groupCount(findings) {
  const m = {};
  for (const f of findings) { const k = f.property; (m[k] ||= { total: 0, violations: 0, compactAllowed: 0 }); m[k].total++; if (f.status === STATUS.VIOLATION) m[k].violations++; if (f.status === STATUS.COMPACT_ALLOWED) m[k].compactAllowed++; }
  return Object.entries(m).map(([property, v]) => ({ property, ...v })).sort((a, b) => b.violations - a.violations);
}
function groupOffenders(findings) {
  const m = {};
  for (const f of findings) { if (f.status !== STATUS.VIOLATION && f.status !== STATUS.COMPACT_ALLOWED) continue; (m[f.file] ||= { file: f.file, violations: 0, compactAllowed: 0, track: f.track }); if (f.status === STATUS.VIOLATION) m[f.file].violations++; else m[f.file].compactAllowed++; }
  return Object.values(m).sort((a, b) => b.violations - a.violations).slice(0, 15);
}
function buildRecs({ violations, compactAllowed, needsDecision }) {
  const r = [];
  if (violations) r.push(`${violations} violations hors échelle à migrer — cible PREFERRED (pas compact-allowed) : 6px/2px/10px surtout.`);
  if (compactAllowed) r.push(`${compactAllowed} usages compact-allowed (4/12/20) : conformes mais SECONDAIRES. Surveiller toute hausse (ne pas remplacer violation → compact par défaut).`);
  if (needsDecision) r.push(`${needsDecision} needs-decision restants à trancher.`);
  r.push("Scale adoption élevée mais cssVarAdoption ≈0 : le spacing passe par l'échelle Tailwind, pas par var(--space-*). Model A (fin P6) : aligner Tailwind sur les tokens.");
  return r;
}
