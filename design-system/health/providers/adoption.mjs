// Provider Adoption — à quel point le PRODUIT (Streamnco) consomme réellement le
// Design System. Distinct des "tracks" spacing (qui zonent la sévérité) : ici on
// mesure l'usage réel du DS dans le code applicatif.
//
// Périmètre (ADR 0005) : la métrique ne porte que sur les fichiers qui rendent de
// l'UI PRODUIT susceptible de consommer le DS. Sont exclus du DÉNOMINATEUR, car
// structurellement non-consommateurs :
//   - le cœur DS lui-même (ui/), les stories, les tests
//   - la logique sans UI DS : contexts/providers, hooks, entrée (main), routing (App),
//     gardes de route (ProtectedRoute), pages callback OAuth, pages de prose légale
//   - la surface MARKETING/blog (el-*/Inter) — design system distinct, exempté
//
// Signaux RÉELS, aucun inventé :
//  - component adoption : part des fichiers PRODUIT (dénominateur ci-dessus) qui importent @/components/ui
//  - raw elements       : <button|input|select|textarea> bruts restants (anti-signal),
//                         hors patterns légitimes (<input type="file"> caché pour upload)
//  - color tokens       : couleurs en dur (hex / classes arbitraires) restantes (dette)
//  - spacing scale      : repris du provider spacing (échelle preferred/compact)

import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { ROOT } from "../core/walk.mjs";
import { isMarketing } from "../core/scope.mjs";

const APP_ROOT = resolve(ROOT, "src");
const EXCLUDE = /(\/components\/ui\/|\.stories\.|\.test\.|\.spec\.)/;

// Fichiers structurellement non-consommateurs du DS produit (exclus du dénominateur, ADR 0005).
const NON_CONSUMER = /(\/contexts\/|\/hooks\/|\/main\.tsx$|\/App\.tsx$|ProtectedRoute|CallbackPage|Legal\w+Page)/;
// Surface marketing/blog (el-*/Inter) — DS distinct, exempté. Définition partagée
// avec le provider foundations-adoption (core/scope.mjs) : même périmètre exclu.

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

  let jsxFiles = 0, dsFiles = 0, rawEls = 0, hardColors = 0, excludedFromDenom = 0;
  const rawByTag = { button: 0, input: 0, select: 0, textarea: 0 };
  // <input type="file"> caché (upload par ref) = pattern légitime, non compté (ADR 0005).
  const rawRe = /<(button|select|textarea)[\s>/]|<input(?![^>]*type=["']file["'])[\s>/]/g;
  const hexRe = /#[0-9a-fA-F]{6}\b/g;
  const arbColorRe = /(?:bg|text|border|from|to|via|fill|stroke)-\[#[0-9a-fA-F]/g;

  for (const f of files) {
    let src;
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    const hasJsx = /<[A-Za-z][^>]*>/.test(src) || /\/>/.test(src);
    if (!hasJsx) continue; // fichiers pur-logique : hors dénominateur

    // Hors périmètre adoption (non-consommateurs structurels + marketing) : comptés à part.
    if (NON_CONSUMER.test(f) || isMarketing(f, src)) { excludedFromDenom++; continue; }

    jsxFiles++;
    if (/@\/components\/ui\//.test(src)) dsFiles++;
    let m;
    while ((m = rawRe.exec(src))) {
      const tag = m[0].slice(1).match(/^[a-z]+/)[0];
      rawByTag[tag]++; rawEls++;
    }
    hardColors += (src.match(hexRe) || []).length + (src.match(arbColorRe) || []).length;
  }

  const componentAdoption = jsxFiles ? dsFiles / jsxFiles : 0;

  return {
    provider: "adoption",
    appFiles: files.length,
    jsxFiles,
    dsFiles,
    excludedFromDenom,
    componentAdoption,
    rawElements: rawEls,
    rawByTag,
    hardColors,
    spacingScaleAdoption: spacingScaleAdoption ?? null,
  };
}
