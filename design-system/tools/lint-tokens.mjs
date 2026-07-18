// Garde-fou tokens — refuse le code qui contourne le Design System.
//
// Deux surfaces :
//   ERROR (bloque la CI) : le CŒUR du DS — src/components/ui/** + les tokens.
//   WARN  (informe)      : le reste de l'app + le site marketing (en migration).
//
// Règles :
//   1. Couleur hexadécimale codée en dur (#rgb / #rrggbb).
//   2. Couleur arbitraire Tailwind : bg/text/border-[#…] ou [hsl(…)] littéral
//      (autorisé : hsl(var(--token))).
//   3. Radius arbitraire : rounded-[…] hors [var(--…)] / [inherit].
//   4. Ombre arbitraire : shadow-[…] contenant une couleur brute (# / rgb()).
//   5. Primitive au lieu de sémantique : var(--color-… / --neutral-… / --lime-…
//      / --space-<n> / --size-<n> / --radius-<échelle>) dans un composant.
//
// Usage : node design-system/tools/lint-tokens.mjs   (exit 1 si erreur cœur)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = resolve(root, "src");

// Fichiers jamais scannés (définitions de tokens, générés).
const SKIP = [/\/tokens\.generated\.css$/, /\/tokens\.light\.generated\.css$/, /\/index\.css$/];
// Exemptés de TOUTE règle couleur (data-viz, logos de marque, exports image).
const COLOR_EXEMPT = [
  /components\/ui\/chart\.tsx$/,
  /components\/ShareScoreCard\.tsx$/,
  /components\/clips\/CaptionStylePreviewGrid\.tsx$/,
  /components\/auth\/AuthForm\.tsx$/,
];
// Le CŒUR du DS : strict. (chart.tsx est data-viz → hors cœur strict.)
const isCore = (rel) => rel.startsWith("components/ui/") && !/chart\.tsx$/.test(rel);
// Marketing (palette el-*, hex fixes par design) : couleurs non bloquantes.
const isMarketing = (rel, src) => rel.startsWith("components/site/") || /\b(?:text|bg|border|font|from|to|via)-el-/.test(src);

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(tsx?|css)$/.test(e)) acc.push(p);
  }
  return acc;
}

// Retire commentaires ligne/bloc pour ne pas flaguer la prose.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const RULES = [
  { id: "hex", color: true, re: /#[0-9a-fA-F]{3,8}\b/g, msg: "couleur hexadécimale en dur" },
  { id: "arbitrary-color", color: true, re: /(?:bg|text|border|fill|stroke|ring|from|to|via)-\[(?:#|rgb|hsl\((?!var))/g, msg: "couleur arbitraire (utiliser un token)" },
  { id: "arbitrary-radius", color: false, re: /rounded(?:-[a-z]+)?-\[(?!var\(|inherit|9999)/g, msg: "radius arbitraire (utiliser radius.* ou rounded-md/lg)" },
  { id: "arbitrary-shadow", color: false, re: /shadow-\[[^\]]*(?:#|rgba?\()/g, msg: "ombre arbitraire à couleur brute (utiliser shadow-* / elevation.*)" },
  { id: "primitive-usage", color: false, re: /var\(--(?:color|neutral|lime|teal|green|amber|red|blue|orange|yellow|purple|pink)-|var\(--space-\d|var\(--size-\d|var\(--radius-(?:none|xs|sm|md|lg|xl|2xl|full)\b/g, msg: "primitive utilisée directement (passer par un token sémantique/composant)" },
];

const errors = [];
const warnings = [];

for (const abs of walk(SRC)) {
  const rel = relative(SRC, abs).replaceAll("\\", "/");
  if (SKIP.some((r) => r.test(abs))) continue;
  const raw = readFileSync(abs, "utf8");
  const src = stripComments(raw);
  const core = isCore(rel);
  const mkt = isMarketing(rel, raw);
  const colorExempt = COLOR_EXEMPT.some((r) => r.test(rel));

  for (const rule of RULES) {
    if (rule.color && colorExempt) continue;
    // Les couleurs du marketing (palette el-*) sont hors périmètre.
    if (rule.color && mkt) continue;
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (rule.re.test(line)) {
        const hit = { rule: rule.id, file: "src/" + rel, line: i + 1, msg: rule.msg };
        (core ? errors : warnings).push(hit);
      }
      rule.re.lastIndex = 0;
    });
  }
}

const fmt = (h) => `    ${h.file}:${h.line}  [${h.rule}] ${h.msg}`;
console.log(`\n  Garde-fou tokens — cœur DS strict (src/components/ui/), reste en warning.\n`);
if (warnings.length) {
  console.log(`  ⚠️  ${warnings.length} warnings (app/marketing en migration) :`);
  console.log(warnings.slice(0, 12).map(fmt).join("\n"));
  if (warnings.length > 12) console.log(`    … +${warnings.length - 12} autres`);
  console.log("");
}
if (errors.length) {
  console.log(`  ❌  ${errors.length} ERREURS dans le cœur du DS (bloquent la CI) :`);
  console.log(errors.map(fmt).join("\n"));
  console.log("");
  process.exit(1);
}
console.log(`  ✅  Cœur DS propre : 0 erreur. (${warnings.length} warnings hors cœur.)\n`);
