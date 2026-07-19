// Règle officielle de spacing (DS P6) — source de vérité unique du classement.
// Documentée dans docs/adr/0001-spacing-8-4-grid.md.
//
//  - 0            : toujours conforme
//  - 4px          : micro-spacing autorisé
//  - multiples 8  : conformes (8,16,24,32,40,48,56,64,80,96,120,128)
//  - multiples 4 hors 8 (12,20,28…) : NEEDS-DECISION (jamais auto-conformes,
//    décision après audit — cf. arbitrage utilisateur : 12 et 20 conservés en attente)
//  - le reste (2,6,10,14,18…) : VIOLATION
//
// NB : la règle ne renomme PAS les tokens (reporté à Design Tokens V2). Elle
// classe des USAGES d'espacement, pas des tailles (width/height/icônes/radius).

import { STATUS } from "../contract.mjs";
import defaultTheme from "tailwindcss/defaultTheme.js";

export const SCALE = Object.freeze([0, 4, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 120, 128]);
const REM = 16;

/** Classe une valeur en px selon la règle 8/4. */
export function classify(px) {
  if (px == null || Number.isNaN(px)) return STATUS.UNCLASSIFIED;
  const v = Math.abs(px);
  if (v === 0) return STATUS.COMPLIANT;
  if (v === 4) return STATUS.COMPLIANT;
  if (v % 8 === 0) return STATUS.COMPLIANT;
  if (v % 4 === 0) return STATUS.NEEDS_DECISION; // 12, 20, 28, 36, 44…
  return STATUS.VIOLATION;
}

/** Deux valeurs d'échelle les plus proches (pour la recommandation). */
export function recommend(px) {
  if (px == null || Number.isNaN(px)) return [];
  const v = Math.abs(px);
  const sorted = [...SCALE].sort((a, b) => Math.abs(a - v) - Math.abs(b - v));
  const uniq = [...new Set(sorted.slice(0, 2))].sort((a, b) => a - b);
  const sign = px < 0 ? "-" : "";
  return uniq.map((n) => `${sign}${n}px`);
}

// --- Résolution Tailwind : classe d'échelle → px ------------------------------
// Pas d'override spacing dans tailwind.config.ts → defaultTheme.spacing fait foi.
function remToPx(val) {
  if (typeof val !== "string") return null;
  if (val === "0" || val === "0px") return 0;
  if (val.endsWith("px")) return parseFloat(val);
  if (val.endsWith("rem")) return parseFloat(val) * REM;
  return null; // %, auto, ch… non pertinents pour l'audit spacing
}

// Map "clé d'échelle" (ex "1.5", "4", "px") → px.
export const SCALE_PX = (() => {
  const m = new Map();
  for (const [k, v] of Object.entries(defaultTheme.spacing)) {
    const px = remToPx(v);
    if (px != null) m.set(k, px);
  }
  return m;
})();

/** Valeur arbitraire Tailwind [18px] / [1.5rem] / [12] → px (ou null si non-longueur). */
export function arbitraryToPx(raw) {
  const inner = raw.replace(/^\[|\]$/g, "").trim();
  if (/%|vw|vh|vmin|vmax|calc|var\(|ch|ex|fit|auto/.test(inner)) return null;
  if (inner.endsWith("px")) return parseFloat(inner);
  if (inner.endsWith("rem")) return parseFloat(inner) * REM;
  if (/^\d+(\.\d+)?$/.test(inner)) return parseFloat(inner); // [12] = 12px en Tailwind
  return null;
}
