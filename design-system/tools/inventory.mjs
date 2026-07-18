#!/usr/bin/env node
/**
 * Inventaire du design system — Phase 1.
 *
 * Scanne src/components et src/pages et produit un manifeste des faits
 * mécaniques par fichier : exports, usage de CVA (API de variant), primitives
 * shadcn consommées, marqueur marketing (el-*), valeurs de couleur en dur,
 * taille.
 *
 * Ce script est VERSIONNÉ et RE-JOUABLE. Il n'est pas jetable : relancé plus
 * tard, il mesure la dérive (E-04 de l'audit doit tendre vers 0). C'est le
 * « lint DS » que le Vol.1 Ch.13 recommande d'automatiser.
 *
 *   node design-system/tools/inventory.mjs
 *
 * Sort : design-system/artifacts/manifest.json  (données)
 *        + un résumé sur stdout.
 *
 * Ne classe PAS. La classification (primitive / pattern / composite / one-off /
 * marketing) est une décision de design, faite dans 01-inventory.md à partir de
 * ces faits. Le script fournit une classification HEURISTIQUE de départ, à
 * corriger à la main — jamais à prendre pour argent comptant.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src/components", "src/pages"];
const OUT_DIR = "design-system/artifacts";

/**
 * Littéraux LÉGITIMES — pas de la dérive.
 *
 * Une source de vérité qui tokenise des données est aussi fausse qu'une qui
 * laisse traîner de la dérive. Ces fichiers gardent des couleurs en dur pour
 * une raison structurelle, vérifiée à la Phase 2. Le thermomètre les exclut de
 * la « vraie dérive » — mais les compte toujours en brut, pour transparence.
 */
const ALLOWED_LITERALS = {
  "src/components/clips/CaptionStylePreviewGrid.tsx":
    "Définitions de styles de sous-titre (contours, glow) — c'est de la donnée, pas une surface thémable.",
  "src/components/ShareScoreCard.tsx":
    "Carte exportée en image (html-to-image) : les variables CSS ne se résolvent pas à la capture. Doit être self-contained.",
  "src/components/ui/chart.tsx":
    "Sélecteurs CSS ciblant les défauts de Recharts ([stroke='#ccc']) — des matchers, pas des couleurs appliquées.",
  "src/components/auth/AuthForm.tsx":
    "Couleurs officielles du logo Google (SVG) — identité de marque tierce, doit rester exacte.",
};

/** Marche récursivement, ne garde que les .tsx (les composants sont en TSX). */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Compte les occurrences non chevauchantes d'un regex global. */
function count(text, re) {
  return (text.match(re) || []).length;
}

function analyze(file) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const lines = src.split("\n").length;

  // Exports de composants : `export function X`, `export const X =`,
  // `export default function X`. On ne garde que les identifiants capitalisés
  // (convention React) pour écarter les hooks et helpers.
  const exports = [
    ...src.matchAll(/export\s+(?:default\s+)?(?:function|const)\s+([A-Z]\w+)/g),
  ].map((m) => m[1]);

  // Primitives shadcn consommées : imports depuis @/components/ui/*.
  const uiImports = [
    ...src.matchAll(/from\s+["']@\/components\/ui\/([\w-]+)["']/g),
  ].map((m) => m[1]);

  const usesCva = /\bcva\s*\(/.test(src);
  const isMarketing = /\bel-[a-z]/.test(src) || rel.includes("/site/");

  const hardcodedHex = count(src, /#[0-9a-fA-F]{3,8}\b/g);
  const hardcodedRgb = count(src, /\brgba?\(\s*\d/g);

  // A-t-il une interface/type de props ? Signal d'un composant "API-ready".
  const hasPropsType = /(?:interface|type)\s+\w*Props\b/.test(src);

  return {
    file: rel,
    name: basename(file, ".tsx"),
    exports,
    lines,
    usesCva,
    hasPropsType,
    uiConsumed: [...new Set(uiImports)],
    hardcodedColors: hardcodedHex + hardcodedRgb,
    isMarketing,
  };
}

// ── Scan ────────────────────────────────────────────────────────────────────
const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
const items = files.map(analyze);

// Combien de fois chaque fichier est-il importé ailleurs ? Un composant importé
// une seule fois est un candidat one-off ; importé partout, c'est une primitive.
const importCount = Object.fromEntries(items.map((i) => [i.name, 0]));
for (const it of items) {
  const src = readFileSync(join(ROOT, it.file), "utf8");
  for (const other of items) {
    if (other.name === it.name) continue;
    // import du nom du fichier via un chemin
    if (new RegExp(`["'][^"']*/${other.name}["']`).test(src)) {
      importCount[other.name]++;
    }
  }
}

/**
 * Classification HEURISTIQUE. Point de départ, pas verdict.
 *  - ui/            → primitive (shadcn, socle)
 *  - el-* / site/   → marketing (hors scope app)
 *  - importé ≥ 3×   → pattern (réutilisé, porte une décision)
 *  - importé 1-2×   → composite
 *  - importé 0×     → one-off (souvent monté directement dans une page)
 */
function classify(it) {
  if (it.isMarketing) return "marketing";
  if (it.file.includes("/components/ui/")) return "primitive";
  const used = importCount[it.name] ?? 0;
  if (it.file.includes("/pages/")) return "page";
  if (used >= 3) return "pattern";
  if (used >= 1) return "composite";
  return "one-off";
}

for (const it of items) {
  it.classHeuristic = classify(it);
  it.usedBy = importCount[it.name] ?? 0; // nb de fichiers qui l'importent (0 = mort)
}

// ── Résumé ──────────────────────────────────────────────────────────────────
const byClass = {};
for (const it of items) byClass[it.classHeuristic] = (byClass[it.classHeuristic] || 0) + 1;

const totalHardcoded = items.reduce((s, i) => s + i.hardcodedColors, 0);
const cvaCount = items.filter((i) => i.usesCva).length;
const propsCount = items.filter((i) => i.hasPropsType).length;

// Vraie dérive = valeurs en dur HORS littéraux légitimes. C'est la métrique
// qui doit tendre vers 0 ; le brut, lui, ne l'atteindra jamais (et c'est sain).
const trueDrift = items
  .filter((i) => !(i.file in ALLOWED_LITERALS) && i.hardcodedColors > 0)
  .sort((a, b) => b.hardcodedColors - a.hardcodedColors);
const trueDriftTotal = trueDrift.reduce((s, i) => s + i.hardcodedColors, 0);
const allowedTotal = totalHardcoded - trueDriftTotal;

mkdirSync(join(ROOT, OUT_DIR), { recursive: true });
writeFileSync(
  join(ROOT, OUT_DIR, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), byClass, items }, null, 2),
);

console.log(`\nInventaire — ${items.length} fichiers scannés\n`);
console.log("Classification heuristique :");
for (const [k, v] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}
console.log(`\n  ${cvaCount} composants avec API de variant (CVA)`);
console.log(`  ${propsCount} composants avec un type Props`);
console.log(`\n  Couleurs en dur : ${totalHardcoded} brut`);
console.log(`    dont ${allowedTotal} littéraux légitimes (data-viz, export, logos, sélecteurs)`);
console.log(`    → VRAIE DÉRIVE : ${trueDriftTotal} (cible : 0)`);
if (trueDrift.length) {
  console.log(`    reste à résorber :`);
  for (const i of trueDrift) {
    console.log(`      ${String(i.hardcodedColors).padStart(3)}  ${i.file.replace("src/", "")}`);
  }
}
console.log(`\nManifeste écrit → ${OUT_DIR}/manifest.json\n`);
