/* Sections riches pour la page Introduction — rendus premium natifs. */
import type { ReactNode } from "react";

export function Hero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_55%)] bg-card p-16">
      <div className="flex flex-col gap-6">
        <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary-strong">
          Design System · v1
        </span>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-foreground">
          Le Design System de <span className="text-primary">Streamnco</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Une source de vérité unique — tokens, composants, patterns — gouvernée par l'audit,
          l'accessibilité bloquante, la régression visuelle et un tableau de bord de qualité en temps réel.
        </p>
        <div className="mt-2 flex flex-wrap gap-8">
          <Kpi value="84 %" label="Spacing Health" />
          <Kpi value="PASS" label="Accessibilité (CI)" />
          <Kpi value="28" label="Composants" />
          <Kpi value="3 couches" label="Architecture tokens" />
        </div>
      </div>
    </div>
  );
}

export function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-3xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-primary-strong">{eyebrow}</span>
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {children && <p className="max-w-2xl text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

export function Principles() {
  const items = [
    { t: "Dark par défaut", d: "L'app est sombre ; .light est un override. Le lime est la marque, le teal un tint secondaire." },
    { t: "Tokens, pas de valeurs en dur", d: "Un composant consomme un token sémantique. Garde-fou lint:tokens sur le cœur ui/." },
    { t: "Accessibilité bloquante", d: "axe en mode error dans la CI. Une violation fait échouer le build." },
    { t: "Spacing 8/4 gouverné", d: "Échelle preferred + compact-allowed, auditée automatiquement, avec baseline anti-régression." },
    { t: "Sobriété", d: "Les bordures chuchotent, l'élévation est discrète, la couleur a une intention." },
    { t: "Mesuré, pas déclaré", d: "Chaque score vient d'un audit réel du code, jamais d'une valeur saisie à la main." },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <div key={i.t} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold text-foreground">{i.t}</h3>
          <p className="text-sm text-muted-foreground">{i.d}</p>
        </div>
      ))}
    </div>
  );
}

export function Layers() {
  const layers = [
    { t: "Foundations", d: "Colors, Typography, Spacing, Radius, Motion, Icons, Grid, Tokens" },
    { t: "Components", d: "Actions, Forms, Feedback, Overlays, Navigation, Content & Structure" },
    { t: "Patterns", d: "Assemblages réutilisables : FilterBar, PageHeader, Sidebar…" },
    { t: "Templates", d: "Pages complètes (à venir)" },
    { t: "Catalogue", d: "Composants feature spécifiques au produit" },
  ];
  return (
    <div className="flex flex-col gap-3">
      {layers.map((l, idx) => (
        <div key={l.t} className="flex items-center gap-6 rounded-xl border border-border bg-card p-6">
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">{l.t}</span>
            <span className="text-sm text-muted-foreground">{l.d}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LinkGrid() {
  const links = [
    { t: "Architecture", d: "Schémas : tokens, pipeline, contribution, gouvernance", path: "getting-started-architecture--docs" },
    { t: "Nomenclature", d: "Le vocabulaire et l'arborescence", path: "getting-started-nomenclature--docs" },
    { t: "Contribution", d: "Comment ajouter un composant / une PR", path: "getting-started-contribution--docs" },
    { t: "Governance", d: "a11y, spacing baseline, CI, Chromatic", path: "getting-started-governance--docs" },
    { t: "Foundations · Colors", d: "Les tokens de couleur sémantiques", path: "foundations-colors--overview" },
    { t: "Health Dashboard", d: "La qualité du DS en temps réel", path: "health--overview" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <a
          key={l.t}
          href={`?path=/${l.path.includes("--docs") ? "docs" : "story"}/${l.path}`}
          className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <span className="text-base font-semibold text-foreground group-hover:text-primary-strong">{l.t} →</span>
          <span className="text-sm text-muted-foreground">{l.d}</span>
        </a>
      ))}
    </div>
  );
}
