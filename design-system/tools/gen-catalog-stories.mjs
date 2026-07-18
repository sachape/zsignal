// Génère les stories du CATALOGUE : une story par composant réel (pattern +
// composite, usedBy>0) encore absent du Storybook. Lit le manifest pour les
// chemins exacts, détecte l'export (default/nommé) et les props REQUISES, et
// fabrique une fixture par heuristique de type. Les composants à props
// complexes qui crasheront seront corrigés à la main ensuite.
//
// Usage : node design-system/tools/gen-catalog-stories.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "design-system/artifacts/manifest.json"), "utf8"));

// Déjà couverts (par nom, normalisé) — on ne double pas.
const storyDir = resolve(root, "design-system/stories");
const existing = new Set();
function collectStories(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) collectStories(resolve(dir, e.name));
    else if (e.name.endsWith(".stories.tsx")) existing.add(e.name.replace(/\.stories\.tsx$/, "").toLowerCase());
  }
}
collectStories(storyDir);
// Primitives/patterns déjà nommés autrement — on mappe les évidences.
const alreadyByName = new Set([...existing]);

const targets = manifest.items.filter(
  (i) => ["pattern", "composite"].includes(i.classHeuristic) && (i.usedBy || 0) > 0 && !alreadyByName.has(i.name.toLowerCase()),
);

const outDir = resolve(root, "design-system/stories/catalog");
mkdirSync(outDir, { recursive: true });

// Heuristique fixture selon le type TS brut.
function fixture(type) {
  const t = type.trim();
  if (/\bnull\b/.test(t) || /\bundefined\b/.test(t)) return "null";
  if (/=>|\(\s*\)\s*=>|\bFunction\b|^\(/.test(t)) return "() => {}";
  if (/\[\]$|\bArray<|\bReadonlyArray</.test(t)) return "[]";
  if (/\bboolean\b/.test(t)) return "true";
  if (/\bnumber\b/.test(t)) return "42";
  if (/\bDate\b/.test(t)) return "new Date()";
  if (/ReactNode|ReactElement|JSX\.Element|ReactChild/.test(t)) return '"Contenu"';
  if (/\bstring\b/.test(t) || /["'`]/.test(t)) return '"Exemple"';
  // objet / type métier : cast permissif — corrigé à la main si crash.
  return "{} as any";
}

// Parse le corps d'une interface/type Props et renvoie [{name, optional, type}].
function parseProps(src, name) {
  // Cherche une interface Props candidate.
  const names = [`${name}Props`, "Props"];
  for (const n of names) {
    const re = new RegExp(`(?:interface|type)\\s+${n}\\s*(?:=\\s*)?\\{`, "");
    const m = re.exec(src);
    if (!m) continue;
    let i = src.indexOf("{", m.index) + 1, depth = 1;
    let body = "";
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      if (depth > 0) body += src[i];
    }
    // Props de premier niveau : "name?: type;" (on ignore les niveaux imbriqués).
    const props = [];
    let d = 0, line = "";
    for (const ch of body) {
      if (ch === "{" || ch === "(" || ch === "<") d++;
      else if (ch === "}" || ch === ")" || ch === ">") d--;
      if ((ch === ";" || ch === "\n") && d === 0) {
        const mm = /^\s*([\w]+)(\??)\s*:\s*(.+)$/.exec(line.trim());
        if (mm) props.push({ name: mm[1], optional: mm[2] === "?", type: mm[3] });
        line = "";
      } else line += ch;
    }
    return props;
  }
  return [];
}

function categoryOf(file) {
  const parts = file.split("/"); // src/components/credits/X.tsx
  const idx = parts.indexOf("components");
  const sub = idx >= 0 && parts.length > idx + 2 ? parts[idx + 1] : "general";
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}

let count = 0;
const report = [];
for (const it of targets) {
  const abs = resolve(root, it.file);
  let src = "";
  try { src = readFileSync(abs, "utf8"); } catch { continue; }
  // Détection d'export : on préfère l'export NOMMÉ exact (export const/function
  // Name, ou export { Name }) ; sinon default ; sinon on SKIP (nom de fichier
  // sans export correspondant → à traiter à la main).
  const namedRe = new RegExp(`export\\s+(?:const|function|class)\\s+${it.name}\\b|export\\s*\\{[^}]*\\b${it.name}\\b`);
  const isNamed = namedRe.test(src);
  const hasDefault = /export\s+default/.test(src);
  if (!isNamed && !hasDefault) {
    report.push(`SKIP ${it.name} (aucun export nommé "${it.name}" ni default)`);
    continue;
  }
  const importPath = "@/" + it.file.replace(/^src\//, "").replace(/\.tsx?$/, "");
  const imp = isNamed ? `{ ${it.name} }` : it.name;
  const props = parseProps(src, it.name).filter((p) => !p.optional);
  const propStr = props.map((p) => `${p.name}={${fixture(p.type)}}`).join(" ");
  const cat = categoryOf(it.file);
  const body = `import type { Meta, StoryObj } from "@storybook/react-vite";
import ${imp} from "${importPath}";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tags ["catalog", "!test"] : navigable dans Storybook mais retiré du test
// runner (features lourdes/média qui ne tournent pas). a11y off : pas de hints
// axe sur des fixtures approximatives. Providers app via withApp.
const meta: Meta = { title: "Catalogue/${cat}/${it.name}", tags: ["catalog", "!test"], decorators: [withApp], parameters: { layout: "padded", a11y: { test: "off" } } };
export default meta;

export const Default: StoryObj = { render: () => <${it.name} ${propStr} /> };
`;
  writeFileSync(resolve(outDir, `${it.name}.stories.tsx`), body);
  count++;
  report.push(`${it.name} [${cat}] props:${props.length}`);
}

console.log(`  ${count} stories catalogue générées dans design-system/stories/catalog/`);
console.log("  " + report.length + " composants — dont à props requises : " + report.filter((r) => !r.endsWith("props:0")).length);
