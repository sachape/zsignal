// Contrat de données Health — versionné. Le Dashboard et la CI ne lisent QUE
// des rapports conformes à ce contrat ; ils ne recalculent jamais rien.
//
// Un rapport = un « provider » (spacing, accessibility, …) produisant le même
// enveloppe. Ajouter un provider = ajouter un fichier report conforme, sans
// toucher au Dashboard.

export const SCHEMA_VERSION = 1;

// Statuts possibles d'un usage détecté.
export const STATUS = Object.freeze({
  COMPLIANT: "compliant",         // respecte la règle
  NEEDS_DECISION: "needs-decision", // sur la grille 4 mais hors 8 (12/20/28…)
  VIOLATION: "violation",         // hors grille (2/6/10/14…) ou arbitraire non conforme
  EXCEPTION: "exception",         // dérogation documentée (exceptions.json)
  UNCLASSIFIED: "unclassified",   // impossible à classer (dynamique, %, calc…)
});

// Comment la valeur entre dans le système (pour « token/scale adoption »).
export const SYSTEM = Object.freeze({
  SCALE: "scale-utility",   // classe Tailwind d'échelle (p-4, gap-2…)
  TOKEN: "token-var",       // var(--space-*) (adoption maximale)
  ARBITRARY: "arbitrary",   // p-[18px] — valeur brute hors système
  INLINE: "inline",         // style={{ padding: 18 }}
  RAW_CSS: "raw-css",       // déclaration CSS brute
});

export const CONFIDENCE_WEIGHT = Object.freeze({ high: 1, medium: 0.6, low: 0.3 });

/** Valide la forme minimale d'un rapport provider avant écriture. Jette si invalide. */
export function assertReport(report) {
  const required = [
    "reportVersion", "provider", "generatedAt", "scope",
    "totals", "scores", "confidence", "findings",
  ];
  for (const k of required) {
    if (!(k in report)) throw new Error(`Rapport Health invalide : champ manquant « ${k} »`);
  }
  if (report.reportVersion !== SCHEMA_VERSION) {
    throw new Error(`reportVersion ${report.reportVersion} ≠ contrat ${SCHEMA_VERSION}`);
  }
  const s = report.scores;
  for (const k of ["valueCompliance", "tokenAdoption", "health"]) {
    if (typeof s[k] !== "number") throw new Error(`scores.${k} doit être un nombre`);
  }
  if (typeof report.confidence.value !== "number") throw new Error("confidence.value doit être un nombre");
  return report;
}

/** Enveloppe d'agrégat lue par le Dashboard : plusieurs providers + méta de fraîcheur. */
export function buildSummary(providers) {
  return {
    reportVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    providers: providers.map((p) => ({
      provider: p.provider,
      generatedAt: p.generatedAt,
      scores: p.scores,
      confidence: p.confidence,
      totals: p.totals,
      status: p.status ?? null,
    })),
  };
}
