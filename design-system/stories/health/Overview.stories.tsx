import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/**
 * Health / Overview — le COCKPIT de gouvernance du Design System, pensé comme une
 * CARTE DE MATURITÉ. Il ne montre pas seulement ce qui est mesuré : il montre
 * l'état COMPLET du système. Chaque domaine qu'un DS mature possède existe ici,
 * quel que soit son avancement, avec l'un de 4 états (measured / documented /
 * planned / missing). Aucun score inventé ; aucun domaine masqué.
 *
 * Il ne calcule rien — il lit `health-summary.json` produit par le moteur
 * `design-system/health/`. Un futur provider (Docs Coverage, Visual Regression…)
 * fera juste passer un domaine de missing/planned → measured, sans toucher cette page.
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

// ── Les 4 états de maturité — chacun distinct (couleur + glyphe, jamais couleur seule) ──
type MState = "measured" | "documented" | "planned" | "missing";
const STATE: Record<MState, { glyph: string; label: string; cls: string; hint: string }> = {
  measured: { glyph: "●", label: "Measured", cls: "border-success/30 bg-success/10 text-success", hint: "vraie métrique" },
  documented: { glyph: "◆", label: "Documented", cls: "border-border bg-muted text-foreground", hint: "existe, non mesuré" },
  planned: { glyph: "◷", label: "Planned", cls: "border-warning/30 bg-warning/10 text-warning", hint: "évolution assumée" },
  missing: { glyph: "○", label: "Missing", cls: "border-destructive/30 bg-destructive/5 text-destructive", hint: "attendu vu notre niveau, absent" },
};
function StateChip({ state, children }: { state: MState; children?: ReactNode }) {
  const s = STATE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      <span aria-hidden>{s.glyph}</span>
      {children ?? s.label}
    </span>
  );
}

// Statut global (fraîcheur, score) — glyphe + libellé + variant.
type Tone = "good" | "warn" | "bad";
const TONE: Record<Tone, { variant: any; glyph: string }> = {
  good: { variant: "success", glyph: "●" },
  warn: { variant: "warning", glyph: "▲" },
  bad: { variant: "destructive", glyph: "■" },
};
function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (<Badge variant={t.variant}><span aria-hidden className="mr-1">{t.glyph}</span>{children}</Badge>);
}

function Overview() {
  if (!summary || summary.reportVersion !== CONTRACT_VERSION || !summary.overall || !summary.maturity) {
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
  const m = summary.maturity;
  const ageDays = (Date.now() - new Date(summary.generatedAt).getTime()) / 86_400_000;
  const fresh = ageDays <= STALE_DAYS;
  const overallTone: Tone = o.score >= 0.8 ? "good" : o.score >= 0.6 ? "warn" : "bad";
  const deltaStr = o.delta == null ? null : `${o.delta >= 0 ? "▲" : "▼"} ${Math.abs(o.delta * 100).toFixed(1)} pts`;
  const totalDomains = m.counts.measured + m.counts.documented + m.counts.planned + m.counts.missing;
  const COUNT_ORDER: MState[] = ["measured", "documented", "planned", "missing"];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      {/* En-tête */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Design System Health</h1>
          <p className="text-sm text-muted-foreground">
            Cockpit de gouvernance · carte de maturité · source <code>design-system/health/</code> · contrat v{summary.reportVersion}
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
            seules les dimensions <strong>measured</strong> entrent dans le calcul. Un domaine peut exister sans score.
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

      {/* ── Carte de maturité : l'état COMPLET du système ── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-medium">Carte de maturité</h2>
            <p className="text-sm text-muted-foreground">
              L'état complet du Design System — {totalDomains} domaines. Aucun n'est masqué faute de métrique.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {COUNT_ORDER.map((k) => (
              <StateChip key={k} state={k}>{m.counts[k]} {STATE[k].label}</StateChip>
            ))}
          </div>
        </div>

        {/* Légende : la nuance missing vs planned, explicite */}
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          {COUNT_ORDER.map((k) => (
            <div key={k} className="flex items-start gap-2">
              <StateChip state={k} />
              <span>
                {k === "missing"
                  ? "Attendu vu notre niveau (outil déjà en place) mais absent."
                  : k === "planned"
                  ? "Évolution volontaire, hors périmètre actuel."
                  : k === "documented"
                  ? "Le domaine existe (page/process) mais n'est pas mesuré."
                  : "On dispose d'une vraie métrique."}
              </span>
            </div>
          ))}
        </div>

        {/* Les domaines, groupés par aire */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {m.areas.map((a: any) => (
            <Card key={a.area}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{a.area}</CardTitle>
                {a.note && <CardDescription>{a.note}</CardDescription>}
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {a.domains.map((d: any) => (
                  <div key={d.key} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{d.label}</span>
                      <span className="text-xs text-muted-foreground">{d.note}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-self-end">
                      {d.measure && <span className="text-sm tabular-nums text-muted-foreground">{d.measure}</span>}
                      <StateChip state={d.status} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Spacing : la seule dimension mesurée finement → sous-page dédiée ── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">Spacing — dette & adoption</h2>
          <span className="text-sm text-muted-foreground">Rapport détaillé → <strong className="text-foreground">Health / Spacing</strong></span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="flex flex-col gap-1 p-4"><span className="text-xs text-muted-foreground">Scale adoption</span><span className="text-xl font-semibold tabular-nums">{pct(summary.adoption.scaleAdoption)}</span></CardContent></Card>
          <Card><CardContent className="flex flex-col gap-1 p-4"><span className="text-xs text-muted-foreground">Violations</span><span className="text-xl font-semibold tabular-nums">{summary.debt.violations}<span className="ml-1 text-xs font-normal text-muted-foreground">/ base {summary.debt.baseline}</span></span></CardContent></Card>
          <Card><CardContent className="flex flex-col gap-1 p-4"><span className="text-xs text-muted-foreground">Cœur DS (bloquant)</span><span className="text-xl font-semibold tabular-nums text-destructive">{summary.debt.violationsCore} <span className="text-xs font-normal">ERROR</span></span></CardContent></Card>
          <Card><CardContent className="flex flex-col gap-1 p-4"><span className="text-xs text-muted-foreground">Exceptions</span><span className="text-xl font-semibold tabular-nums">{summary.debt.exceptions}</span></CardContent></Card>
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
    layout: "fullscreen",
    controls: { disable: true },
    docs: { description: { component: "Cockpit de gouvernance du Design System, pensé comme une carte de maturité. Chaque domaine d'un DS mature y figure avec l'un de 4 états (measured/documented/planned/missing). Alimenté uniquement par les rapports réels du moteur Health." } },
  },
};
export default meta;
export const Dashboard: StoryObj<typeof Overview> = {};
