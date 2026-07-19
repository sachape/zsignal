// Provider Quality — état des GARDE-FOUS du Design System (gates CI). Ne renvoie
// pas des scores : des ÉTATS de gouvernance dérivés de faits vérifiables (script
// présent dans package.json + workflow CI présent + baseline figée).
//
// La qualité VISUELLE (Chromatic, baseline, régression) ne vit PAS ici : elle a
// son propre domaine durable, le provider `visual-quality.mjs`.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../core/walk.mjs";

const pkgPath = resolve(ROOT, "package.json");
const wf = (f) => existsSync(resolve(ROOT, ".github/workflows", f));
const baselineExists = () => existsSync(resolve(ROOT, "reports/design-system/history/spacing-baseline.json"));

export function runQuality({ a11y } = {}) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const has = (s) => Boolean(pkg.scripts?.[s]);
  const ci = wf("ci.yml");

  // state: "pass" | "enforced" | "active" | "pending" | "todo" | "off"
  const items = [
    {
      name: "Accessibility",
      state: a11y?.status === "enforced" ? "pass" : "off",
      detail: "axe mode error, bloquante en CI",
    },
    {
      name: "Storybook build",
      state: has("build-storybook") && ci ? "enforced" : "off",
      detail: "build vérifié à chaque push",
    },
    {
      name: "Typecheck",
      state: has("typecheck") && ci ? "enforced" : "off",
      detail: "tsc --noEmit, gate CI",
    },
    {
      name: "Lint tokens",
      state: has("lint:tokens") && ci ? "enforced" : "off",
      detail: "hex/primitive interdits dans ui/",
    },
    {
      name: "Spacing baseline",
      state: has("check:spacing") && baselineExists() ? "active" : "off",
      detail: "anti-régression (ratchet) — bloque toute nouvelle dette",
    },
  ];
  return { provider: "quality", items };
}
