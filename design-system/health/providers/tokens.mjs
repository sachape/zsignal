// Provider Tokens — comptage réel des tokens par couche depuis l'artefact généré
// (design-system/artifacts/tokens.json). Pas de "Token Health" inventé : un
// comptage factuel Primitive / Semantic / Component / Compat.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../core/walk.mjs";

const TOKENS = resolve(ROOT, "design-system/artifacts/tokens.json");

export function runTokens() {
  const arr = JSON.parse(readFileSync(TOKENS, "utf8"));
  const byLayer = {};
  for (const t of arr) {
    const l = t.layer || "unknown";
    byLayer[l] = (byLayer[l] || 0) + 1;
  }
  return { provider: "tokens", total: arr.length, byLayer };
}
