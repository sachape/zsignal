// Périmètre partagé des providers d'adoption.
//
// Le site MARKETING/blog (palette `el-*` + Inter) est un design system DISTINCT,
// explicitement exempté par l'ADR 0004 (typographie) et par le provider Adoption
// (ADR 0005). Toute métrique d'adoption produit doit l'exclure de la même façon,
// sinon deux providers mesurent deux périmètres différents et les chiffres ne se
// comparent plus. Une seule définition, ici.

export const MARKETING_PATH = /(\/site\/|Blog|Article)/;
export const MARKETING_CONTENT = /el-sans|text-el-|font-el|bg-el-|el-on-|el-muted|el-ink|border-el-/;

/** Un fichier appartient-il à la surface marketing (exemptée) ? */
export function isMarketing(file, code) {
  return MARKETING_PATH.test(file) || MARKETING_CONTENT.test(code);
}
