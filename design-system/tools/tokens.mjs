#!/usr/bin/env node
/**
 * Générateur de tokens — Phase 2, conforme Vol.1 Ch.08.
 *
 * INVERSION DU PIPELINE. Le handbook suppose tokens.json → génère le CSS. Ici
 * `src/index.css` appartient à Lovable (édité en continu) : on ne peut pas le
 * transformer en fichier généré. Donc on inverse le sens —
 *
 *     src/index.css  (LA source, humaine + Lovable)
 *        │  parse + valide + résout la couche
 *        ▼
 *     design-system/artifacts/tokens.json  (une SORTIE, jamais éditée à la main)
 *
 * Le principe du Ch.08 tient : une source, plusieurs sorties. Seule la direction
 * s'adapte à la contrainte. tokens.json ne peut plus diverger de index.css —
 * c'est le point de tout l'exercice (Step 1 : une seule source de vérité).
 *
 *   node design-system/tools/tokens.mjs           # génère + valide
 *   node design-system/tools/tokens.mjs --check    # valide seulement (CI)
 *
 * Sort non-zéro si un alias est cassé ou boucle (Step 2 : validation).
 */

import { readFileSync, writeFileSync } from "node:fs";

const CSS = "src/index.css";
const OUT = "design-system/artifacts/tokens.json";
const checkOnly = process.argv.includes("--check");

// Espaces de noms primitifs : ces vars portent des valeurs brutes réutilisables.
const PRIMITIVE_NS = ["lime", "teal", "green", "amber", "red", "blue", "platform", "data"];

const src = readFileSync(CSS, "utf8");

/** Extrait le contenu d'un bloc `selector { ... }` par appariement d'accolades. */
function block(sel) {
  const start = src.indexOf(sel);
  if (start === -1) return "";
  let depth = 0, i = src.indexOf("{", start);
  const from = i + 1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(from, i);
  }
  return "";
}

/** Parse les `--name: value; /* comment *​/` d'un bloc. */
function parseVars(text) {
  const out = {};
  const re = /--([\w-]+):\s*([^;]+);(?:[ \t]*\/\*\s*(.*?)\s*\*\/)?/g;
  let m;
  while ((m = re.exec(text))) {
    out[m[1]] = { value: m[2].trim(), desc: m[3]?.trim() || null };
  }
  return out;
}

const dark = parseVars(block(":root {"));
const light = parseVars(block(".light {"));

// ── Classification ───────────────────────────────────────────────────────────
function layerOf(name) {
  if (name.startsWith("sidebar-")) return "component";
  if (PRIMITIVE_NS.some((ns) => name === ns || name.startsWith(ns + "-"))) return "primitive";
  return "semantic";
}

/** --lime-brand → primitive.lime.brand · --data-1 → primitive.data.1 */
function pathOf(name) {
  const layer = layerOf(name);
  if (layer === "primitive") {
    const i = name.indexOf("-");
    return `primitive.${name.slice(0, i)}.${name.slice(i + 1)}`;
  }
  if (layer === "component") return `component.${name.replace("sidebar-", "sidebar.")}`;
  return `semantic.${name}`;
}

// ── Validation (Step 2) ──────────────────────────────────────────────────────
const errors = [];
const allNames = new Set(Object.keys(dark));
const referenced = new Set();

/** Résout la chaîne d'alias d'une valeur, en détectant les cycles. */
function resolve(name, seen = new Set()) {
  if (seen.has(name)) {
    errors.push(`CYCLE d'alias : ${[...seen, name].join(" → ")}`);
    return "<cycle>";
  }
  const v = dark[name]?.value;
  if (!v) {
    errors.push(`Alias cassé : --${name} n'existe pas`);
    return "<undef>";
  }
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) {
    referenced.add(ref[1]);
    return resolve(ref[1], new Set(seen).add(name));
  }
  return v;
}

for (const name of allNames) resolve(name);

// Orphelins : primitives jamais référencées par var(). NB : platform.* et data.*
// sont consommés via des classes Tailwind (bg-platform-youtube), pas par var() —
// donc « orphelin CSS » n'est qu'un avertissement, pas une erreur.
const orphans = [...allNames].filter(
  (n) => layerOf(n) === "primitive" && !referenced.has(n),
);

if (errors.length) {
  console.error("\n❌ Validation échouée :");
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}

// ── Construction du DTCG ─────────────────────────────────────────────────────
function tokenFor(name) {
  const d = dark[name];
  const l = light[name];
  const ref = d.value.match(/^var\(--([\w-]+)\)$/);
  const t = {
    $value: ref ? `{${pathOf(ref[1])}}` : d.value,
  };
  if (name === "radius") t.$type = "dimension"; // override le $type:color de la couche
  if (d.desc) t.$description = d.desc;
  // Override clair, seulement s'il diffère du sombre.
  if (l && l.value !== d.value) {
    const lref = l.value.match(/^var\(--([\w-]+)\)$/);
    t.$extensions = { "streamnco.mode": { light: lref ? `{${pathOf(lref[1])}}` : l.value } };
  }
  return t;
}

/**
 * Insère un token à son chemin DTCG. `parts` est le chemin SANS le préfixe de
 * couche (déjà retiré par l'appelant) — sinon on obtient primitive.primitive.*.
 */
function insert(root, parts, token) {
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] ??= {};
  node[parts[parts.length - 1]] = token;
}

// $type au niveau de la couche : tout est couleur, sauf radius qui l'override.
// DTCG fait hériter le $type d'un groupe vers ses descendants.
const tokens = {
  $schema: "https://tr.designtokens.org/format/",
  $description:
    "GÉNÉRÉ depuis src/index.css par design-system/tools/tokens.mjs — NE PAS ÉDITER À LA MAIN. " +
    "index.css est la source de vérité (éditée par l'équipe + Lovable) ; ce fichier en est une sortie. " +
    "Régénérer : node design-system/tools/tokens.mjs. " +
    `Généré le ${new Date().toISOString()}.`,
  primitive: { $type: "color" },
  semantic: { $type: "color" },
  component: { $type: "color" },
};

for (const name of Object.keys(dark)) {
  const [layer, ...rest] = pathOf(name).split("."); // retire le préfixe de couche
  insert(tokens[layer], rest, tokenFor(name));
}

// ── Résumé ───────────────────────────────────────────────────────────────────
const counts = { primitive: 0, semantic: 0, component: 0 };
for (const name of Object.keys(dark)) counts[layerOf(name)]++;

console.log(`\nSource : ${CSS}  →  ${OUT}`);
console.log(`  ${counts.primitive} primitives · ${counts.semantic} sémantiques · ${counts.component} composant`);
console.log(`  aliases valides, aucun cycle ✓`);
if (orphans.length) {
  console.log(`  ${orphans.length} primitives non référencées par var() (consommées via Tailwind) :`);
  console.log(`    ${orphans.map((o) => "--" + o).join(", ")}`);
}

if (checkOnly) {
  console.log(`\n--check : validation seule, rien écrit.\n`);
} else {
  writeFileSync(OUT, JSON.stringify(tokens, null, 2) + "\n");
  console.log(`\ntokens.json régénéré ✓\n`);
}
