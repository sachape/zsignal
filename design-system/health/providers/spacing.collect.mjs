// Extraction des usages d'espacement — parsing réel, pas de grep.
//  - TSX/TS : AST @babel → littéraux de className / cn() / cva() / styles inline.
//  - CSS    : PostCSS → déclarations des propriétés d'espacement uniquement.
// Chaque candidat est résolu en px et étiqueté (échelle / arbitraire / inline / token).

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import postcss from "postcss";
import { SCALE_PX, arbitraryToPx } from "./spacing.scale.mjs";
import { SYSTEM } from "../contract.mjs";

const traverse = _traverse.default || _traverse;

// Famille d'utilitaire → propriété CSS. Matching par préfixe le PLUS LONG d'abord
// (px avant p, space-y avant …) et frontière « - » obligatoire (évite max-w, min-h…).
const FAMILY = {
  p: "padding", px: "padding-inline", py: "padding-block", pt: "padding-top", pr: "padding-right", pb: "padding-bottom", pl: "padding-left", ps: "padding-inline-start", pe: "padding-inline-end",
  m: "margin", mx: "margin-inline", my: "margin-block", mt: "margin-top", mr: "margin-right", mb: "margin-bottom", ml: "margin-left", ms: "margin-inline-start", me: "margin-inline-end",
  gap: "gap", "gap-x": "column-gap", "gap-y": "row-gap",
  "space-x": "column-gap", "space-y": "row-gap",
  inset: "inset", "inset-x": "inset-inline", "inset-y": "inset-block",
  top: "top", right: "right", bottom: "bottom", left: "left", start: "inset-inline-start", end: "inset-inline-end",
};
const FAM_KEYS = Object.keys(FAMILY).sort((a, b) => b.length - a.length);
const POSITION_FAMS = new Set(["inset", "inset-x", "inset-y", "top", "right", "bottom", "left", "start", "end"]);
const SKIP_VALUES = new Set(["auto", "full", "screen", "min", "max", "fit", "px-0"]);

const CSS_PROPS = new Set([
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "padding-inline", "padding-block", "padding-inline-start", "padding-inline-end", "padding-block-start", "padding-block-end",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "margin-inline", "margin-block", "margin-inline-start", "margin-inline-end",
  "gap", "row-gap", "column-gap", "inset", "inset-inline", "inset-block", "top", "right", "bottom", "left",
]);
const INLINE_PROP = { padding: "padding", paddingTop: "padding-top", paddingRight: "padding-right", paddingBottom: "padding-bottom", paddingLeft: "padding-left", margin: "margin", marginTop: "margin-top", marginRight: "margin-right", marginBottom: "margin-bottom", marginLeft: "margin-left", gap: "gap", rowGap: "row-gap", columnGap: "column-gap", inset: "inset", top: "top", right: "right", bottom: "bottom", left: "left" };

// --- Résolution d'un token de classe Tailwind → candidat (ou null) ------------
function parseClass(token, file, line) {
  let t = token;
  if (!t || t.includes("(")) return null;
  if (t.includes(":")) t = t.slice(t.lastIndexOf(":") + 1); // retire variantes (md:, hover:…)
  t = t.replace(/^!/, "");
  const negative = t.startsWith("-");
  if (negative) t = t.slice(1);
  for (const fam of FAM_KEYS) {
    if (t !== fam && !t.startsWith(fam + "-")) continue;
    const value = t.slice(fam.length + 1);
    if (!value || SKIP_VALUES.has(value) || value.includes("/")) return null; // auto, 1/2…
    let px, system;
    if (value.startsWith("[")) { px = arbitraryToPx(value); system = SYSTEM.ARBITRARY; }
    else if (value.startsWith("(") || value.includes("var")) { px = null; system = SYSTEM.TOKEN; }
    else if (SCALE_PX.has(value)) { px = SCALE_PX.get(value); system = SYSTEM.SCALE; }
    else return null; // valeur inconnue non pertinente
    if (px == null && system !== SYSTEM.TOKEN) return null;
    return {
      file, line, family: fam, property: FAMILY[fam],
      raw: token, value, px: px == null ? null : negative ? -px : px,
      system, negative, category: POSITION_FAMS.has(fam) ? "position" : FAMILY[fam].split("-")[0],
    };
  }
  return null;
}

