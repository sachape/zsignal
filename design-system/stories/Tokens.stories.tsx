import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import rawTokens from "../artifacts/tokens.json";

/**
 * Explorateur de Design Tokens — RENDU LISIBLE de l'architecture.
 *
 * La source de vérité vit dans `tokens/**` (DTCG) et est transformée par Style
 * Dictionary (voir design-system/tokens.build.mjs). Cette page ne fait que la
 * PARCOURIR : elle lit `tokens.json` généré (nom, couche, valeur résolue, alias
 * source, type, description) et l'affiche par couche → catégorie, avec filtres
 * et recherche. Chaîne : primitive → semantic → component (+ pont compat shadcn).
 */

type Row = {
  name: string;
  cssVar: string;
  path: string[];
  layer: "primitive" | "semantic" | "component" | "compat";
  component: string | null;
  type: string | null;
  value: unknown;
  reference: string | null;
  description: string | null;
};

const TOKENS = rawTokens as Row[];

/** Catégorie d'affichage : 1er segment porteur de sens selon la couche. */
function categoryOf(t: Row): string {
  if (t.layer === "component" || t.layer === "compat") return t.component ?? t.path[0];
  // primitive/semantic : color.background → "color", space.component → "space"…
  return t.path[0];
}

/** Couleur CSS prête à peindre : les couleurs sont stockées en canaux HSL. */
function colorValue(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (v === "transparent") return "transparent";
  // "95 98% 61%" → hsl(95 98% 61%) ; "95 98% 61% / 0.9" géré aussi.
  if (/^\d[\d.]*\s+\d[\d.]*%\s+\d/.test(v)) return `hsl(${v})`;
  if (/^(#|rgb|hsl)/.test(v)) return v;
  return null;
}

const c = {
  fg: "hsl(var(--foreground))",
  fg2: "hsl(var(--muted-foreground))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  muted: "hsl(var(--muted))",
  mono: "'JetBrains Mono', monospace",
};

const LAYER_BADGE: Record<Row["layer"], string> = {
  primitive: "hsl(217 91% 60%)",
  semantic: "hsl(172 66% 50%)",
  component: "hsl(95 98% 61%)",
  compat: "hsl(38 92% 50%)",
};

function Preview({ t }: { t: Row }) {
  const box = { width: 44, height: 44, borderRadius: 8, flexShrink: 0, border: `1px solid ${c.border}` };
  const col = colorValue(t.value);
  if (t.type === "color" && col) {
    return <div style={{ ...box, background: col, backgroundImage: col === "transparent" ? "repeating-conic-gradient(#8884 0% 25%, transparent 0% 50%) 50% / 12px 12px" : undefined }} />;
  }
  if (t.type === "shadow" && typeof t.value === "string") {
    return <div style={{ ...box, background: c.card, boxShadow: t.value }} />;
  }
  if (t.type === "typography" && t.value && typeof t.value === "object") {
    return <div style={{ ...box, display: "grid", placeItems: "center", background: c.muted, fontWeight: 700, color: c.fg }}>Aa</div>;
  }
  if (t.type === "dimension" && typeof t.value === "string") {
    const rem = parseFloat(t.value);
    const px = t.value.includes("rem") ? rem * 16 : rem;
    return (
      <div style={{ ...box, display: "grid", placeItems: "center", background: c.muted, overflow: "hidden" }}>
        <div style={{ width: Math.min(Math.max(px, 2), 40), height: Math.min(Math.max(px, 2), 40), background: "hsl(var(--primary))", borderRadius: t.path.includes("radius") ? `${Math.min(px, 20)}px` : 2 }} />
      </div>
    );
  }
  return <div style={{ ...box, display: "grid", placeItems: "center", background: c.muted, color: c.fg2, fontSize: 10, fontFamily: c.mono }}>{String(t.type ?? "").slice(0, 4)}</div>;
}

function TokenCard({ t }: { t: Row }) {
  const val = typeof t.value === "object" ? JSON.stringify(t.value) : String(t.value);
  return (
    <div style={{ display: "flex", gap: 12, padding: 12, border: `1px solid ${c.border}`, borderRadius: 10, background: c.card, alignItems: "flex-start" }}>
      <Preview t={t} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: c.mono, fontSize: 12.5, color: c.fg, wordBreak: "break-all" }}>{t.cssVar}</div>
        <div style={{ fontFamily: c.mono, fontSize: 11, color: c.fg2, marginTop: 3, wordBreak: "break-all" }}>{val}</div>
        {t.reference ? (
          <div style={{ fontSize: 11, color: c.fg2, marginTop: 4 }}>
            alias&nbsp;→&nbsp;<span style={{ fontFamily: c.mono, color: "hsl(var(--primary-strong))" }}>{t.reference}</span>
          </div>
        ) : null}
        {t.description ? <div style={{ fontSize: 11.5, color: c.fg2, marginTop: 4, lineHeight: 1.4 }}>{t.description}</div> : null}
      </div>
      <span style={{ fontSize: 9.5, fontFamily: c.mono, color: "hsl(var(--background))", background: LAYER_BADGE[t.layer], borderRadius: 4, padding: "2px 5px", textTransform: "uppercase", flexShrink: 0 }}>{t.layer}</span>
    </div>
  );
}

