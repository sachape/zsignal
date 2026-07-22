// Formatage des scores — partagé par les providers et par les pages Health.
//
// `100%` doit vouloir dire CENT POUR CENT. Un arrondi classique affiche 100%
// pour 655/657 (99,7 %) : le rapport dirait « fondation entièrement adoptée »
// alors qu'il reste deux usages à corriger. On plafonne donc à 99% tant que le
// ratio n'est pas exactement 1 — et symétriquement à 1% tant qu'il n'est pas 0.
export function pctSafe(n) {
  if (n == null || Number.isNaN(n)) return null;
  if (n >= 1) return "100%";
  if (n <= 0) return "0%";
  return `${Math.min(99, Math.max(1, Math.round(n * 100)))}%`;
}
