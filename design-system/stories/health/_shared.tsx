import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/* Module partagé des pages Health (n'est pas une *.stories → non indexé).
   Toutes les pages lisent le MÊME rapport `health-summary.json` produit par le
   moteur `design-system/health/`. Aucune page ne calcule ni n'invente de score. */

const reports = import.meta.glob("/reports/design-system/health-summary.json", {
  eager: true,
  import: "default",
}) as Record<string, any>;
export const summary = Object.values(reports)[0] as any;

export const CONTRACT_VERSION = 1;
export const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);
export const fmtDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

// Les 4 états de maturité — couleur + glyphe (jamais couleur seule).
export type MState = "measured" | "documented" | "planned" | "missing";
export const STATE: Record<MState, { glyph: string; label: string; cls: string }> = {
  measured: { glyph: "●", label: "Measured", cls: "border-success/30 bg-success/10 text-success" },
  documented: { glyph: "◆", label: "Documented", cls: "border-border bg-muted text-foreground" },
  planned: { glyph: "◷", label: "Planned", cls: "border-warning/30 bg-warning/10 text-warning" },
  missing: { glyph: "○", label: "Missing", cls: "border-destructive/30 bg-destructive/5 text-destructive" },
};
export function StateChip({ state, children }: { state: MState; children?: ReactNode }) {
  const s = STATE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      <span aria-hidden>{s.glyph}</span>
      {children ?? s.label}
    </span>
  );
}

// Lien vers une autre page Storybook depuis le canvas (navigue la fenêtre parente).
export function xlink(storyId: string) {
  return `?path=/story/${storyId}`;
}
export function XLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a href={xlink(to)} target="_top" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

export function areaBySlug(slug: string) {
  return (summary?.maturity?.areas ?? []).find((a: any) => a.slug === slug) ?? null;
}
export function areaCounts(area: any) {
  const c = { measured: 0, documented: 0, planned: 0, missing: 0 } as Record<MState, number>;
  for (const d of area?.domains ?? []) c[d.status as MState] = (c[d.status as MState] ?? 0) + 1;
  return c;
}

export function Guard() {
  return (
    <div className="p-8 max-w-2xl">
      <Alert>
        <AlertTitle>▲ Rapport indisponible</AlertTitle>
        <AlertDescription>
          Aucun rapport Health exploitable. Lance <code>npm run audit:spacing</code> puis rebuild Storybook.
        </AlertDescription>
      </Alert>
    </div>
  );
}

/** Rendu générique d'une sous-page Health : en-tête + retour Overview + détail
 *  d'une aire (statuts, mesures, notes) + contenu additionnel optionnel. */
export function HealthDomainPage({ slug, title, intro, extra }: { slug: string; title: string; intro?: ReactNode; extra?: ReactNode }) {
  if (!summary || summary.reportVersion !== CONTRACT_VERSION) return <Guard />;
  const area = areaBySlug(slug);
  if (!area) return <Guard />;
  const c = areaCounts(area);
  const total = area.domains.length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-3">
        <XLink to="health-overview--dashboard">← Health / Overview</XLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {area.note && <p className="max-w-2xl text-sm text-muted-foreground">{area.note}</p>}
          </div>
          <span className="text-xs text-muted-foreground">
            {c.measured}/{total} measured · maj {fmtDate(summary.generatedAt)}
          </span>
        </div>
        {intro && <div className="text-sm text-muted-foreground">{intro}</div>}
      </header>

      {extra}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Domaines</CardTitle>
          <CardDescription>Métrique réelle quand elle existe ; statut sinon. Rien n'est inventé.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {area.domains.map((d: any) => (
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

      <p className="text-xs text-muted-foreground">
        Source : moteur <code>design-system/health/</code> · contrat v{summary.reportVersion} · lecture seule.
        Les lignes <em>planned/missing</em> deviendront <em>measured</em> quand un provider produira leur donnée — sans changer cette page.
      </p>
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge };
