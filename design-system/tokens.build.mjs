// Pipeline Design Tokens — Style Dictionary (source unique → CSS / SCSS / TS / JSON).
//
// Source de vérité : tokens/{primitives,semantic,components}/*.json (DTCG) + le
// pont de compat shadcn (tokens/compat*.json). Chaîne : primitive → semantic →
// component. On génère :
//   - src/tokens.generated.css        (:root, thème sombre + toutes couches)
//   - src/tokens.light.generated.css  (.light, overrides couleurs)
//   - design-system/artifacts/tokens.scss
//   - design-system/artifacts/tokens.ts
//   - design-system/artifacts/tokens.json  (riche : résolu + alias + méta, pour Storybook)
import StyleDictionary from "style-dictionary";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const isColor = (t) => (t.$type ?? t.type) === "color";

// hsl(H S% L%) → "H S% L%" : shadcn/Tailwind consomme `hsl(var(--x))`, la var
// doit donc porter les canaux seuls. Les non-hsl (transparent, rem…) passent tels quels.
StyleDictionary.registerTransform({
  name: "color/hslChannels",
  type: "value",
  transitive: true,
  filter: isColor,
  transform: (t) => {
    const v = String(t.$value ?? t.value);
    const m = v.match(/^hsl\(\s*([^)]+)\)$/i);
    return m ? m[1].replace(/\s+/g, " ").trim() : v;
  },
});

// Le pont compat vit sous le namespace `shadcn.*` pour ne PAS entrer en
// collision d'arbre avec les groupes réels (card.*, border.*, radius.*…). On
// retire ce préfixe à la sortie : `shadcn.card` → `--card`, `shadcn.radius` → `--radius`.
StyleDictionary.registerTransform({
  name: "name/strip-shadcn",
  type: "name",
  transform: (t) => t.name.replace(/^shadcn-/, ""),
});

StyleDictionary.registerTransformGroup({
  name: "css-hsl",
  transforms: ["name/kebab", "name/strip-shadcn", "color/hslChannels"],
});

// Format riche pour Storybook : chaque token avec sa couche, son alias source,
// sa valeur résolue, son type et sa description.
const layerOf = (fp = "") =>
  fp.includes("/primitives/") ? "primitive"
  : fp.includes("/semantic/") ? "semantic"
  : fp.includes("/components/") ? "component"
  : "compat";

// Export TS robuste (map nom → valeur résolue). Le format es6 natif bute sur
// les tokens composites (typographie = objet) ; on sérialise en JSON.
StyleDictionary.registerFormat({
  name: "typescript/tokens",
  format: ({ dictionary }) => {
    const obj = {};
    for (const t of dictionary.allTokens) obj["--" + t.name] = t.value ?? t.$value;
    return (
      "// GÉNÉRÉ — ne pas éditer. Source : tokens/**/*.json\n" +
      `export const tokens = ${JSON.stringify(obj, null, 2)} as const;\n\n` +
      "export type TokenName = keyof typeof tokens;\n"
    );
  },
});

// Le CSS ne peut pas porter un token composite (typographie = objet). On les
// exclut du CSS/SCSS (ils restent dans le JSON Storybook, rendus à part).
const cssEmittable = (t) => (t.$type ?? t.type) !== "typography";

StyleDictionary.registerFormat({
  name: "json/storybook",
  format: ({ dictionary }) => {
    const rows = dictionary.allTokens.map((t) => ({
      name: t.name,
      cssVar: "--" + t.name,
      path: t.path,
      layer: layerOf(t.filePath || ""),
      component: layerOf(t.filePath) === "component" ? t.path[0] : null,
      type: t.$type ?? t.type ?? null,
      value: t.$value ?? t.value,
      reference:
        typeof (t.original?.$value ?? t.original?.value) === "string" &&
        /\{.+\}/.test(String(t.original?.$value ?? t.original?.value))
          ? String(t.original?.$value ?? t.original?.value)
          : null,
      description: t.$description ?? t.description ?? null,
    }));
    return JSON.stringify(rows, null, 2);
  },
});

const LAYER_SOURCES = [
  "tokens/primitives/*.json",
  "tokens/semantic/color.json",
  "tokens/semantic/spacing.json",
  "tokens/semantic/sizing.json",
  "tokens/semantic/radius.json",
  "tokens/semantic/elevation.json",
  "tokens/semantic/motion.json",
  "tokens/semantic/typography.json",
  "tokens/components/*.json",
].map((p) => resolve(root, p));

async function run() {
  // ── Build SOMBRE (:root) + SCSS + TS + JSON Storybook ──────────────────
  const dark = new StyleDictionary({
    usesDtcg: true,
    log: { verbosity: "verbose", warnings: "warn" },
    source: [...LAYER_SOURCES, resolve(root, "tokens/compat.json")],
    platforms: {
      css: {
        transformGroup: "css-hsl",
        buildPath: resolve(root, "src") + "/",
        options: { outputReferences: true },
        files: [
          {
            destination: "tokens.generated.css",
            format: "css/variables",
            filter: cssEmittable,
            options: { selector: ":root", outputReferences: true },
          },
        ],
      },
      scss: {
        transformGroup: "css-hsl",
        buildPath: resolve(root, "design-system/artifacts") + "/",
        files: [{ destination: "tokens.scss", format: "scss/variables", filter: cssEmittable, options: { outputReferences: true } }],
      },
      ts: {
        transformGroup: "css-hsl",
        buildPath: resolve(root, "design-system/artifacts") + "/",
        files: [{ destination: "tokens.ts", format: "typescript/tokens" }],
      },
      storybook: {
        transformGroup: "css-hsl",
        buildPath: resolve(root, "design-system/artifacts") + "/",
        files: [{ destination: "tokens.json", format: "json/storybook" }],
      },
    },
  });
  await dark.buildAllPlatforms();

  // ── Build CLAIR (.light) — uniquement les couleurs ─────────────────────
  const light = new StyleDictionary({
    usesDtcg: true,
    log: { verbosity: "verbose", warnings: "warn" },
    source: [
      ...LAYER_SOURCES,
      resolve(root, "tokens/semantic/color.light.json"),
      resolve(root, "tokens/compat.json"),
      resolve(root, "tokens/compat.light.json"),
    ],
    platforms: {
      css: {
        transformGroup: "css-hsl",
        buildPath: resolve(root, "src") + "/",
        files: [
          {
            destination: "tokens.light.generated.css",
            format: "css/variables",
            filter: isColor,
            options: { selector: ".light", outputReferences: true },
          },
        ],
      },
    },
  });
  await light.buildAllPlatforms();

  // En-tête « ne pas éditer » sur les CSS générés.
  for (const f of ["src/tokens.generated.css", "src/tokens.light.generated.css"]) {
    const p = resolve(root, f);
    const banner = `/* GÉNÉRÉ par design-system/tokens.build.mjs — NE PAS ÉDITER.\n   Source : le dossier tokens/. Régénère : npm run tokens:build */\n`;
    writeFileSync(p, banner + readFileSync(p, "utf8"));
  }
  console.log("  ✓ tokens générés (css :root + .light, scss, ts, json Storybook)");
}

run();
