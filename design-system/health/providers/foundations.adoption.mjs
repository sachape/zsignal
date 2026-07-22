// Provider Foundations Adoption — à quel point le PRODUIT consomme les échelles
// fondatrices du DS : typographie, radius, ombres, motion.
//
// Même définition que `scaleAdoption` du provider spacing, appliquée fondation
// par fondation : un usage est CONFORME s'il passe par le système, soit
//   - `token`  : il référence un token (`var(--radius-…)`, `var(--duration-…)`) ;
//   - `scale`  : sa valeur tombe EXACTEMENT sur l'échelle gouvernée
//                (une classe Tailwind qui vaut la même valeur qu'un token compte —
//                 c'est le choix de valeur qui est gouverné, pas la syntaxe).
// Tout le reste est `off` : valeur hors échelle, arbitraire, ou utilitaire
// Tailwind dont la valeur ne correspond à aucun token.
//
// La distinction token/scale est CONSERVÉE dans le rapport : elle dit s'il reste
// une marche à franchir (passer par la variable) une fois l'échelle respectée.
//
// Périmètre : `core/walk.mjs` (src + design-system, hors générés/tokens/tests),
// moins la surface marketing (`core/scope.mjs`) — comme le provider Adoption.
//
// Limites assumées, écrites dans les notes du rapport (rien n'est masqué) :
//  - un `transition-colors` SANS `duration-*` n'exprime aucun choix de durée : il
//    hérite du défaut Tailwind. On ne le compte pas — on mesure les décisions du
//    produit, pas les défauts du framework.
//  - les `animate-*` renvoient à des keyframes déclarées dans tailwind.config ;
//    elles sont hors périmètre de cette métrique d'usage.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import defaultTheme from "tailwindcss/defaultTheme.js";
import twColors from "tailwindcss/colors.js";
import { ROOT } from "../core/walk.mjs";
import { isMarketing } from "../core/scope.mjs";
import { classTokensFromTsx, cssDeclsFromCss, iconUsageFromTsx } from "../core/classes.mjs";

const REM = 16;

// --- Lecture des échelles depuis les tokens (source de vérité) ----------------
function readTokens(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
}
function leafValues(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (typeof node.$value === "string") out.push(node.$value);
  for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) leafValues(v, out);
  return out;
}
const toPx = (v) => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s === "0") return 0;
  if (s.endsWith("px")) return parseFloat(s);
  if (s.endsWith("rem")) return parseFloat(s) * REM;
  return null;
};
const toMs = (v) => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.endsWith("ms")) return parseFloat(s);
  if (s.endsWith("s")) return parseFloat(s) * 1000;
  return null;
};
// Normalise une courbe pour comparaison : "cubic-bezier(0.4, 0, 1, 1)" → "0.4,0,1,1".
const normCurve = (v) => {
  const m = /cubic-bezier\(([^)]+)\)/.exec(String(v));
  if (!m) return String(v).trim().toLowerCase();
  return m[1].split(",").map((n) => String(parseFloat(n))).join(",");
};

// Échelle typo : ADR 0004 (docs/adr/0004-typography-scale.md). Volontairement
// écrite ici comme la grille spacing l'est dans `spacing.scale.mjs` : la RÈGLE
// dépasse les tokens (l'échelle monte à 96px, tous n'ont pas de token).
export const TYPO_SCALE_PX = Object.freeze([12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 88, 96]);

const RADIUS_PX = new Set(leafValues(readTokens("tokens/primitives/radius.json")).map(toPx).filter((n) => n != null));
const BORDER_PX = new Set(leafValues(readTokens("tokens/primitives/border.json")).map(toPx).filter((n) => n != null));
const LAYER_Z = new Set(leafValues(readTokens("tokens/primitives/layer.json")).map(Number).filter((n) => !Number.isNaN(n)));
// 0 et 1 (invisible / opaque) sont des extrémités triviales, toujours conformes.
const OPACITY = new Set([0, 1, ...leafValues(readTokens("tokens/primitives/opacity.json")).map(Number).filter((n) => !Number.isNaN(n))]);
// Grille de référence 12 colonnes (Foundations/Grid) : un découpage n'est sur la
// grille que s'il divise 12. `grid-cols-5` ou `grid-cols-7` la cassent.
const GRID_COLS_OK = new Set([1, 2, 3, 4, 6, 12]);
const DURATION_MS = new Set(leafValues(readTokens("tokens/primitives/motion.json")).map(toMs).filter((n) => n != null));
const EASINGS = new Set(
  leafValues(readTokens("tokens/primitives/motion.json"))
    .filter((v) => v.includes("cubic-bezier"))
    .map(normCurve),
);

