#!/usr/bin/env node
/**
 * Générateur de catalogue — Phase 3, étages 6-7 du Vol.1 Ch.07.
 *
 * Lit artifacts/manifest.json (produit par inventory.mjs) et génère un catalogue
 * lisible des primitives et composites. GÉNÉRÉ, pas écrit à la main : il reste
 * vrai à chaque régénération (même principe que tokens.json).
 *
 *   node design-system/tools/inventory.mjs   # d'abord (rafraîchit le manifeste)
 *   node design-system/tools/catalog.mjs      # puis le catalogue
 *
 * Répond à « combien de composants, comment sont-ils construits » — et signale
 * les trous : primitives sans API de variant, composants morts, personnalisés.
 */

import { readFileSync, writeFileSync } from "node:fs";

const m = JSON.parse(readFileSync("design-system/artifacts/manifest.json", "utf8"));
const app = m.items.filter((i) => !i.isMarketing);
const OUT = "design-system/06-catalog.md";

const primitives = app.filter((i) => i.classHeuristic === "primitive").sort((a, b) => a.name.localeCompare(b.name));
const composites = app.filter((i) => i.classHeuristic === "composite" || i.classHeuristic === "pattern");
const oneoffs = app.filter((i) => i.classHeuristic === "one-off");

// Composites groupés par feature folder.
const byFeature = {};
for (const c of composites) {
  const parts = c.file.split("/");
  const idx = parts.indexOf("components");
  const feature = idx >= 0 && parts[idx + 2] ? parts[idx + 1] : "(racine)";
  (byFeature[feature] ??= []).push(c.name);
}

const primNoVariant = primitives.filter((p) => !p.usesCva);
const primDead = primitives.filter((p) => p.usedBy === 0);
const primCustom = primitives.filter((p) => p.hardcodedColors > 0);

const flag = (p) => {
  const f = [];
  if (p.usedBy === 0) f.push("mort");
  if (p.hardcodedColors > 0) f.push("personnalisé");
  return f.join(", ") || "—";
};

const rows = primitives
  .map(
    (p) =>
      `| \`${p.name}\` | ${p.usesCva ? "✅" : "—"} | ${p.usedBy} | ${p.lines} | ${flag(p)} |`,
  )
  .join("\n");

const featureRows = Object.entries(byFeature)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([f, names]) => `| \`${f}/\` | ${names.length} | ${names.join(", ")} |`)
  .join("\n");

const doc = `# Catalogue des composants (étages 6-7)

> GÉNÉRÉ par \`design-system/tools/catalog.mjs\` depuis le manifeste — NE PAS
> ÉDITER À LA MAIN. Régénérer : \`node design-system/tools/inventory.mjs && node design-system/tools/catalog.mjs\`.
>
> Répond à *combien de composants, comment sont-ils construits* (Vol.1 Ch.07).

## En un coup d'œil

- **${primitives.length} primitives** (shadcn/ui). Le socle.
- **${composites.length} composites + patterns**, groupés par feature. Des **consommateurs** du DS.
- **${oneoffs.length} one-offs** (montés directement, non réutilisés).

### Les trous (E-06 de l'audit)

- **${primNoVariant.length}/${primitives.length} primitives sans API de variant** (pas de CVA).
  Normal pour beaucoup (un \`Separator\` n'a pas de variant) — mais à vérifier pour
  \`Badge\`, \`Alert\`, etc. où un variant manque souvent.
- **${primDead.length} primitives sans import direct détecté** — le scaffold shadcn
  en livre 49, l'app en utilise ~${primitives.length - primDead.length}. Candidates
  au retrait, **à vérifier** avant (la détection est par chemin, elle peut rater un
  ré-export) :
  ${primDead.length ? primDead.map((p) => "`" + p.name + "`").join(", ") : "aucune"}.
- **${primCustom.length} primitives personnalisées** (contiennent des valeurs en dur) :
  ${primCustom.length ? primCustom.map((p) => "`" + p.name + "`").join(", ") : "aucune"}.

## Primitives (shadcn/ui)

| Composant | API variant | Importé par | Lignes | Signal |
|---|---|---|---|---|
${rows}

## Composites & patterns (consommateurs, par feature)

Ces composants **consomment** le DS ; ils n'en sont pas membres. Ils apparaîtront
dans Storybook comme *exemples d'usage*, pas comme composants du système.

| Feature | Nb | Composants |
|---|---|---|
${featureRows}

## Ce que ça dit pour la suite

- Les primitives sans variant ni usage sont le premier ménage (retrait ou API).
- Les composites restent des consommateurs — on ne les spécifie pas ; on documente
  les **patterns** qu'ils devraient réutiliser (voir \`specs/\`).
- Storybook (Phase 4) montrera les primitives + les 3 patterns, pas les ${composites.length}
  composites de feature.
`;

writeFileSync(OUT, doc);
console.log(`Catalogue généré → ${OUT}`);
console.log(`  ${primitives.length} primitives · ${composites.length} composites/patterns · ${oneoffs.length} one-offs`);
console.log(`  ${primNoVariant.length} sans API de variant · ${primDead.length} mortes · ${primCustom.length} personnalisées`);
