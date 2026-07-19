import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  summary, CONTRACT_VERSION, pct, fmtDate, STATE, StateChip, XLink, areaCounts, Guard,
  type MState,
} from "./_shared";

/**
 * Health / Overview — SYNTHÈSE du système. Overall Health + répartition de
 * maturité + une carte par domaine renvoyant vers sa sous-page. Le détail de
 * chaque domaine vit désormais dans sa propre page (Health/Foundations, etc.),
 * pas dans une page verticale interminable. Aucun score inventé.
 */

type Tone = "good" | "warn" | "bad";
const TONE: Record<Tone, { variant: any; glyph: string }> = {
  good: { variant: "success", glyph: "●" }, warn: { variant: "warning", glyph: "▲" }, bad: { variant: "destructive", glyph: "■" },
};
function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (<Badge variant={t.variant}><span aria-hidden className="mr-2">{t.glyph}</span>{children}</Badge>);
}

const COUNT_ORDER: MState[] = ["measured", "documented", "planned", "missing"];

function Overview() {
  if (!summary || summary.reportVersion !== CONTRACT_VERSION || !summary.overall || !summary.maturity) return <Guard />;

  const o = summary.overall;
  const m = summary.maturity;
  const ageDays = (Date.now() - new Date(summary.generatedAt).getTime()) / 86_400_000;
  const fresh = ageDays <= 14;
  const overallTone: Tone = o.score >= 0.8 ? "good" : o.score >= 0.6 ? "warn" : "bad";
  const deltaStr = o.delta == null ? null : `${o.delta >= 0 ? "▲" : "▼"} ${Math.abs(o.delta * 100).toFixed(1)} pts`;
  const totalDomains = COUNT_ORDER.reduce((a, k) => a + m.counts[k], 0);

  // Priorités = tout ce qui est "missing" (attendu vu notre niveau, absent).
  const missing: { area: string; label: string }[] = [];
  for (const a of m.areas) for (const d of a.domains) if (d.status === "missing") missing.push({ area: a.area, label: d.label });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Design System Health</h1>
          <p className="text-sm text-muted-foreground">Synthèse & maturité · source <code>design-system/health/</code> · contrat v{summary.reportVersion}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Dernier audit : {fmtDate(summary.generatedAt)}</span>
          <StatusBadge tone={fresh ? "good" : "warn"}>{fresh ? "À jour" : `Obsolète (${Math.floor(ageDays)} j)`}</StatusBadge>
        </div>
      </header>

      {/* Overall Health — montre son arithmétique */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Overall Health</CardDescription>
          <div className="flex flex-wrap items-baseline gap-4">
            <CardTitle className="text-5xl tabular-nums">{pct(o.score)}</CardTitle>
            <StatusBadge tone={overallTone}>{o.label}</StatusBadge>
            {deltaStr ? <span className={`text-sm tabular-nums ${o.delta >= 0 ? "text-success" : "text-destructive"}`}>{deltaStr}</span> : <span className="text-sm text-muted-foreground">nouvelle mesure</span>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Calculé à partir de : {o.calculatedFrom.join(", ")}. <span className="text-foreground">Score pondéré</span> — seules les dimensions <strong>measured</strong> comptent.</p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {o.dimensions.map((d: any) => (
              <div key={d.key} className="grid grid-cols-1 gap-2 p-4 md:grid-cols-[220px_1fr_auto] md:items-center">
                <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground">{d.label}</span><Badge variant={d.tier === "critique" ? "destructive" : "secondary"}>{d.tier}</Badge></div>
                <Progress value={d.value * 100} aria-label={`${d.label} ${pct(d.value)}`} />
                <span className="text-right text-sm tabular-nums text-muted-foreground md:w-40">{pct(d.value)} × {d.weight} = <strong className="text-foreground">{(d.weight * d.value * 100).toFixed(0)} pts</strong></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Répartition de maturité */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Maturité — {totalDomains} domaines, aucun masqué faute de métrique.</p>
        <div className="flex flex-wrap gap-2">{COUNT_ORDER.map((k) => <StateChip key={k} state={k}>{m.counts[k]} {STATE[k].label}</StateChip>)}</div>
      </div>

      {missing.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">À traiter en priorité</CardTitle><CardDescription>« Missing » = attendu vu notre niveau (outil déjà en place), mais absent.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missing.map((x) => <StateChip key={x.label} state="missing">{x.area} · {x.label}</StateChip>)}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Une carte de synthèse par domaine → sa sous-page */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Domaines</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {m.areas.map((a: any) => {
            const c = areaCounts(a);
            const headlineBySlug: Record<string, string | null | undefined> = {
              "health-components": pct(summary.components?.coverage),
              "health-tokens": summary.tokens ? String(summary.tokens.total) : null,
              "health-quality-gates": summary.inventory?.qualityGates,
            };
            const headline = headlineBySlug[a.slug];
            return (
              <Card key={a.slug}>
                <CardHeader className="pb-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <CardTitle className="text-base">{a.area}</CardTitle>
                    {headline && <span className="text-sm font-semibold tabular-nums text-foreground">{headline}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {COUNT_ORDER.filter((k) => c[k] > 0).map((k) => <StateChip key={k} state={k}>{c[k]}</StateChip>)}
                  </div>
                  <XLink to={`${a.slug}--report`}>Voir {a.area} →</XLink>
                </CardContent>
              </Card>
            );
          })}

          {/* Spacing — dimension mesurée finement, sa propre page détaillée */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-baseline justify-between gap-2">
                <CardTitle className="text-base">Spacing</CardTitle>
                <span className="text-sm font-semibold tabular-nums text-foreground">{pct(summary.adoption?.scaleAdoption)}</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Violations <strong className="text-foreground tabular-nums">{summary.debt?.violations}</strong></span>
                <span>Cœur <strong className="text-destructive tabular-nums">{summary.debt?.violationsCore}</strong></span>
                <span>Exceptions <strong className="text-foreground tabular-nums">{summary.debt?.exceptions}</strong></span>
              </div>
              <XLink to="health-spacing--report">Voir Spacing Health →</XLink>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Overview> = {
  title: "Health/Overview",
  component: Overview,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen", controls: { disable: true },
    docs: { description: { component: "Synthèse de la santé et de la maturité du Design System. Une carte par domaine renvoie vers sa sous-page dédiée. Alimenté uniquement par les rapports réels du moteur Health." } },
  },
};
export default meta;
export const Dashboard: StoryObj<typeof Overview> = {};