// --- Résolution des utilitaires Tailwind -------------------------------------
// `tailwind.config.ts` (TS) n'est pas importable ici : on rejoue ses SEULS
// overrides d'échelle. Si la config change, cette table doit suivre.
const RADIUS_OVERRIDES = { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" };

const FONT_PX = new Map(
  Object.entries(defaultTheme.fontSize).map(([k, v]) => [k, toPx(Array.isArray(v) ? v[0] : v)]),
);
const TW_RADIUS_PX = new Map(
  Object.entries(defaultTheme.borderRadius)
    .filter(([k]) => !(k in RADIUS_OVERRIDES))
    .map(([k, v]) => [k, toPx(v)]),
);
const TW_DURATION_MS = new Map(Object.entries(defaultTheme.transitionDuration).map(([k, v]) => [k, toMs(v)]));
const TW_EASING = new Map(Object.entries(defaultTheme.transitionTimingFunction).map(([k, v]) => [k, normCurve(v)]));

const isVarToken = (inner) => /var\(\s*--/.test(inner);
const unbracket = (v) => v.replace(/^\[|\]$/g, "").replace(/_/g, " ").trim();

// --- Couleurs ----------------------------------------------------------------
// Règle auto-maintenue : une classe de couleur qui n'est NI une couleur de la
// palette Tailwind NI une valeur arbitraire vient forcément de `tailwind.config`,
// donc du DS (sinon Tailwind ne génèrerait rien). Pas de liste de noms à tenir
// à jour : on identifie les CONTOURNEMENTS, pas les tokens.
const TW_PALETTE = new Set(Object.keys(twColors));
// Mots-clés qui n'expriment aucune couleur (héritage/neutre) → hors dénominateur.
const COLOR_NEUTRAL = new Set(["transparent", "current", "inherit", "initial", "unset", "auto", "none"]);
// Suffixes de `bg-`/`text-`/`border-` qui ne sont PAS des couleurs.
const BG_NON_COLOR = /^(cover|contain|center|top|bottom|left|right|repeat|no-repeat|fixed|local|scroll|clip-|origin-|gradient-|blend-)/;
const TEXT_NON_COLOR = /^(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|clip|ellipsis|opacity-|decoration-)/;
const BORDER_NON_COLOR = /^(solid|dashed|dotted|double|hidden|collapse|separate|spacing-)/;

/** Classe une VALEUR de couleur en "token" | "off" | null (pas une couleur). */
function classifyColorValue(v) {
  const base = v.split("/")[0]; // retire le modificateur d'alpha (primary/10)
  if (!base) return null;
  if (base.startsWith("[")) {
    const inner = unbracket(base);
    return isVarToken(inner) ? "token" : "off";
  }
  if (COLOR_NEUTRAL.has(base)) return null;
  // `slate-500`, `zinc-800`, `black`, `white` : palette Tailwind = hors DS.
  if (TW_PALETTE.has(base.split("-")[0])) return "off";
  return "token";
}

/** Classe un utilitaire en "token" | "scale" | "off" | null (pas un usage). */
function classifyToken(t) {
  // ---- Typographie : text-<size> et text-[<longueur>] -----------------------
  if (t.startsWith("text-")) {
    const v = t.slice(5);
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner)) return ["typography", "token"];
      if (/clamp|%|vw|vh|calc/.test(inner)) return null; // fluide : non classable
      const px = toPx(inner);
      if (px == null) return null; // couleur, alignement…
      return ["typography", TYPO_SCALE_PX.includes(px) ? "scale" : "off"];
    }
    if (FONT_PX.has(v)) return ["typography", TYPO_SCALE_PX.includes(FONT_PX.get(v)) ? "scale" : "off"];
    if (TEXT_NON_COLOR.test(v)) return null; // text-center, text-balance…
    const c = classifyColorValue(v);
    return c ? ["colors", c] : null;
  }

  // ---- Radius : rounded[-<coin>][-<taille>] --------------------------------
  if (t === "rounded" || t.startsWith("rounded-")) {
    let v = t === "rounded" ? "DEFAULT" : t.slice(8);
    // Retire le segment de coin (t, r, b, l, tl, tr, br, bl, s, e, ss, se, es, ee).
    const corner = /^(t|r|b|l|tl|tr|br|bl|s|e|ss|se|es|ee)(-|$)/.exec(v);
    if (corner) v = v.slice(corner[0].length) || "DEFAULT";
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner) || inner === "inherit") return ["radius", "token"];
      const px = toPx(inner);
      return ["radius", px != null && RADIUS_PX.has(px) ? "scale" : "off"];
    }
    if (v in RADIUS_OVERRIDES) return ["radius", "token"]; // sm/md/lg = var(--radius)
    if (TW_RADIUS_PX.has(v)) return ["radius", RADIUS_PX.has(TW_RADIUS_PX.get(v)) ? "scale" : "off"];
    return null;
  }

  // ---- Bordures : épaisseur (border[-côté][-<n>]) puis couleur --------------
  if (t === "border" || t.startsWith("border-")) {
    let v = t === "border" ? "DEFAULT" : t.slice(7);
    const side = /^(t|r|b|l|x|y|s|e)(-|$)/.exec(v);
    if (side) v = v.slice(side[0].length) || "DEFAULT";
    if (BORDER_NON_COLOR.test(v)) return null;
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner)) return ["borders", "token"];
      const px = toPx(inner);
      if (px != null) return ["borders", BORDER_PX.has(px) ? "scale" : "off"];
      return ["colors", classifyColorValue(v) ?? "off"];
    }
    if (v === "DEFAULT" || /^\d+$/.test(v)) {
      const px = v === "DEFAULT" ? 1 : Number(v);
      return ["borders", BORDER_PX.has(px) ? "scale" : "off"];
    }
    const c = classifyColorValue(v);
    return c ? ["colors", c] : null;
  }

  // ---- Élévation : z-index face à l'échelle layer.* -------------------------
  if (t.startsWith("z-")) {
    const v = t.slice(2);
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner)) return ["elevation", "token"];
      const n = Number(inner);
      return ["elevation", !Number.isNaN(n) && LAYER_Z.has(n) ? "scale" : "off"];
    }
    if (v === "auto") return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return ["elevation", LAYER_Z.has(n) ? "scale" : "off"];
  }

  // ---- Opacité : opacity-<n> (les modificateurs d'alpha `bg-x/10` relèvent
  //      de la couleur, pas de l'opacité d'élément → hors périmètre). ---------
  if (t.startsWith("opacity-")) {
    const v = t.slice(8);
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner)) return ["opacity", "token"];
      const n = parseFloat(inner);
      return ["opacity", !Number.isNaN(n) && OPACITY.has(n > 1 ? n / 100 : n) ? "scale" : "off"];
    }
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return ["opacity", OPACITY.has(n / 100) ? "scale" : "off"];
  }

  // ---- Grille : découpage en colonnes face à la grille 12 ------------------
  if (t.startsWith("grid-cols-")) {
    const v = t.slice(10);
    if (v.startsWith("[")) return ["grid", "off"]; // template arbitraire
    if (v === "none" || v === "subgrid") return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return ["grid", GRID_COLS_OK.has(n) ? "scale" : "off"];
  }

  // ---- Ombres : shadow-<clé> et shadow-[…] ---------------------------------
  // `shadow-primary/40` est un utilitaire de COULEUR d'ombre, pas d'élévation :
  // hors périmètre. Seules les clés d'échelle Tailwind et les arbitraires comptent.
  if (t === "shadow" || t.startsWith("shadow-")) {
    const v = t === "shadow" ? "DEFAULT" : t.slice(7);
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      return ["shadow", isVarToken(inner) ? "token" : "off"];
    }
    if (v === "none") return ["shadow", "scale"]; // absence d'ombre = choix valide
    // Les box-shadow Tailwind ne sont pas overridés dans tailwind.config : leurs
    // valeurs (rgb) ne correspondent à aucun token shadow.* (hsl) → hors système.
    if (v in defaultTheme.boxShadow) return ["shadow", "off"];
    const c = classifyColorValue(v); // shadow-primary/40 = couleur d'ombre
    return c ? ["colors", c] : null;
  }

  // ---- Motion : duration-<n> / ease-<courbe> --------------------------------
  if (t.startsWith("duration-")) {
    const v = t.slice(9);
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner)) return ["motion", "token"];
      const ms = toMs(inner);
      return ["motion", ms != null && DURATION_MS.has(ms) ? "scale" : "off"];
    }
    if (TW_DURATION_MS.has(v)) return ["motion", DURATION_MS.has(TW_DURATION_MS.get(v)) ? "scale" : "off"];
    return null;
  }
  if (t === "ease" || t.startsWith("ease-")) {
    const v = t === "ease" ? "DEFAULT" : t.slice(5);
    if (v.startsWith("[")) {
      const inner = unbracket(v);
      if (isVarToken(inner)) return ["motion", "token"];
      return ["motion", EASINGS.has(normCurve(inner)) ? "scale" : "off"];
    }
    if (TW_EASING.has(v)) return ["motion", EASINGS.has(TW_EASING.get(v)) ? "scale" : "off"];
    return null;
  }

  // ---- Couleurs : préfixes restants ----------------------------------------
  if (t.startsWith("bg-")) {
    const v = t.slice(3);
    if (BG_NON_COLOR.test(v)) return null;
    const c = classifyColorValue(v);
    return c ? ["colors", c] : null;
  }
  for (const p of ["ring-offset-", "ring-", "fill-", "stroke-", "from-", "to-", "via-", "outline-", "decoration-", "divide-", "caret-", "accent-"]) {
    if (!t.startsWith(p)) continue;
    const v = t.slice(p.length);
    // Ces familles portent aussi des largeurs / positions numériques (ring-2,
    // stroke-2, from-10%) : ce n'est pas une décision de couleur.
    if (/^\d/.test(v)) return null;
    const c = classifyColorValue(v);
    return c ? ["colors", c] : null;
  }

  return null;
}

