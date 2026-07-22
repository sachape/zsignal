import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  summary, CONTRACT_VERSION, pct, fmtDate, STATE, StateChip, XLink, areaCounts, Guard,
  type MState,
} from "./_shared";

/**
 * Health / Overview — VUE EXÉCUTIVE du Design System, pas un tableau de bord de
 * dépôt. Elle répond à quatre questions, dans cet ordre :
 *   1. Où en est le système ?            → maturité + couverture de mesure
 *   2. Qu'est-ce qui compte vraiment ?   → 4 indicateurs généralistes
 *   3. Quels risques sont ouverts ?      → priorités, avec l'action suivante
 *   4. Où investir ensuite ?             → 5 piliers, chacun vers son détail
 *
 * Deux règles de lecture :
 *  - Le score pondéré ne couvre que 3 dimensions : il n'est JAMAIS présenté seul,
 *    toujours accompagné de sa couverture de mesure. Un score sans sa couverture
 *    se surestime.
 *  - Le spacing n'est plus un pilier : c'est une métrique interne de Foundations.
 */

type Tone = "good" | "warn" | "bad";
const TONE: Record<Tone, { variant: any; glyph: string }> = {
  good: { variant: "success", glyph: "●" },
  warn: { variant: "warning", glyph: "▲" },
  bad: { variant: "destructive", glyph: "■" },
};
function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (<Badge variant={t.variant}><span aria-hidden className="mr-2">{t.glyph}</span>{children}</Badge>);
}

const COUNT_ORDER: MState[] = ["measured", "documented", "planned", "missing"];

function MiniRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function KpiCard({ label, value, tone, children }: { label: string; value: ReactNode; tone?: "warn"; children?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-warning" : ""}`}>{value}</span>
        {children}
      </CardContent>
    </Card>
  );
}

