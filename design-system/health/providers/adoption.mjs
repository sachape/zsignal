// Provider Adoption — à quel point le PRODUIT (Streamnco) consomme réellement le
// Design System. Distinct des "tracks" spacing (qui zonent la sévérité) : ici on
// mesure l'usage réel du DS dans le code applicatif.
//
// Signaux RÉELS, aucun inventé :
//  - component adoption : part des fichiers app (avec JSX) qui importent @/components/ui
//  - raw elements       : <button|input|select|textarea> bruts restants (anti-signal)
//  - color tokens       : couleurs en dur (hex / classes arbitraires) restantes (dette)
//  - spacing scale      : repris du provider spacing (échelle preferred/compact)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { ROOT } from "../core/walk.mjs";

const APP_ROOT = resolve(ROOT, "src");
const EXCLUDE = /(\/components\/ui\/|\.stories\.|\.test\.|\.spec\.)/;

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p, out); }
    else if (p.endsWith(".tsx") && !EXCLUDE.test(p)) out.push(p);
  }
}

export function runAdoption({ spacingScaleAdoption } = {}) {
  const files = [];
  walk(APP_ROOT, files);

  let jsxFiles = 0, dsFiles = 0, rawEls = 0, hardColors = 0;
  const rawByTag = { button: 0, input: 0, select: 0, textarea: 0 };
  const rawRe = /<(button|input|select|textarea)[\s>/]/g;
  const hexRe = /#[0-9a-fA-F]{6}\b/g;
  const arbColorRe = /(?:bg|text|border|from|to|via|fill|stroke)-\[#[0-9a-fA-F]/g;

  for (const f of files) {
    let src;
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    const hasJsx = /<[A-Za-z][^>]*>/.test(src) || /\/>/.test(src);
    if (!hasJsx) continue; // fichiers pur-logique : hors dénominateur
    jsxFiles++;
    if (/@\/components\/ui\//.test(src)) dsFiles++;
    let m;
    while ((m = rawRe.exec(src))) { rawByTag[m[1]]++; rawEls++; }
    hardColors += (src.match(hexRe) || []).length + (src.match(arbColorRe) || []).length;
  }

  const componentAdoption = jsxFiles ? dsFiles / jsxFiles : 0;

  return {
    provider: "adoption",
    appFiles: files.length,
    jsxFiles,
    dsFiles,
    componentAdoption,
    rawElements: rawEls,
    rawByTag,
    hardColors,
    spacingScaleAdoption: spacingScaleAdoption ?? null,
  };
}
