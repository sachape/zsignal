// Contrat de données Health — versionné. Le Dashboard et la CI ne lisent QUE
// des rapports conformes à ce contrat ; ils ne recalculent jamais rien.
//
// Un rapport = un « provider » (spacing, accessibility, …) produisant le même
// enveloppe. Ajouter un provider = ajouter un fichier report conforme, sans
// toucher au Dashboard.

export const SCHEMA_VERSION = 1;

// Statuts possibles d'un usage détecté. PREFERRED, COMPACT_ALLOWED et EXCEPTION
// comptent conformes ; ils restent DISTINGUÉS (transparence : ne pas masquer que
// le score monte via la sous-grille compacte).
export const STATUS = Object.freeze({
  PREFERRED: "preferred",             // échelle principale (0,8,16,24…) — défaut
  COMPACT_ALLOWED: "compact-allowed", // sous-grille compacte (4,12,20) — secondaire
  VIOLATION: "violation",             // hors échelle (2/6/10/14/28/36/44…, négatifs non documentés)
  EXCEPTION: "exception",             // dérogation documentée (exceptions.json)
  NEEDS_DECISION: "needs-decision",   // valeur pas encore arbitrée (doit être 0 après P6)
  UNCLASSIFIED: "unclassified",       // impossible à classer (dynamique, %, calc…)
});
// Statuts comptés comme conformes dans « value compliance ».
export const COMPLIANT_STATUSES = Object.freeze([STATUS.PREFERRED, STATUS.COMPACT_ALLOWED, STATUS.EXCEPTION]);

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
  for (const k of ["valueCompliance", "scaleAdoption", "health"]) {
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
