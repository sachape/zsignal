/* Schémas d'architecture — rendus visuels natifs (boxes + flèches), pas d'image. */
import type { ReactNode } from "react";

function Node({ title, sub, accent }: { title: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className={`flex min-w-32 flex-col items-center gap-1 rounded-lg border px-4 py-4 text-center ${
        accent ? "border-primary/40 bg-primary/10" : "border-border bg-card"
      }`}
    >
      <span className="text-sm font-medium text-foreground">{title}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Arrow({ dir = "right" }: { dir?: "right" | "down" }) {
  return (
    <span aria-hidden className="select-none text-lg text-muted-foreground">
      {dir === "right" ? "→" : "↓"}
    </span>
  );
}

function Flow({ nodes, dir = "right" }: { nodes: { title: string; sub?: string; accent?: boolean }[]; dir?: "right" | "down" }) {
  return (
    <div className={`flex ${dir === "right" ? "flex-row flex-wrap" : "flex-col"} items-center gap-4`}>
      {nodes.map((n, i) => (
        <div key={n.title} className={`flex ${dir === "right" ? "flex-row" : "flex-col"} items-center gap-4`}>
          <Node {...n} />
          {i < nodes.length - 1 && <Arrow dir={dir} />}
        </div>
      ))}
    </div>
  );
}

function Diagram({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-8">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function TokenHierarchy() {
  return (
    <Diagram title="1 · Hiérarchie des tokens">
      <Flow
        dir="down"
        nodes={[
          { title: "Primitive tokens", sub: "valeurs brutes (hsl, rem)" },
          { title: "Semantic tokens", sub: "intentions (--primary, --space-*)" },
          { title: "Component tokens", sub: "par composant" },
          { title: "Components", sub: "React (ui/)", accent: true },
          { title: "Patterns", sub: "assemblages" },
          { title: "Templates", sub: "pages" },
        ]}
      />
    </Diagram>
  );
}

export function Pipeline() {
  return (
    <Diagram title="2 · Pipeline design → code">
      <Flow
        nodes={[
          { title: "Designer" },
          { title: "Figma" },
          { title: "Tokens", sub: "DTCG (JSON)" },
          { title: "Style Dictionary", sub: "build", accent: true },
          { title: "Storybook", sub: "doc + tests" },
          { title: "Application" },
        ]}
      />
    </Diagram>
  );
}

export function ContributionWorkflow() {
  return (
    <Diagram title="3 · Workflow de contribution">
      <Flow
        nodes={[
          { title: "Contributor" },
          { title: "PR", sub: "DS P<phase>" },
          { title: "CI", sub: "typecheck · tests · a11y" },
          { title: "Health", sub: "spacing · audit", accent: true },
          { title: "Chromatic", sub: "régression visuelle" },
          { title: "Merge" },
        ]}
      />
    </Diagram>
  );
}

export function Governance() {
  const pillars = ["CI verte", "a11y bloquante", "Health (audit)", "Baseline spacing", "Chromatic approuvé"];
  return (
    <Diagram title="4 · Gouvernance — portes de qualité">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-stretch justify-center gap-4">
          {pillars.map((p) => (
            <div key={p} className="flex min-w-40 items-center justify-center rounded-lg border border-border bg-card px-4 py-4 text-center text-sm text-foreground">
              {p}
            </div>
          ))}
        </div>
        <Arrow dir="down" />
        <Node title="main" sub="production protégée" accent />
      </div>
    </Diagram>
  );
}
