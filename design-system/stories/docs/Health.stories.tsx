import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

/**
 * Design System Health — V1. Tableau de bord de la QUALITÉ du Design System.
 * Il ne calcule RIEN : il lit les rapports versionnés produits par le moteur
 * `design-system/health/` (npm run audit:spacing). Ajouter un axe (radius,
 * typo…) = ajouter un rapport conforme au contrat, sans toucher à cette page.
 */

// Rapports réels — glob CIBLÉ (on n'embarque pas le gros spacing-health.json).
const reports = import.meta.glob(
  "/reports/design-system/{health-summary,spacing-health.summary,accessibility-health}.json",
  { eager: true, import: "default" },
) as Record<string, any>;
const byName = (n: string) => {
  const k = Object.keys(reports).find((p) => p.endsWith("/" + n));
  return k ? reports[k] : null;
};

const CONTRACT_VERSION = 1;
const STALE_DAYS = 14;

type State =
  | { kind: "available" | "stale"; spacing: any; a11y: any; ageDays: number }
  | { kind: "absent" }
  | { kind: "invalid"; detail: string }
  | { kind: "error"; detail: string };

function load(): State {
  const summary = byName("health-summary.json");
  const spacing = byName("spacing-health.summary.json");
  const a11y = byName("accessibility-health.json");
  if (!summary || !spacing) return { kind: "absent" };
  try {
    if (spacing.reportVersion !== CONTRACT_VERSION || summary.reportVersion !== CONTRACT_VERSION)
      return { kind: "invalid", detail: `reportVersion attendu ${CONTRACT_VERSION}, reçu ${spacing.reportVersion}` };
    if (!spacing.scores || typeof spacing.scores.health !== "number" || !spacing.totals)
      return { kind: "invalid", detail: "champs scores/totals manquants (contrat non respecté)" };
    const ageDays = (Date.now() - new Date(spacing.generatedAt).getTime()) / 86_400_000;
    return { kind: ageDays > STALE_DAYS ? "stale" : "available", spacing, a11y, ageDays };
  } catch (e) {
    return { kind: "error", detail: String(e) };
  }
}

const pct = (n: number | null | undefined) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
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

function Dashboard() {
  const state = load();

  if (state.kind === "absent")
    return (
      <div className="p-8 max-w-2xl">
        <Alert>
          <AlertTitle>▲ Rapport indisponible</AlertTitle>
          <AlertDescription>
            Aucun rapport Health trouvé dans <code>reports/design-system/</code>. Lance <code>npm run audit:spacing</code> pour le générer, puis rebuild Storybook.
          </AlertDescription>
        </Alert>
      </div>
    );
  if (state.kind === "invalid" || state.kind === "error")
    return (
      <div className="p-8 max-w-2xl">
        <Alert variant="destructive">
          <AlertTitle>■ Rapport illisible</AlertTitle>
          <AlertDescription>
            {state.kind === "invalid" ? `Contrat non respecté : ${state.detail}` : `Erreur de chargement : ${state.detail}`}
          </AlertDescription>
        </Alert>
      </div>
    );

  const { spacing, a11y, ageDays } = state;
  const s = spacing.scores, c = spacing.confidence, t = spacing.totals, scope = spacing.scope;
  const fresh = state.kind === "available";
  const compact = spacing.compactBreakdown ?? { total: 0, byValue: {} };
  const c12 = compact.byValue?.["12px"] ?? 0;
  const c20 = compact.byValue?.["20px"] ?? 0;
  const c4 = compact.byValue?.["4px"] ?? 0;
  // Barre de distribution preferred / compact / violation (proportions du classifiable).
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

  const FUTURE = ["Radius", "Typography", "Motion", "Icons", "CSS token adoption", "Story coverage", "Visual regression", "CI health"];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      {/* En-tête */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Design System Health</h1>
          <p className="text-sm text-muted-foreground">
            Source : moteur <code>design-system/health/</code> · contrat v{spacing.reportVersion} · lecture seule
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

      {/* Résumé global */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Résumé global</h2>
        <div className="flex flex-wrap gap-4">
          <ScoreCard label="Spacing Health" value={pct(s.health)} caption="0.7·value + 0.3·scale adoption" tone={healthTone} bar={s.health} />
          <ScoreCard label="Value compliance" value={pct(s.valueCompliance)} caption="respect de la grille 8/4" tone={valueTone} bar={s.valueCompliance} />
          <ScoreCard label="Scale adoption" value={pct(s.scaleAdoption)} caption="via l'échelle (≠ tokens var(--space-*))" tone={s.scaleAdoption >= 0.9 ? "good" : "warn"} bar={s.scaleAdoption} />
          <ScoreCard label="Confidence" value={pct(c.value)} caption="fiabilité du score" tone={c.value >= 0.85 ? "good" : "warn"} bar={c.value} />
          <Card className="min-w-56 flex-1">
            <CardHeader className="pb-2">
              <CardDescription>Accessibility</CardDescription>
              <CardTitle className="text-3xl">{a11y?.display?.value ?? "—"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">{a11y?.display?.detail ?? "—"}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">CI enforced</span>
                <StatusBadge tone={a11y?.status === "enforced" ? "good" : "bad"}>{a11y?.status === "enforced" ? "PASS" : "OFF"}</StatusBadge>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>Détectés : <strong className="text-foreground tabular-nums">{t.detected}</strong></span>
          <span>Preferred : <strong className="text-foreground tabular-nums">{t.preferred}</strong></span>
          <span>Compact-allowed : <strong className="text-foreground tabular-nums">{t.compactAllowed}</strong></span>
          <span>Violations : <strong className="text-foreground tabular-nums">{t.violations}</strong></span>
          <span>Exceptions : <strong className="text-foreground tabular-nums">{t.exceptions}</strong></span>
          <span>Needs-decision : <strong className="text-foreground tabular-nums">{t.needsDecision}</strong></span>
        </div>

        {/* Distribution par tier — rend visible que preferred ≠ compact-allowed */}
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

      <Separator />

      {/* Spacing détaillé */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Spacing</h2>

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

      <Separator />

      {/* Fondations futures — pas de faux score */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Autres fondations</h2>
        <div className="flex flex-wrap gap-2">
          {FUTURE.map((f) => (
            <Badge key={f} variant="outline"><span aria-hidden className="mr-1">○</span>{f} — Not measured yet</Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Dashboard> = {
  title: "Health",
  component: Dashboard,
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: { description: { component: "Tableau de bord de la qualité du Design System, alimenté uniquement par les rapports réels du moteur Health (npm run audit:spacing). Le Dashboard ne calcule rien." } },
  },
};
export default meta;

export const Overview: StoryObj<typeof Dashboard> = {};