function Explorer({ layer, title, blurb }: { layer: Row["layer"] | "all"; title: string; blurb: string }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");

  const pool = useMemo(() => TOKENS.filter((t) => (layer === "all" ? true : layer === "component" ? t.layer === "component" || t.layer === "compat" : t.layer === layer)), [layer]);
  const types = useMemo(() => ["all", ...Array.from(new Set(pool.map((t) => t.type).filter(Boolean) as string[]))], [pool]);
  const cats = useMemo(() => ["all", ...Array.from(new Set(pool.map(categoryOf)))], [pool]);

  const rows = pool.filter(
    (t) =>
      (type === "all" || t.type === type) &&
      (cat === "all" || categoryOf(t) === cat) &&
      (q === "" || t.cssVar.toLowerCase().includes(q.toLowerCase()) || (t.reference ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const t of rows) {
      const k = categoryOf(t);
      (m.get(k) ?? m.set(k, []).get(k)!).push(t);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontFamily: c.mono, padding: "4px 9px", borderRadius: 6, cursor: "pointer",
    border: `1px solid ${active ? "hsl(var(--primary))" : c.border}`,
    color: active ? "hsl(var(--primary-strong))" : c.fg2,
    background: active ? "hsl(var(--primary) / 0.12)" : "transparent",
  });

  return (
    <div style={{ padding: 24, fontFamily: "Instrument Sans, system-ui, sans-serif", background: "hsl(var(--background))", minHeight: "100vh" }}>
      <h1 style={{ color: c.fg, fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
      <p style={{ color: c.fg2, fontSize: 13, maxWidth: 640, marginTop: 6, lineHeight: 1.5 }}>{blurb}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "18px 0" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un token…"
          style={{ fontFamily: c.mono, fontSize: 13, padding: "7px 11px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.muted, color: c.fg, minWidth: 220 }} />
        <span style={{ color: c.fg2, fontSize: 12 }}>{rows.length} tokens</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <span style={{ color: c.fg2, fontSize: 11, alignSelf: "center", marginRight: 2 }}>catégorie</span>
        {cats.map((k) => <button key={k} onClick={() => setCat(k)} style={chip(cat === k)}>{k}</button>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        <span style={{ color: c.fg2, fontSize: 11, alignSelf: "center", marginRight: 2 }}>type</span>
        {types.map((k) => <button key={k} onClick={() => setType(k)} style={chip(type === k)}>{k}</button>)}
      </div>

      {groups.map(([g, items]) => (
        <section key={g} style={{ marginBottom: 28 }}>
          <h2 style={{ color: c.fg, fontSize: 14, fontWeight: 600, marginBottom: 10, fontFamily: c.mono }}>
            {g} <span style={{ color: c.fg2, fontWeight: 400 }}>({items.length})</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
            {items.map((t) => <TokenCard key={t.cssVar + t.path.join(".")} t={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta: Meta = { title: "Design System/Tokens", parameters: { layout: "fullscreen" } };
export default meta;
type S = StoryObj;

export const Foundations: S = {
  render: () => <Explorer layer="primitive" title="Foundations — Primitives"
    blurb="Les valeurs de base, sans intention métier : échelles de couleur, d'espacement, de taille, rayons, bordures, typographie, ombres, opacités, motion, z-index. Tout le reste alias vers ici." />,
};

export const Semantic: S = {
  render: () => <Explorer layer="semantic" title="Semantic — Intentions"
    blurb="Ce que veut dire une valeur dans le produit (background, text, border, action + états, spacing, sizing, radius, elevation, motion, typography). Ne porte aucune valeur brute : pointe vers les primitives." />,
};

export const Components: S = {
  render: () => <Explorer layer="component" title="Components — par composant"
    blurb="Tokens de composants (button, sidebar, input, card, dialog, badge, tooltip, switch, tabs, checkbox) + le pont de compat shadcn. Chaque valeur pointe vers un token sémantique — jamais de valeur brute." />,
};

export const All: S = {
  render: () => <Explorer layer="all" title="Design Tokens — tout"
    blurb="Les trois couches réunies. Filtre par catégorie ou par type, ou cherche un token par nom / alias." />,
};