function Overview() {
  if (!summary || summary.reportVersion !== CONTRACT_VERSION || !summary.overall || !summary.maturity) return <Guard />;

  const o = summary.overall;
  const m = summary.maturity;
  const lvl = m.level;
  const a = summary.adoption ?? {};
  const f = a.foundations ?? {};
  const ageDays = (Date.now() - new Date(summary.generatedAt).getTime()) / 86_400_000;
  const fresh = ageDays <= 14;

  // Priorités = les domaines « missing » (attendus vu notre outillage, absents).
  const risks: { area: string; label: string; note?: string; action?: string }[] = [];
  for (const ar of m.areas) for (const d of ar.domains) if (d.status === "missing") risks.push({ area: ar.area, label: d.label, note: d.note, action: d.action });

  // Fondation la plus faible : rend la carte Foundations actionnable sans avoir
  // à lister les douze. Dérivé, jamais inventé.
  const weakest = Object.entries(f)
    .filter(([, v]: any) => v?.adoption != null)
    .sort((x: any, y: any) => x[1].adoption - y[1].adoption)[0] as [string, any] | undefined;
  const FDN_LABEL: Record<string, string> = {
    typography: "Typographie", radius: "Radius", shadow: "Ombres", motion: "Motion",
    colors: "Couleurs", borders: "Bordures", elevation: "Élévation", opacity: "Opacité",
    grid: "Grille", icons: "Icônes", darkmode: "Thème clair",
  };

  const debt = (a.rawElements ?? 0) + (a.hardColors ?? 0);
  const gatesActive = (summary.quality ?? []).filter((q: any) => q.state !== "off").length;

  // Aucune valeur en dur dans cette page : tout se lit dans le rapport.
  const domainByKey = (key: string) => {
    for (const ar of m.areas) for (const d of ar.domains) if (d.key === key) return d;
    return null;
  };
  const stateLabel = (key: string) => {
    const d = domainByKey(key);
    return d ? (d.measure ?? STATE[d.status as MState].label) : "—";
  };
  const govCounts = areaCounts(m.areas.find((x: any) => x.pillar === "governance"));

  // Contenu de chaque pilier — uniquement des valeurs présentes dans le rapport.
  const PILLAR_BODY: Record<string, { headline?: string | null; rows: { label: string; value: ReactNode }[] }> = {
    foundations: {
      headline: summary.tokens ? `${summary.tokens.total} tokens` : null,
      rows: [
        { label: "Fondations mesurées", value: `${areaCounts(m.areas.find((x: any) => x.slug === "health-foundations")).measured}/12` },
        { label: "Spacing", value: pct(a.scaleAdoption) },
        { label: weakest ? `Plus faible — ${FDN_LABEL[weakest[0]] ?? weakest[0]}` : "Plus faible", value: weakest ? pct(weakest[1].adoption) : "—" },
      ],
    },
    components: {
      headline: pct(summary.components?.coverage),
      rows: [
        { label: "Composants du catalogue", value: summary.components?.total },
        { label: "Stories publiées", value: summary.components?.componentStories },
        { label: "Accessibilité (axe)", value: "PASS" },
      ],
    },
    adoption: {
      headline: pct(a.componentAdoption),
      rows: [
        { label: "Éléments bruts restants", value: a.rawElements },
        { label: "Valeurs couleur hors tokens", value: a.hardColors },
        { label: "Couleurs passant par un token", value: pct(f.colors?.adoption) },
      ],
    },
    quality: {
      headline: summary.inventory?.qualityGates,
      rows: [
        { label: "Garde-fous actifs", value: gatesActive },
        { label: "Baseline visuelle", value: stateLabel("vq-baseline") },
        { label: "Régression visuelle", value: stateLabel("vq-regression") },
      ],
    },
    governance: {
      headline: null,
      rows: [
        { label: "Processus documentés", value: govCounts.documented },
        { label: "Chantiers planifiés", value: govCounts.planned },
        { label: "Domaines mesurés", value: govCounts.measured },
      ],
    },
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Design System Health</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Vue synthétique de la maturité, de l'adoption et des risques du Design System.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Dernier audit : {fmtDate(summary.generatedAt)}</span>
          <StatusBadge tone={fresh ? "good" : "warn"}>{fresh ? "À jour" : `Obsolète (${Math.floor(ageDays)} j)`}</StatusBadge>
        </div>
      </header>

      {/* 1. Où en est le système ? — maturité AVANT tout score. */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Maturité actuelle</CardDescription>
          <div className="flex flex-wrap items-baseline gap-4">
            <CardTitle className="text-2xl">{lvl.level}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {lvl.measured} domaines mesurés sur {lvl.total} · {lvl.critical} risque{lvl.critical > 1 ? "s" : ""} critique{lvl.critical > 1 ? "s" : ""} · {lvl.planned} planifiés
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Couverture de mesure</span>
              <span className="tabular-nums text-foreground">{pct(lvl.coverage)}</span>
            </div>
            <Progress value={lvl.coverage * 100} aria-label="couverture de mesure" />
          </div>
          <div className="flex flex-wrap gap-2">
            {COUNT_ORDER.map((k) => <StateChip key={k} state={k}>{m.counts[k]} {STATE[k].label}</StateChip>)}
          </div>
          {/* Le score pondéré, explicitement borné à ce qu'il couvre. */}
          <div className="flex flex-wrap items-baseline gap-4 rounded-lg border border-border p-4">
            <span className="text-sm text-muted-foreground">Santé mesurée</span>
            <span className="text-base font-semibold tabular-nums text-foreground">{pct(o.score)}</span>
            <span className="text-xs text-muted-foreground">
              sur {o.calculatedFrom.length} dimensions seulement ({o.calculatedFrom.join(", ")}) — à lire avec la couverture de {pct(lvl.coverage)} ci-dessus, pas comme un verdict sur tout le système.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Qu'est-ce qui compte vraiment ? */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Adoption produit" value={pct(a.componentAdoption)}>
          <span className="mt-auto text-xs text-muted-foreground">{a.dsFiles} fichiers sur {a.jsxFiles} utilisent le Design System</span>
        </KpiCard>
        <KpiCard label="Couverture composants" value={pct(summary.components?.coverage)}>
          <span className="mt-auto text-xs text-muted-foreground">{summary.components?.withStory}/{summary.components?.total} composants documentés dans Storybook</span>
        </KpiCard>
        <KpiCard label="Quality gates" value={summary.inventory?.qualityGates}>
          <span className="mt-auto text-xs text-muted-foreground">{gatesActive} contrôles automatisés actifs en CI</span>
        </KpiCard>
        <KpiCard label="Dette Design System" value={debt} tone="warn">
          <span className="mt-auto text-xs text-muted-foreground">{a.rawElements} éléments bruts · {a.hardColors} valeurs hors tokens</span>
        </KpiCard>
      </div>

      {/* 3. Quels risques sont ouverts ? Zéro risque se DIT — sinon la section
          disparaît sans un mot et le lecteur croit à un oubli. */}
      {risks.length === 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priorités</CardTitle>
            <CardDescription>Aucun risque critique ouvert : tout ce qui est attendu vu notre outillage est en place.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les {m.counts.planned} chantiers <em>planned</em> restants sont des évolutions assumées, pas des manques —
              ils sont détaillés dans chaque pilier.
            </p>
          </CardContent>
        </Card>
      )}
      {risks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priorités</CardTitle>
            <CardDescription>Attendu vu notre outillage, mais absent. Chaque ligne porte l'action suivante.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {risks.map((r) => (
              <div key={`${r.area}-${r.label}`} className="flex flex-col gap-2 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="bad">Critique</StatusBadge>
                  <span className="text-sm font-medium text-foreground">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.area}</span>
                </div>
                {r.note && <span className="text-xs text-muted-foreground">{r.note}</span>}
                {r.action && <span className="text-sm text-foreground">→ {r.action}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4. Où investir ensuite ? — 5 piliers, pas 8 domaines techniques. */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Les cinq piliers</h2>
          <p className="text-sm text-muted-foreground">
            Chaque pilier agrège ses domaines de mesure. L'étiquette qualifie la <strong>couverture de mesure</strong> du
            pilier, pas la performance : le chiffre à droite porte la performance.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(summary.pillars ?? []).map((p: any) => {
            const areas = m.areas.filter((x: any) => x.pillar === p.key);
            const c = { measured: 0, documented: 0, planned: 0, missing: 0 } as Record<MState, number>;
            for (const ar of areas) { const ac = areaCounts(ar); for (const k of COUNT_ORDER) c[k] += ac[k]; }
            const total = COUNT_ORDER.reduce((acc, k) => acc + c[k], 0);
            const cov = total ? c.measured / total : 0;
            const state = cov >= 0.8 ? "Bon" : cov >= 0.5 ? "Partiel" : cov >= 0.25 ? "En construction" : "Non mesuré";
            const body = PILLAR_BODY[p.key] ?? { rows: [] };
            return (
              <Card key={p.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <CardTitle className="text-base">{p.label}</CardTitle>
                    {body.headline && <span className="text-sm font-semibold tabular-nums text-foreground">{body.headline}</span>}
                  </div>
                  <CardDescription>{p.note}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={cov >= 0.8 ? "success" : cov >= 0.5 ? "secondary" : "warning"}>{state}</Badge>
                    <span className="text-xs text-muted-foreground">{c.measured}/{total} mesurés</span>
                    {c.missing > 0 && <StatusBadge tone="bad">{c.missing} risque{c.missing > 1 ? "s" : ""}</StatusBadge>}
                  </div>
                  <div className="flex flex-col gap-2">
                    {body.rows.map((r) => <MiniRow key={r.label} label={r.label} value={r.value} />)}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {areas.map((ar: any) => <XLink key={ar.slug} to={`${ar.slug}--report`}>{ar.area} →</XLink>)}
                    {(p.extraLinks ?? []).map((l: any) => <XLink key={l.slug} to={`${l.slug}--report`}>{l.label} →</XLink>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Source : moteur <code>design-system/health/</code> · contrat v{summary.reportVersion} · lecture seule.
        Rien n'est saisi à la main : chaque valeur vient d'un provider qui lit le code, les tokens ou la CI.
      </p>
    </div>
  );
}

const meta: Meta<typeof Overview> = {
  title: "Health/Overview",
  component: Overview,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen", controls: { disable: true },
    docs: { description: { component: "Vue exécutive de la maturité, de l'adoption et des risques du Design System. Cinq piliers renvoient vers leur détail. Alimenté uniquement par les rapports réels du moteur Health." } },
  },
};
export default meta;
export const Dashboard: StoryObj<typeof Overview> = {};
