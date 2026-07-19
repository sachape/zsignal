// Règle officielle de spacing (DS P6) — source de vérité unique du classement.
// Documentée dans docs/adr/0001-spacing-8-4-grid.md. Échelle à DEUX niveaux :
//
//  - PREFERRED       (0,8,16,24,32,40,48,56,64,80,96,120,128) : rythme principal, défaut.
//  - COMPACT-ALLOWED (4,12,20) : sous-grille compacte secondaire (composants denses).
//  - VIOLATION       (2,6,10,14,28,36,44… + négatifs non documentés).
//  - EXCEPTION       : négatifs de positionnement intentionnels, documentés (exceptions.json).
//
// PREFERRED et COMPACT-ALLOWED comptent conformes, mais restent DISTINGUÉS partout.
// La règle classe des USAGES d'espacement, pas des tailles (width/height/icônes/radius),
// et ne renomme pas les tokens (reporté à Design Tokens V2).

import defaultTheme from "tailwindcss/defaultTheme.js";

// Échelle à DEUX niveaux (décision DS P6, ADR 0001) :
//  - PREFERRED : rythme principal (layouts, sections, structure). Choix PAR DÉFAUT.
//  - COMPACT   : sous-grille compacte, SECONDAIRE, pour les espacements internes
//                de composants denses. Conforme, mais suivie séparément.
export const PREFERRED = Object.freeze([0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 120, 128]);
export const COMPACT = Object.freeze([4, 12, 20]);
export const SCALE = Object.freeze([...PREFERRED, ...COMPACT].sort((a, b) => a - b));
const REM = 16;
const COMPACT_SET = new Set(COMPACT);

/**
 * Classe une valeur d'espacement en TIER. Les négatifs ne sont pas classés par la
 * grille (positionnement, pas rythme) → « violation » sauf exception documentée.
 * Ne produit JAMAIS « needs-decision » : toute valeur positive est tranchée.
 */
export function classifyTier(px) {
  if (px == null || Number.isNaN(px)) return "unclassified";
  const v = Math.abs(px); // un négatif sur-grille (-16px pull) respecte le rythme
  if (v === 0 || v % 8 === 0) return "preferred";
  if (COMPACT_SET.has(v)) return "compact-allowed";
  return "violation"; // 2, 6, 10, 14, 28, 36, 44… (et leurs négatifs)
}

/** Deux valeurs PREFERRED les plus proches (on pousse violation → preferred, pas → compact). */
export function recommendPreferred(px) {
  if (px == null || Number.isNaN(px)) return [];
  const v = Math.abs(px);
  const sorted = [...PREFERRED].filter((n) => n > 0).sort((a, b) => Math.abs(a - v) - Math.abs(b - v));
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
