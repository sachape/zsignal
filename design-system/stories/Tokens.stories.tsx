import type { Meta, StoryObj } from "@storybook/react-vite";
import tokens from "../artifacts/tokens.json";

/**
 * La page Tokens — générée en parcourant tokens.json (lui-même généré depuis
 * index.css). Elle reste donc TOUJOURS vraie : ajoute un token dans index.css,
 * régénère, il apparaît ici. C'est la réponse visuelle à « quels tokens existent ».
 */

type Node = Record<string, unknown>;

/** Le nom de variable CSS d'un token. On parcourt chaque couche séparément, donc
 *  `path` ne contient PAS le préfixe de couche : lime.brand → --lime-brand,
 *  primary → --primary, sidebar.primary → --sidebar-primary. */
function cssVar(path: string[]): string {
  return "--" + path.join("-");
}

/** Parcourt un layer et collecte les feuilles ($value). */
function leaves(node: Node, path: string[] = []): { path: string[]; token: Node }[] {
  const out: { path: string[]; token: Node }[] = [];
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$")) continue;
    if (v && typeof v === "object" && "$value" in (v as Node)) {
      out.push({ path: [...path, k], token: v as Node });
    } else if (v && typeof v === "object") {
      out.push(...leaves(v as Node, [...path, k]));
    }
  }
  return out;
}

function Swatch({ path, token }: { path: string[]; token: Node }) {
  const v = cssVar(path);
  const isDim = String(token.$value).includes("rem");
  return (
    <div
      style={{
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        overflow: "hidden",
        background: "hsl(var(--card))",
      }}
    >
      <div
        style={{
          height: 56,
          background: isDim ? "hsl(var(--muted))" : `hsl(var(${v}))`,
        }}
      />
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: "hsl(var(--foreground))" }}>
          {v}
        </div>
        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
          {String(token.$value)}
        </div>
        {token.$description ? (
          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
            {String(token.$description)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Layer({ title, node }: { title: string; node: Node }) {
  const items = leaves(node);
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ color: "hsl(var(--foreground))", fontSize: 15, marginBottom: 12, fontWeight: 600 }}>
        {title} <span style={{ color: "hsl(var(--muted-foreground))", fontWeight: 400 }}>({items.length})</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        {items.map((it) => (
          <Swatch key={it.path.join(".")} path={it.path} token={it.token} />
        ))}
      </div>
    </section>
  );
}

function TokensPage() {
  return (
    <div style={{ padding: 24, fontFamily: "Instrument Sans, system-ui, sans-serif" }}>
      <h1 style={{ color: "hsl(var(--foreground))", fontSize: 20, fontWeight: 700 }}>
        Design Tokens — Streamnco (app)
      </h1>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, maxWidth: 560, marginBottom: 24 }}>
        Généré depuis <code>index.css</code>. Trois couches : primitive → sémantique → composant.
        Les couleurs affichées sont les vraies variables CSS.
      </p>
      <Layer title="Primitives" node={tokens.primitive as Node} />
      <Layer title="Sémantiques" node={tokens.semantic as Node} />
      <Layer title="Composant" node={tokens.component as Node} />
    </div>
  );
}

const meta: Meta<typeof TokensPage> = {
  title: "Design System/Tokens",
  component: TokensPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

export const All: StoryObj<typeof TokensPage> = {};
