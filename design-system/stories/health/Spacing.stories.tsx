import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

/**
 * Health / Spacing — rapport DÉTAILLÉ de la dimension spacing (sous-page du
 * cockpit Health/Overview). Lit `spacing-health.summary.json` produit par le
 * moteur. Aucun calcul ici. La vue synthétique vit dans Health/Overview ; ici
 * on plonge dans la distribution, les violations et les fichiers touchés.
 */

const reports = import.meta.glob(
  "/reports/design-system/{spacing-health.summary,accessibility-health}.json",
  { eager: true, import: "default" },
) as Record<string, any>;
const byName = (n: string) => {
  const k = Object.keys(reports).find((p) => p.endsWith("/" + n));
  return k ? reports[k] : null;
};

const CONTRACT_VERSION = 1;
const STALE_DAYS = 14;
const pct = (n: number | null | undefined) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
const fmtDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

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
function ScoreCard({ label, value, caption, tone, bar }: { label: string; value: string; caption: string; tone: Tone; bar?: number | null }) {
  return (
    <Card className="min-w-56 flex-1">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {bar != null && <Progress value={bar * 100} aria-label={`${label} ${value}`} />}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{caption}</span>
          <StatusBadge tone={tone}>{tone === "good" ? "OK" : tone === "warn" ? "À améliorer" : tone === "bad" ? "Critique" : "—"}</StatusBadge>
        </div>
      </CardContent>
    </Card>
  );
}

