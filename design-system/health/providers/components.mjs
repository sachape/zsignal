// Provider Components — inventaire réel des composants ui/ et de leur couverture
// story. Ne mesure QUE des faits vérifiables (fichier présent, importé par une
// story). Aucun score de "test coverage" inventé.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { ROOT } from "../core/walk.mjs";

const UI_DIR = resolve(ROOT, "src/components/ui");
const STORY_ROOTS = [resolve(ROOT, "design-system/stories"), resolve(ROOT, "src")];

function walkStories(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walkStories(p, out);
    else if (e.name.endsWith(".stories.tsx") || e.name.endsWith(".stories.ts")) out.push(p);
  }
}

export function runComponents() {
  const components = readdirSync(UI_DIR)
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".stories.tsx"))
    .map((f) => f.replace(/\.tsx$/, ""));

  const storyFiles = [];
  for (const r of STORY_ROOTS) walkStories(r, storyFiles);
  const haystack = storyFiles.map((f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } }).join("\n");

  const withStory = components.filter((c) => haystack.includes(`components/ui/${c}"`) || haystack.includes(`components/ui/${c}'`));
  const total = components.length;
  const coverage = total ? withStory.length / total : 0;

  return {
    provider: "components",
    total,
    withStory: withStory.length,
    coverage,
    missing: components.filter((c) => !withStory.includes(c)),
  };
}
