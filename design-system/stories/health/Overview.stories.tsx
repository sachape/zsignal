import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/**
 * Health / Overview — le COCKPIT de gouvernance du Design System. Vue exécutive :
 * en quelques secondes, l'état global et ce qui demande de l'attention. Il ne
 * calcule rien — il lit `health-summary.json` produit par le moteur
 * `design-system/health/` (npm run audit:spacing). Ajouter un domaine = ajouter
 * un provider + un bloc dans le rapport + une carte ici. L'architecture ne bouge pas.
 *
 * Principe : toutes les cartes ne sont pas des scores. Une carte peut porter un
 * score, un ÉTAT (PASS / Baseline à établir), un compteur ou une progression.
 */

const reports = import.meta.glob("/reports/design-system/health-summary.json", {
  eager: true,
  import: "default",
}) as Record<string, any>;
const summary = Object.values(reports)[0] as any;

const CONTRACT_VERSION = 1;
const STALE_DAYS = 14;
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const fmtDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

// Statut jamais porté par la seule couleur : glyphe + libellé + variant.
type Tone = "good" | "warn" | "bad" | "neutral";
const TONE: Record<Tone, { variant: any; glyph: string }> = {
  good: { variant: "success", glyph: "●" },
  warn: { variant: "warning", glyph: "▲" },
  bad: { variant: "destructive", glyph: "■" },
  neutral: { variant: "secondary", glyph: "○" },
};
function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <Badge variant={t.variant}>
      <span aria-hidden className="mr-1">{t.glyph}</span>
      {children}
    </Badge>
  );
}