function SpacingReport() {
  const spacing = byName("spacing-health.summary.json");
  if (!spacing || spacing.reportVersion !== CONTRACT_VERSION || !spacing.scores) {
    return (
      <div className="p-8 max-w-2xl">
        <Alert>
          <AlertTitle>▲ Rapport indisponible</AlertTitle>
          <AlertDescription>
            Aucun rapport spacing exploitable. Lance <code>npm run audit:spacing</code> puis rebuild Storybook.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const s = spacing.scores, c = spacing.confidence, t = spacing.totals, scope = spacing.scope;
  const ageDays = (Date.now() - new Date(spacing.generatedAt).getTime()) / 86_400_000;
  const fresh = ageDays <= STALE_DAYS;
  const compact = spacing.compactBreakdown ?? { total: 0, byValue: {} };
  const c12 = compact.byValue?.["12px"] ?? 0;
  const c20 = compact.byValue?.["20px"] ?? 0;
  const c4 = compact.byValue?.["4px"] ?? 0;
  const tot = Math.max(t.classifiable, 1);
  const dist = [
    { key: "preferred", label: "Preferred", n: t.preferred, tone: "good" as Tone },
    { key: "compact", label: "Compact-allowed", n: t.compactAllowed, tone: "warn" as Tone },
    { key: "violation", label: "Violation", n: t.violations, tone: "bad" as Tone },
    { key: "exception", label: "Exception", n: t.exceptions, tone: "neutral" as Tone },
  ];
  const DIST_BG: Record<Tone, string> = { good: "bg-success", warn: "bg-warning", bad: "bg-destructive", neutral: "bg-muted-foreground" };
  const healthTone: Tone = s.health >= 0.9 ? "good" : s.health >= 0.7 ? "warn" : "bad";
  const valueTone: Tone = s.valueCompliance >= 0.9 ? "good" : s.valueCompliance >= 0.7 ? "warn" : "bad";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Spacing Health</h1>
          <p className="text-sm text-muted-foreground">
            Sous-page de <strong className="text-foreground">Health / Overview</strong> · moteur <code>design-system/health/</code> · contrat v{spacing.reportVersion} · lecture seule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Dernier audit : {fmtDate(spacing.generatedAt)}</span>
          <StatusBadge tone={fresh ? "good" : "warn"}>{fresh ? "À jour" : `Obsolète (${Math.floor(ageDays)} j)`}</StatusBadge>
        </div>
      </header>

      {!fresh && (
        <Alert variant="destructive">
          <AlertTitle>▲ Rapport obsolète</AlertTitle>
          <AlertDescription>Le dernier audit date de plus de {STALE_DAYS} jours. Relance <code>npm run audit:spacing</code>.</AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Scores</h2>
        <div className="flex flex-wrap gap-4">
          <ScoreCard label="Spacing Health" value={pct(s.health)} caption="0.7·value + 0.3·scale adoption" tone={healthTone} bar={s.health} />
          <ScoreCard label="Value compliance" value={pct(s.valueCompliance)} caption="respect de la grille 8/4" tone={valueTone} bar={s.valueCompliance} />
          <ScoreCard label="Scale adoption" value={pct(s.scaleAdoption)} caption="via l'échelle (≠ tokens var(--space-*))" tone={s.scaleAdoption >= 0.9 ? "good" : "warn"} bar={s.scaleAdoption} />
          <ScoreCard label="Confidence" value={pct(c.value)} caption="fiabilité du score" tone={c.value >= 0.85 ? "good" : "warn"} bar={c.value} />
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>Détectés : <strong className="text-foreground tabular-nums">{t.detected}</strong></span>
          <span>Preferred : <strong className="text-foreground tabular-nums">{t.preferred}</strong></span>
          <span>Compact-allowed : <strong className="text-foreground tabular-nums">{t.compactAllowed}</strong></span>
          <span>Violations : <strong className="text-foreground tabular-nums">{t.violations}</strong></span>
          <span>Exceptions : <strong className="text-foreground tabular-nums">{t.exceptions}</strong></span>
          <span>Needs-decision : <strong className="text-foreground tabular-nums">{t.needsDecision}</strong></span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label={`Distribution : ${dist.map((d) => `${d.label} ${d.n}`).join(", ")}`}>
            {dist.filter((d) => d.n > 0).map((d) => (
              <div key={d.key} className={DIST_BG[d.tone]} style={{ width: `${(d.n / tot) * 100}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {dist.map((d) => (
              <span key={d.key} className="flex items-center gap-1">
                <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${DIST_BG[d.tone]}`} />
                {d.label} : <strong className="text-foreground tabular-nums">{d.n}</strong> ({((d.n / tot) * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Détail</h2>
        <div className="flex flex-wrap gap-4">
          <Card className="min-w-64 flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Violations par piste</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Cœur DS <span className="text-muted-foreground">(bloquant à terme)</span></span>
                <StatusBadge tone={t.violationsByTrack.error === 0 ? "good" : "bad"}>{t.violationsByTrack.error} ERROR</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span>App <span className="text-muted-foreground">(migration)</span></span>
                <StatusBadge tone="warn">{t.violationsByTrack.warn} WARN</StatusBadge>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-64 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sous-grille compacte</CardTitle>
              <CardDescription>Conforme, mais <strong>secondaire</strong> — préférer l'échelle principale.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between"><span>Total compact-allowed</span><StatusBadge tone="warn">{compact.total} usages</StatusBadge></div>
              <div className="flex items-center justify-between text-muted-foreground"><span><code>4px</code> · micro</span><span className="tabular-nums">{c4}</span></div>
              <div className="flex items-center justify-between text-muted-foreground"><span><code>12px</code></span><span className="tabular-nums">{c12}</span></div>
              <div className="flex items-center justify-between text-muted-foreground"><span><code>20px</code> · secondaire</span><span className="tabular-nums">{c20}</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4">
          <Card className="min-w-72 flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Top valeurs hors-échelle (violations)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Valeur</TableHead><TableHead className="text-right">Occurrences</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(spacing.topValues ?? []).slice(0, 8).map((v: any) => (
                    <TableRow key={v.value}><TableCell><code>{v.value}</code></TableCell><TableCell className="text-right tabular-nums">{v.count}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="min-w-72 flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Fichiers les plus touchés</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Fichier</TableHead><TableHead className="text-right">Viol.</TableHead><TableHead className="text-right">Compact</TableHead><TableHead>Piste</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(spacing.topOffenders ?? []).slice(0, 8).map((o: any) => (
                    <TableRow key={o.file}>
                      <TableCell className="max-w-72 truncate font-mono text-xs">{o.file}</TableCell>
                      <TableCell className="text-right tabular-nums">{o.violations}</TableCell>
                      <TableCell className="text-right tabular-nums">{o.compactAllowed}</TableCell>
                      <TableCell><StatusBadge tone={o.track === "error" ? "bad" : "neutral"}>{o.track}</StatusBadge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Périmètre scanné</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>Fichiers : <strong className="text-foreground">{scope.filesScanned}</strong></span>
            <span>Cœur (ERROR) : <strong className="text-foreground">{scope.errorTrackFiles}</strong></span>
            <span>App (WARN) : <strong className="text-foreground">{scope.warnTrackFiles}</strong></span>
            <span>Erreurs parsing : <strong className="text-foreground">{scope.parseErrors}</strong></span>
            <span className="basis-full text-xs">{c.note}</span>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const meta: Meta<typeof SpacingReport> = {
  title: "Health/Spacing",
  component: SpacingReport,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: { description: { component: "Rapport détaillé de la dimension spacing — sous-page du cockpit Health/Overview. Alimenté par le moteur Health (npm run audit:spacing)." } },
  },
};
export default meta;
export const Report: StoryObj<typeof SpacingReport> = {};