function classesFromString(str, file, line, out) {
  for (const tok of str.split(/\s+/)) {
    const c = parseClass(tok, file, line);
    if (c) out.push(c);
  }
}

// Extrait récursivement les StringLiteral + quasis de TemplateLiteral d'un sous-arbre.
function stringsIn(node, file, out, dynamic) {
  if (!node || typeof node !== "object") return;
  if (node.type === "StringLiteral") { classesFromString(node.value, file, node.loc?.start.line ?? 0, out); if (dynamic) out.dynamic = true; return; }
  if (node.type === "TemplateLiteral") { for (const q of node.quasis) classesFromString(q.value.cooked ?? "", file, q.loc?.start.line ?? 0, out); return; }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => stringsIn(n, file, out, dynamic));
    else if (v && v.type) stringsIn(v, file, out, dynamic);
  }
}

const CLASS_CALLEES = new Set(["cn", "clsx", "cx", "cva", "tv", "twMerge", "classNames"]);

export function collectFromTsx(code, file) {
  const out = [];
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true }); }
  catch { return { candidates: out, parseError: true }; }
  traverse(ast, {
    JSXAttribute(path) {
      const name = path.node.name?.name;
      if (name === "className" || name === "class") {
        const v = path.node.value;
        if (v?.type === "StringLiteral") classesFromString(v.value, file, v.loc.start.line, out);
        else if (v?.type === "JSXExpressionContainer") stringsIn(v.expression, file, out, true);
      } else if (name === "style") {
        const expr = path.node.value?.expression;
        const obj = expr?.type === "ObjectExpression" ? expr : null;
        if (obj) for (const p of obj.properties) {
          const key = p.key?.name || p.key?.value;
          if (!(key in INLINE_PROP)) continue;
          let px = null;
          if (p.value?.type === "StringLiteral") { const m = /^(-?\d+(?:\.\d+)?)(px|rem)?$/.exec(p.value.value.trim()); if (m) px = parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1); }
          else if (p.value?.type === "NumericLiteral") px = p.value.value; // React → px
          if (px != null) out.push({ file, line: p.loc?.start.line ?? 0, family: key, property: INLINE_PROP[key], raw: `${key}:${px}`, value: String(px), px, system: SYSTEM.INLINE, negative: px < 0, category: INLINE_PROP[key].split("-")[0] });
        }
      }
    },
    CallExpression(path) {
      const callee = path.node.callee;
      const nm = callee?.name || callee?.property?.name;
      if (CLASS_CALLEES.has(nm)) path.node.arguments.forEach((a) => stringsIn(a, file, out, true));
    },
  });
  return { candidates: out, parseError: false };
}

export function collectFromCss(code, file) {
  const out = [];
  let root; try { root = postcss.parse(code); } catch { return { candidates: out, parseError: true }; }
  root.walkDecls((decl) => {
    if (!CSS_PROPS.has(decl.prop)) return;
    const line = decl.source?.start?.line ?? 0;
    for (const part of decl.value.split(/\s+/)) {
      if (/var\(--/.test(part)) { out.push({ file, line, family: decl.prop, property: decl.prop, raw: `${decl.prop}:${part}`, value: part, px: null, system: SYSTEM.TOKEN, negative: false, category: decl.prop.split("-")[0] }); continue; }
      const m = /^(-?\d+(?:\.\d+)?)(px|rem)$/.exec(part);
      if (!m) continue;
      const px = parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1);
      out.push({ file, line, family: decl.prop, property: decl.prop, raw: `${decl.prop}:${part}`, value: part, px, system: SYSTEM.RAW_CSS, negative: px < 0, category: decl.prop.split("-")[0] });
    }
  });
  return { candidates: out, parseError: false };
}
