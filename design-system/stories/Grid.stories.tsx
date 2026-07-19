import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Grid & Layout — le système de mise en page du produit.
 *
 * Streamnco s'appuie sur la grille utilitaire de Tailwind (CSS Grid/Flexbox) et
 * l'échelle d'espacement des tokens (`--space-*`). Pas de composant `<Grid>`
 * maison : ce serait redoubler Tailwind. Cette page documente les règles à
 * suivre — colonnes, gouttières, breakpoints, rythme d'espacement.
 */

const c = {
  fg: "hsl(var(--foreground))",
  fg2: "hsl(var(--muted-foreground))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted))",
  mono: "'JetBrains Mono', monospace",
};

const SPACE: [string, string][] = [
  ["--space-1", "0.25rem"], ["--space-2", "0.5rem"], ["--space-3", "0.75rem"],
  ["--space-4", "1rem"], ["--space-5", "1.25rem"], ["--space-6", "1.5rem"],
  ["--space-8", "2rem"], ["--space-10", "2.5rem"], ["--space-12", "3rem"],
  ["--space-16", "4rem"], ["--space-20", "5rem"], ["--space-24", "6rem"],
];

const BREAKPOINTS: [string, string, string][] = [
  ["sm", "640px", "1 → 2 colonnes"],
  ["md", "768px", "2 → 3 colonnes"],
  ["lg", "1024px", "sidebar + contenu, 3 → 4 colonnes"],
  ["xl", "1280px", "conteneur max (max-w-7xl)"],
];

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ color: c.fg, fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>{title}</h2>
      <p style={{ color: c.fg2, fontSize: 13, margin: "0 0 16px", maxWidth: 620, lineHeight: 1.5 }}>{desc}</p>
      {children}
    </section>
  );
}

function Page() {
  return (
    <div style={{ padding: 24, fontFamily: "Instrument Sans, system-ui, sans-serif", background: "hsl(var(--background))", minHeight: "100vh" }}>
      <h1 style={{ color: c.fg, fontSize: 22, fontWeight: 700, margin: 0 }}>Grid &amp; Layout</h1>
      <p style={{ color: c.fg2, fontSize: 13, maxWidth: 620, margin: "6px 0 32px", lineHeight: 1.5 }}>
        Colonnes, gouttières et rythme d'espacement. Base : CSS Grid (Tailwind) + l'échelle
        de tokens <code style={{ fontFamily: c.mono }}>--space-*</code>. Une seule échelle pour marges, paddings et gaps.
      </p>

      <Section title="Échelle d'espacement" desc="Base 4px. Marges, paddings et gaps se prennent TOUS dans cette échelle — pas de valeurs arbitraires.">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SPACE.map(([name, val]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <code style={{ fontFamily: c.mono, fontSize: 12, color: c.fg2, width: 96 }}>{name}</code>
              <div style={{ height: 14, width: `var(${name})`, background: c.primary, borderRadius: 3 }} />
              <span style={{ fontFamily: c.mono, fontSize: 11, color: c.fg2 }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Grille responsive 12 colonnes" desc="La grille de référence. Sur mobile tout s'empile ; les colonnes réapparaissent aux breakpoints. Gouttière = --space-4 (1rem).">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "var(--space-4)" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ background: "hsl(var(--primary) / 0.15)", border: `1px solid hsl(var(--primary) / 0.4)`, borderRadius: 4, height: 48, display: "grid", placeItems: "center", color: "hsl(var(--primary-strong))", fontFamily: c.mono, fontSize: 11 }}>{i + 1}</div>
          ))}
        </div>
      </Section>

      <Section title="Compositions courantes" desc="Les découpages qu'on réutilise : pleine largeur, deux tiers / un tiers (contenu + aside), et cartes en grille auto-fit.">
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-4)" }}>
            <div style={{ ...cell(), height: 72 }}>contenu · 2fr</div>
            <div style={{ ...cell(), height: 72 }}>aside · 1fr</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
            {["Carte", "Carte", "Carte", "Carte"].map((t, i) => (
              <div key={i} style={{ ...cell(), height: 64 }}>{t} · auto-fit</div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Breakpoints" desc="Les seuils Tailwind utilisés dans le produit. Mobile-first : on conçoit l'empilement d'abord, puis on ajoute les colonnes.">
        <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden" }}>
          {BREAKPOINTS.map(([k, px, use], i) => (
            <div key={k} style={{ display: "flex", gap: 16, padding: "10px 14px", background: c.card, borderTop: i ? `1px solid ${c.border}` : "none" }}>
              <code style={{ fontFamily: c.mono, fontSize: 12, color: "hsl(var(--primary-strong))", width: 40 }}>{k}</code>
              <code style={{ fontFamily: c.mono, fontSize: 12, color: c.fg2, width: 72 }}>≥ {px}</code>
              <span style={{ fontSize: 13, color: c.fg }}>{use}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function cell(): React.CSSProperties {
  return { background: c.muted, border: `1px solid ${c.border}`, borderRadius: 6, display: "grid", placeItems: "center", color: c.fg2, fontFamily: c.mono, fontSize: 11 };
}

const meta: Meta = {
  title: "Foundations/Grid",
  parameters: { controls: { disable: true },
    layout: "fullscreen",
    docs: { description: { component: "Système de mise en page : échelle d'espacement (tokens --space-*), grille responsive 12 colonnes, compositions courantes et breakpoints. Base CSS Grid + Tailwind." } },
  },
};
export default meta;
type S = StoryObj;

export const Overview: S = { render: () => <Page /> };
