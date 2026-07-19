/* Sections riches pour la page Introduction (rendue en STORY CSF, pas MDX, pour
   éviter que la typographie docs de Storybook n'écrase les couleurs). */
import type { ReactNode } from "react";

// KPIs du hero lus depuis l'inventaire RÉEL (aucun hardcode).
const reports = import.meta.glob("/reports/design-system/health-summary.json", {
  eager: true, import: "default",
}) as Record<string, any>;
const inv = ((Object.values(reports)[0] as any)?.inventory ?? {}) as {
  foundations?: number; components?: number; tokens?: number; qualityGates?: string;
};

function KpiCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-6">
      <span className="text-3xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function Hero() {
  const kpis = [
    { value: inv.foundations != null ? String(inv.foundations) : "—", label: "Foundations" },
    { value: inv.components != null ? String(inv.components) : "—", label: "Components UI" },
    { value: inv.tokens != null ? String(inv.tokens) : "—", label: "Design Tokens" },
    { value: inv.qualityGates ?? "—", label: "Quality Gates" },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-12 md:p-16">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <span className="w-fit rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
          Design System · v1
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          Streamnco Design System
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          La source unique de vérité — tokens, composants, patterns — gouvernée par l'audit,
          l'accessibilité bloquante et un tableau de bord de qualité en continu. Cette page est la
          porte d'entrée : ce qu'est le système, comment il est structuré, et où aller.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((k) => <KpiCard key={k.label} value={k.value} label={k.label} />)}
        </div>
      </div>
    </div>
  );
}

// Grandes entrées cliquables — la landing est une porte, pas une page de métriques.
// Templates figure ici (comme dans l'Architecture) même s'il est encore « à venir ».
export function NavGrid() {
  const entries: { t: string; d: string; to?: string; soon?: boolean }[] = [
    { t: "Foundations", d: "Couleurs, typo, spacing, radius, motion…", to: "foundations-colors--overview" },
    { t: "Components", d: "Composants React réutilisables, par usage", to: "components-actions-button--docs" },
    { t: "Patterns", d: "Assemblages : FilterBar, PageHeader, Sidebar…", to: "patterns-filterbar--docs" },
    { t: "Templates", d: "Pages complètes", soon: true },
    { t: "Governance", d: "Contribution, a11y, spacing, CI, Chromatic", to: "getting-started-governance--docs" },
    { t: "Health", d: "La maturité du DS en temps réel", to: "health-overview--dashboard" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {entries.map((e) => {
        const inner = (
          <>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">{e.t}</span>
              {e.soon && <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">à venir</span>}
            </div>
            <span className="text-sm text-muted-foreground">{e.d}</span>
          </>
        );
        return e.to ? (
          <a key={e.t} href={`?path=/story/${e.to}`} target="_top"
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
            {inner}
          </a>
        ) : (
          <div key={e.t} className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-card/60 p-6">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-primary">{eyebrow}</span>
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
    { t: "Foundations", d: "Colors, Typography, Spacing, Radius, Motion, Icons, Grid, Tokens…" },
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
    { t: "Architecture", d: "Schémas : tokens, pipeline, contribution, gouvernance" },
    { t: "Nomenclature", d: "Le vocabulaire et l'arborescence" },
    { t: "Contribution", d: "Comment ajouter un composant / une PR" },
    { t: "Governance", d: "a11y, spacing baseline, CI, Chromatic" },
    { t: "Foundations · Colors", d: "Les tokens de couleur sémantiques" },
    { t: "Health Dashboard", d: "La qualité du DS en temps réel" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <div key={l.t} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
          <span className="text-base font-semibold text-foreground">{l.t}</span>
          <span className="text-sm text-muted-foreground">{l.d}</span>
        </div>
      ))}
    </div>
  );
}