// --- CSS brut ----------------------------------------------------------------
const CSS_RULES = [
  { foundation: "typography", props: new Set(["font-size"]), unit: toPx, scale: (px) => TYPO_SCALE_PX.includes(px) },
  { foundation: "radius", props: new Set(["border-radius"]), unit: toPx, scale: (px) => RADIUS_PX.has(px) },
  { foundation: "shadow", props: new Set(["box-shadow"]), unit: () => null, scale: () => false },
  { foundation: "borders", props: new Set(["border-width", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width"]), unit: toPx, scale: (px) => BORDER_PX.has(px) },
  { foundation: "elevation", props: new Set(["z-index"]), unit: (v) => (Number.isNaN(Number(v)) ? null : Number(v)), scale: (n) => LAYER_Z.has(n) },
  { foundation: "opacity", props: new Set(["opacity"]), unit: (v) => (Number.isNaN(parseFloat(v)) ? null : parseFloat(v)), scale: (n) => OPACITY.has(n) },
  { foundation: "colors", props: new Set(["color", "background-color", "border-color", "fill", "stroke", "outline-color"]), unit: () => null, scale: () => false },
  {
    foundation: "motion",
    props: new Set(["transition-duration", "animation-duration"]),
    unit: toMs,
    scale: (ms) => DURATION_MS.has(ms),
  },
  {
    foundation: "motion",
    props: new Set(["transition-timing-function", "animation-timing-function"]),
    unit: () => null,
    scale: () => false,
    curve: true,
  },
];

// Mots-clés CSS qui n'expriment AUCUN choix de valeur (on hérite / on remet à
// zéro) : hors dénominateur, comme `text-[clamp(…)]` côté utilitaires.
const CSS_KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "revert-layer", "auto"]);

function classifyDecl(prop, value) {
  for (const r of CSS_RULES) {
    if (!r.props.has(prop)) continue;
    const v = value.trim().toLowerCase();
    if (CSS_KEYWORDS.has(v)) return null;
    // `box-shadow: none` = absence d'ombre assumée, comme `shadow-none`.
    if (v === "none") return [r.foundation, r.foundation === "shadow" ? "scale" : "off"];
    if (isVarToken(value)) return [r.foundation, "token"];
    if (r.curve) return [r.foundation, EASINGS.has(normCurve(value)) ? "scale" : "off"];
    const n = r.unit(value);
    if (n == null) return [r.foundation, "off"];
    return [r.foundation, r.scale(n) ? "scale" : "off"];
  }
  return null;
}

// --- Provider ----------------------------------------------------------------
const FOUNDATIONS = ["typography", "radius", "shadow", "motion", "colors", "borders", "elevation", "opacity", "grid"];

/** Couverture du thème clair : part des tokens de couleur SÉMANTIQUES qui ont une
 *  valeur explicite en `.light`. Ceux qui n'en ont pas héritent de la valeur
 *  sombre — c'est un fait mesurable, pas un jugement sur leur légitimité. */
function darkModeCoverage() {
  const paths = (node, p = "", out = {}) => {
    if (!node || typeof node !== "object") return out;
    if (typeof node.$value === "string") { out[p] = true; return out; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) paths(v, `${p}/${k}`, out);
    return out;
  };
  const dark = paths(readTokens("tokens/semantic/color.json"));
  const light = paths(readTokens("tokens/semantic/color.light.json"));
  const total = Object.keys(dark).length;
  const covered = Object.keys(dark).filter((k) => k in light).length;
  return { total, covered, adoption: total ? covered / total : null };
}

export function runFoundationsAdoption(files) {
  const acc = {};
  for (const f of FOUNDATIONS) acc[f] = { token: 0, scale: 0, off: 0, offenders: new Map() };
  const icons = { library: 0, rawSvg: 0 };
  let scanned = 0, skippedMarketing = 0, parseErrors = 0;

  const record = (foundation, verdict, raw) => {
    const a = acc[foundation];
    a[verdict]++;
    if (verdict === "off") a.offenders.set(raw, (a.offenders.get(raw) ?? 0) + 1);
  };

  for (const file of files) {
    if (isMarketing(file.file, file.code)) { skippedMarketing++; continue; }
    scanned++;
    if (file.kind === "tsx") {
      const { tokens, parseError } = classTokensFromTsx(file.code);
      if (parseError) { parseErrors++; continue; }
      for (const { token } of tokens) {
        const hit = classifyToken(token);
        if (hit) record(hit[0], hit[1], token);
      }
      const ic = iconUsageFromTsx(file.code);
      icons.library += ic.library;
      icons.rawSvg += ic.rawSvg;
    } else {
      const { decls, parseError } = cssDeclsFromCss(file.code);
      if (parseError) { parseErrors++; continue; }
      for (const d of decls) {
        const hit = classifyDecl(d.prop, d.value);
        if (hit) record(hit[0], hit[1], `${d.prop}: ${d.value}`);
      }
    }
  }

  const byFoundation = {};
  for (const f of FOUNDATIONS) {
    const a = acc[f];
    const total = a.token + a.scale + a.off;
    byFoundation[f] = {
      total,
      token: a.token,
      scale: a.scale,
      off: a.off,
      // Conforme = passe par le système (token OU valeur sur l'échelle).
      adoption: total ? (a.token + a.scale) / total : null,
      // Part qui passe par la VARIABLE (marche suivante, une fois l'échelle tenue).
      tokenShare: total ? a.token / total : null,
      topOffenders: [...a.offenders]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count })),
    };
  }

  // Icônes : une seule librairie gouvernée (Foundations/Icons → lucide-react).
  // Un `<svg>` écrit à la main est le contournement ; on compte les occurrences.
  const iconTotal = icons.library + icons.rawSvg;
  byFoundation.icons = {
    total: iconTotal,
    token: icons.library,
    scale: 0,
    off: icons.rawSvg,
    adoption: iconTotal ? icons.library / iconTotal : null,
    tokenShare: iconTotal ? icons.library / iconTotal : null,
    topOffenders: icons.rawSvg ? [{ value: "<svg> écrit à la main", count: icons.rawSvg }] : [],
  };

  const dm = darkModeCoverage();
  byFoundation.darkmode = {
    total: dm.total,
    token: dm.covered,
    scale: 0,
    off: dm.total - dm.covered,
    adoption: dm.adoption,
    tokenShare: dm.adoption,
    topOffenders: [],
  };

  return {
    provider: "foundations-adoption",
    scope: { filesScanned: scanned, skippedMarketing, parseErrors },
    byFoundation,
  };
}