function Block({ title, desc, children, aside }: { title: string; desc?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-medium">{title}</h2>
          {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

// ── États de qualité : chaque garde-fou est un ÉTAT, pas un score ────────────
const QUALITY_STATE: Record<string, { tone: Tone; label: string }> = {
  pass: { tone: "good", label: "PASS" },
  enforced: { tone: "good", label: "Gate CI" },
  active: { tone: "good", label: "Actif" },
  pending: { tone: "warn", label: "En attente" },
  todo: { tone: "neutral", label: "Non mesuré" },
  off: { tone: "bad", label: "OFF" },
};

function Overview() {
  if (!summary || summary.reportVersion !== CONTRACT_VERSION || !summary.overall) {
    return (
      <div className="p-8 max-w-2xl">
        <Alert>
          <AlertTitle>▲ Rapport indisponible</AlertTitle>
          <AlertDescription>
            Aucun rapport Health exploitable dans <code>reports/design-system/</code>. Lance{" "}
            <code>npm run audit:spacing</code> puis rebuild Storybook.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const o = summary.overall;
  const ageDays = (Date.now() - new Date(summary.generatedAt).getTime()) / 86_400_000;
  const fresh = ageDays <= STALE_DAYS;
  const overallTone: Tone = o.score >= 0.9 ? "good" : o.score >= 0.8 ? "good" : o.score >= 0.6 ? "warn" : "bad";
  const deltaStr = o.delta == null ? null : `${o.delta >= 0 ? "▲" : "▼"} ${Math.abs(o.delta * 100).toFixed(1)} pts`;

  const comp = summary.components;
  const tok = summary.tokens;
  const ado = summary.adoption;
  const debt = summary.debt;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      {/* En-tête */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Design System Health</h1>
          <p className="text-sm text-muted-foreground">
            Cockpit de gouvernance · source <code>design-system/health/</code> · contrat v{summary.reportVersion} · lecture seule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Dernier audit : {fmtDate(summary.generatedAt)}</span>
          <StatusBadge tone={fresh ? "good" : "warn"}>{fresh ? "À jour" : `Obsolète (${Math.floor(ageDays)} j)`}</StatusBadge>
        </div>
      </header>

      {/* ── Overall Health : le score montre sa propre arithmétique ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Overall Health</CardDescription>
          <div className="flex flex-wrap items-baseline gap-3">
            <CardTitle className="text-5xl tabular-nums">{pct(o.score)}</CardTitle>
            <StatusBadge tone={overallTone}>{o.label}</StatusBadge>
            {deltaStr ? (
              <span className={`text-sm tabular-nums ${o.delta >= 0 ? "text-success" : "text-destructive"}`}>{deltaStr}</span>
            ) : (
              <span className="text-sm text-muted-foreground">nouvelle mesure</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Calculé à partir de : {o.calculatedFrom.join(", ")}. <span className="text-foreground">Score pondéré, pas une moyenne</span> —
            toutes les dimensions n'ont pas la même criticité. Seules les dimensions mesurées entrent dans le calcul.
          </p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {o.dimensions.map((d: any) => (
              <div key={d.key} className="grid grid-cols-1 gap-2 p-4 md:grid-cols-[220px_1fr_auto] md:items-center">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{d.label}</span>
                    <Badge variant={d.tier === "critique" ? "destructive" : "secondary"}>{d.tier}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">poids {Math.round(d.weight * 100)}% · {d.why}</span>
                </div>
                <Progress value={d.value * 100} aria-label={`${d.label} ${pct(d.value)}`} />
                <span className="text-right text-sm tabular-nums text-muted-foreground md:w-40">
                  {pct(d.value)} × {d.weight} = <strong className="text-foreground">{(d.weight * d.value * 100).toFixed(0)} pts</strong>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{o.note}</p>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Foundations : grille d'états, pas un score unique ── */}
      <Block title="Foundations" desc={summary.foundations.note}>
        <div className="flex flex-wrap gap-2">
          {summary.foundations.items.map((f: any) => (
            <StatusBadge key={f.name} tone={f.state === "measured" ? "good" : "neutral"}>
              {f.name} — {f.state === "measured" ? f.value : "Documented"}
            </StatusBadge>
          ))}
        </div>
      </Block>

      {/* ── Components + Tokens ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Components</CardTitle>
            <CardDescription>Couverture story des composants <code>ui/</code></CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{comp.withStory}</span>
              <span className="text-muted-foreground">/ {comp.total} avec story</span>
              <StatusBadge tone={comp.coverage >= 0.9 ? "good" : comp.coverage >= 0.5 ? "warn" : "bad"}>{pct(comp.coverage)}</StatusBadge>
            </div>
            <Progress value={comp.coverage * 100} aria-label={`Couverture story ${pct(comp.coverage)}`} />
            <span className="text-xs text-muted-foreground">Détail à venir : Health / Components</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tokens</CardTitle>
            <CardDescription>Comptage par couche (aucun « token health » inventé)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <span className="text-3xl font-semibold tabular-nums">{tok.total}</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tok.byLayer).map(([layer, n]) => (
                <Badge key={layer} variant="outline" className="tabular-nums">{layer} {n as number}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quality : un état par garde-fou ── */}
      <Block title="Quality" desc="Chaque ligne est un état de gouvernance, pas un score.">
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {summary.quality.map((q: any) => {
              const st = QUALITY_STATE[q.state] ?? QUALITY_STATE.off;
              return (
                <div key={q.name} className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{q.name}</span>
                    <span className="text-xs text-muted-foreground">{q.detail}</span>
                  </div>
                  <StatusBadge tone={st.tone}>{q.label ?? st.label}</StatusBadge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </Block>

      {/* ── Adoption + Debt ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Adoption</CardTitle>
            <CardDescription>Uniquement ce qui est réellement calculé (spacing)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>Scale adoption</span>
              <div className="flex items-center gap-2"><Progress value={ado.scaleAdoption * 100} className="w-28" aria-label="scale adoption" /><StatusBadge tone={ado.scaleAdoption >= 0.9 ? "good" : "warn"}>{pct(ado.scaleAdoption)}</StatusBadge></div>
            </div>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>Sous-grille compacte (part)</span><span className="tabular-nums">{pct(ado.compactShare)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>CSS token <code>var(--space-*)</code></span><span className="tabular-nums">{pct(ado.cssVarAdoption)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Debt</CardTitle>
            <CardDescription>Dette de conformité spacing</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>Violations <span className="text-muted-foreground">(hors-échelle)</span></span>
              <div className="flex items-center gap-2">
                <StatusBadge tone="warn">{debt.violations}</StatusBadge>
                {debt.baseline != null && <span className="text-xs text-muted-foreground tabular-nums">baseline {debt.baseline}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Cœur DS <span className="text-muted-foreground">(bloquant à terme)</span></span>
              <StatusBadge tone={debt.violationsCore === 0 ? "good" : "bad"}>{debt.violationsCore} ERROR</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>Exceptions documentées</span><span className="tabular-nums">{debt.exceptions}</span>
            </div>
            <span className="text-xs text-muted-foreground">Détail complet → <strong className="text-foreground">Health / Spacing</strong></span>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Roadmap : section clairement séparée, jamais « Not measured » ── */}
      <Block title="Roadmap" desc="À venir — n'entre pas dans le score tant que ce n'est pas mesuré.">
        <div className="flex flex-wrap gap-2">
          {summary.roadmap.map((r: any) => (
            <div key={r.name} className="flex flex-col gap-0.5 rounded-lg border border-dashed border-border px-4 py-2">
              <span className="text-sm font-medium text-foreground">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.note}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

const meta: Meta<typeof Overview> = {
  title: "Health/Overview",
  component: Overview,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: { description: { component: "Cockpit de gouvernance du Design System. Vue exécutive alimentée uniquement par les rapports réels du moteur Health. Aucun score inventé : les domaines non mesurés vivent dans la Roadmap." } },
  },
};
export default meta;
export const Dashboard: StoryObj<typeof Overview> = {};
