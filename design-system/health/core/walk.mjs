// Core Health — découverte des fichiers à scanner + classement de piste.
// Réutilise l'esprit de design-system/tools/lint-tokens.mjs : le CŒUR du DS est
// en piste ERROR (bloquant à terme), le reste de l'app en piste WARN.

import { readdirSync, statSync, readFileSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(), "../../..");
function dirname() { return fileURLToPath(new URL(".", import.meta.url)); }

const SCAN_ROOTS = ["src", "design-system"];
const EXTS = new Set([".tsx", ".ts", ".css"]);

// Jamais scannés : générés, build, config Storybook, artefacts, le moteur Health
// lui-même, les tokens (ce sont les VALEURS, pas des usages), et le CATALOGUE
// (composants feature, hors périmètre DS).
const SKIP = [
  /node_modules/, /storybook-static/, /\/dist\//, /\/build\//,
  /\.generated\./, /design-system\/artifacts\//, /design-system\/health\//,
  /\/\.storybook\//, /design-system\/tokens\.build\.mjs$/,
  /design-system\/stories\/catalog\//,
  /\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /\/tokens\//,
];

// Piste ERROR = cœur réutilisable du Design System.
const ERROR_TRACK = [
  /src\/components\/ui\//,
  /design-system\/stories\/[^/]+\.stories\.tsx$/, // stories DS de 1er niveau (hors catalog déjà exclu)
  /src\/index\.css$/,
];

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const full = resolve(dir, name);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { walk(full, out); continue; }
    if (!EXTS.has(extname(full))) continue;
    const rel = relative(ROOT, full);
    if (SKIP.some((r) => r.test(rel))) continue;
    out.push({
      file: rel,
      abs: full,
      kind: extname(full) === ".css" ? "css" : "tsx",
      track: ERROR_TRACK.some((r) => r.test(rel)) ? "error" : "warn",
      code: readFileSync(full, "utf8"),
    });
  }
}

export function collectFiles() {
  const out = [];
  for (const r of SCAN_ROOTS) walk(resolve(ROOT, r), out);
  return out;
}

export function describeScope(files) {
  return {
    roots: SCAN_ROOTS,
    extensions: [...EXTS],
    excluded: SKIP.map(String),
    errorTrackPatterns: ERROR_TRACK.map(String),
    filesScanned: files.length,
    errorTrackFiles: files.filter((f) => f.track === "error").length,
    warnTrackFiles: files.filter((f) => f.track === "warn").length,
  };
}
