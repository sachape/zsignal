// Extraction GÉNÉRIQUE des utilitaires — parsing réel, pas de grep.
//
// Distinct de `providers/spacing.collect.mjs` : celui-ci résout chaque classe en
// PIXELS par famille d'espacement (padding/margin/gap…). Ici on ne résout rien —
// on rend les jetons de classe bruts, à charge du provider appelant de les
// classer selon SA fondation (radius, ombres, motion, typo…).
//
// Pourquoi l'AST et pas un `grep` : `duration` est un mot du domaine Streamnco
// (durée de live) ; un grep textuel compte 40 « duration » qui ne sont pas des
// classes Tailwind. Seules les chaînes atteignables depuis `className` / `cn()`
// / `cva()` sont des utilitaires.

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import postcss from "postcss";

const traverse = _traverse.default || _traverse;

// Mêmes helpers de classes que le collecteur spacing (cn/clsx/cva/tv…).
const CLASS_CALLEES = new Set(["cn", "clsx", "cx", "cva", "tv", "twMerge", "classNames"]);

function pushTokens(str, line, out) {
  for (const raw of str.split(/\s+/)) {
    if (!raw) continue;
    let t = raw.replace(/^!/, "");
    // Retire les variantes (md:, hover:, dark:, group-hover:…) — on ne garde que
    // l'utilitaire final, mais UNE variante ne change pas la valeur choisie.
    while (/^[a-z0-9-]+:/.test(t)) t = t.slice(t.indexOf(":") + 1);
    if (t) out.push({ token: t, line });
  }
}

function stringsIn(node, out) {
  if (!node || typeof node !== "object") return;
  if (node.type === "StringLiteral") return pushTokens(node.value, node.loc?.start.line ?? 0, out);
  if (node.type === "TemplateLiteral") {
    for (const q of node.quasis) pushTokens(q.value.cooked ?? "", q.loc?.start.line ?? 0, out);
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => stringsIn(n, out));
    else if (v && v.type) stringsIn(v, out);
  }
}

/** Jetons de classe atteignables depuis className / class / cn() & co. */
export function classTokensFromTsx(code) {
  const out = [];
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  } catch {
    return { tokens: out, parseError: true };
  }
  traverse(ast, {
    JSXAttribute(path) {
      const name = path.node.name?.name;
      if (name !== "className" && name !== "class") return;
      const v = path.node.value;
      if (v?.type === "StringLiteral") pushTokens(v.value, v.loc.start.line, out);
      else if (v?.type === "JSXExpressionContainer") stringsIn(v.expression, out);
    },
    CallExpression(path) {
      const callee = path.node.callee;
      const nm = callee?.name || callee?.property?.name;
      if (CLASS_CALLEES.has(nm)) path.node.arguments.forEach((a) => stringsIn(a, out));
    },
  });
  return { tokens: out, parseError: false };
}

/** Usage d'icônes : composants importés de la librairie gouvernée vs `<svg>` bruts.
 *  Compte les OCCURRENCES JSX, pas les imports — un import utilisé 10 fois pèse 10. */
export function iconUsageFromTsx(code, library = "lucide-react") {
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  } catch {
    return { library: 0, rawSvg: 0, parseError: true };
  }
  const imported = new Set();
  let lib = 0, rawSvg = 0;
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value !== library) return;
      for (const s of path.node.specifiers) if (s.local?.name) imported.add(s.local.name);
    },
  });
  traverse(ast, {
    JSXOpeningElement(path) {
      const n = path.node.name;
      if (n.type === "JSXIdentifier" && n.name === "svg") rawSvg++;
      else if (n.type === "JSXIdentifier" && imported.has(n.name)) lib++;
    },
  });
  return { library: lib, rawSvg, parseError: false };
}

/** Déclarations CSS brutes (prop/valeur/ligne) — le provider filtre ce qui l'intéresse. */
export function cssDeclsFromCss(code) {
  const out = [];
  let root;
  try {
    root = postcss.parse(code);
  } catch {
    return { decls: out, parseError: true };
  }
  root.walkDecls((d) => out.push({ prop: d.prop, value: d.value, line: d.source?.start?.line ?? 0 }));
  return { decls: out, parseError: false };
}
