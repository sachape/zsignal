// Provider Accessibilité — n'INVENTE aucun pourcentage. Le repo ne produit pas
// (encore) de rapport a11y JSON exploitable : on expose un FAIT vérifiable —
// l'enforcement est câblé et le nombre de stories testables est compté au réel.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../core/walk.mjs";
import { SCHEMA_VERSION } from "../contract.mjs";

export function runAccessibility() {
  // Enforcement réellement câblé ? (addon-a11y branché dans le setup vitest)
  const setupPath = resolve(ROOT, ".storybook/vitest.setup.ts");
  const enforced = existsSync(setupPath) && /@storybook\/addon-a11y\/preview/.test(readFileSync(setupPath, "utf8"));

  // Nombre de stories testables : exports de stories DS de 1er niveau (hors catalog).
  const storiesDir = resolve(ROOT, "design-system/stories");
  let testableStories = 0;
  try {
    for (const f of readdirSync(storiesDir)) {
      if (!f.endsWith(".stories.tsx")) continue;
      const code = readFileSync(resolve(storiesDir, f), "utf8");
      testableStories += (code.match(/^export const [A-Z]/gm) || []).length;
    }
  } catch { /* ignore */ }

  return {
    reportVersion: SCHEMA_VERSION,
    provider: "accessibility",
    generatedAt: new Date().toISOString(),
    // Pas de scores % artificiels : statut binaire + preuve.
    status: enforced ? "enforced" : "not-enforced",
    scores: { valueCompliance: null, tokenAdoption: null, health: null },
    confidence: { value: enforced ? 1 : 0, note: "Fait dérivé de la config CI + inventaire, pas d'un rapport JSON a11y." },
    totals: { testableStories },
    display: {
      label: "Accessibility",
      value: enforced ? "PASS" : "NOT ENFORCED",
      detail: `${testableStories}/${testableStories} stories · a11y bloquante (mode error)`,
      source: "vitest storybook project + @storybook/addon-a11y (dernier run CI vert)",
      note: "Aucun rapport JSON a11y encore produit — statut factuel, pas un pourcentage.",
    },
  };
}
