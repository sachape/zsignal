// Injecte la description de composant (pour autodocs) dans les metas des stories
// du DS, à partir du bloc JSDoc en tête de fichier (déjà écrit). Idempotent :
// saute les metas qui ont déjà une description.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dir = resolve(root, "design-system/stories");

// Nettoie un bloc JSDoc → prose courte (2 phrases max, ~240 car).
function clean(js) {
  let t = js.replace(/^\/\*\*/, "").replace(/\*\/$/, "");
  t = t.split("\n").map((l) => l.replace(/^\s*\*\s?/, "")).join(" ");
  t = t.replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
  // Coupe après la 2e phrase.
  const parts = t.split(/(?<=[.?!])\s+/);
  let out = parts.slice(0, 2).join(" ");
  if (out.length > 240) out = out.slice(0, 237).trimEnd() + "…";
  return out;
}

let done = 0, skipped = 0;
for (const name of readdirSync(dir)) {
  if (!name.endsWith(".stories.tsx")) continue;
  const file = resolve(dir, name);
  let src = readFileSync(file, "utf8");
  if (/docs:\s*\{\s*description/.test(src)) { skipped++; continue; }
  const jsdoc = src.match(/\/\*\*[\s\S]*?\*\//);
  if (!jsdoc) { skipped++; continue; }
  const desc = clean(jsdoc[0]);
  if (!desc) { skipped++; continue; }
  const inject = `docs: { description: { component: ${JSON.stringify(desc)} } }, `;
  // Insère dans le premier `parameters: {` du meta.
  if (/parameters:\s*\{/.test(src)) {
    src = src.replace(/parameters:\s*\{/, (m) => m + " " + inject);
  } else {
    // Pas de parameters : on en ajoute un juste après `component: X,` ou après `title: "...",`.
    src = src.replace(/(title:\s*[^,]+,)/, `$1\n  parameters: { ${inject} },`);
  }
  writeFileSync(file, src);
  done++;
}
console.log(`  descriptions injectées : ${done} · déjà présentes/sans JSDoc : ${skipped}`);
