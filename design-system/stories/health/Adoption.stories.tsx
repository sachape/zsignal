import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import {
  HealthPageShell,
  DomainTable,
  StateChip,
  Guard,
  XLink,
  summary,
  areaBySlug,
  areaCounts,
  pct,
  fmtDay,
  CONTRACT_VERSION,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./_shared";
import { Progress } from "@/components/ui/progress";

/* Hiérarchie de la page — deux niveaux de lecture, jamais mélangés :
   1. Résumé exécutif : 4 indicateurs GÉNÉRALISTES (adoption composants,
      adoption fondations, dette composants, dette tokens).
   2. Détail par domaine : composants / fondations, où le spacing n'est
      qu'une sous-métrique des fondations — pas un pilier de l'adoption.
   Aucun score global agrégé : les métriques n'ont ni le même poids ni la
   même maturité, un « DS Adoption 88 % » serait inventé. */

function SummaryCard({ label, value, hint, children }: { label: string; value: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        {value}
        {children}
        {/* mt-auto : le détail s'ancre en bas, les cartes gardent la même hauteur
            sans laisser de vide au milieu quand l'une est plus dense. */}
        {hint && <span className="mt-auto text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

function MiniRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function ExecutiveSummary() {
  const a = summary?.adoption;
  if (!a) return null;
  const f = a.foundations;
  // Détail des éléments bruts : on ne liste que les balises réellement présentes
  // (« 0 input · 0 select » est du bruit, pas de l'information).
  const rawDetail = Object.entries(a.rawByTag ?? {})
    .filter(([, n]) => (n as number) > 0)
    .map(([tag, n]) => `${n} ${tag}`)
    .join(" · ");
  return (
    // 2 × 2 : la première ligne dit l'adoption, la seconde dit la dette.
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SummaryCard
        label="Adoption des composants"
        value={<span className="text-2xl font-semibold tabular-nums">{pct(a.componentAdoption)}</span>}
        hint={`${a.excludedFromDenom} fichiers hors périmètre (ADR 0005) — non comptés`}
      >
        <Progress value={a.componentAdoption * 100} aria-label="adoption des composants" />
        <div className="flex flex-col gap-2">
          <MiniRow label="Fichiers consommant le DS" value={a.dsFiles} />
          <MiniRow label="Fichiers sans DS" value={a.jsxFiles - a.dsFiles} />
          <MiniRow label="Périmètre mesuré" value={a.jsxFiles} />
        </div>
      </SummaryCard>

      {/* Toujours pas de chiffre unique : agréger cinq fondations donnerait un
          score dominé par le volume (2 099 usages typo contre 80 d'ombres), pas
          par l'état réel du système. On liste, on n'agrège pas. */}
      <SummaryCard
        label="Adoption des fondations"
        value={
          <span className="flex">
            <StateChip state="measured">6 mesurées sur 6</StateChip>
          </span>
        }
        hint="Une ligne = une fondation. Pas de moyenne : les volumes sont incomparables."
      >
        <div className="flex flex-col gap-2">
          {/* Ordre FIXE, identique au tableau Fondations plus bas : un rapport se
              relit d'une semaine à l'autre, les lignes ne doivent pas se réordonner
              parce qu'un score a bougé. */}
          <MiniRow label="Espacement" value={pct(a.scaleAdoption)} />
          <MiniRow label="Typographie" value={pct(f?.typography?.adoption)} />
          <MiniRow label="Radius" value={pct(f?.radius?.adoption)} />
          <MiniRow label="Ombres" value={pct(f?.shadow?.adoption)} />
          <MiniRow label="Motion" value={pct(f?.motion?.adoption)} />
          <MiniRow label="Couleurs" value={pct(f?.colors?.adoption)} />
        </div>
      </SummaryCard>

      <SummaryCard
        label="Dette composants"
        value={<span className="text-2xl font-semibold tabular-nums text-warning">{a.rawElements}</span>}
        hint={rawDetail}
      >
        <span className="text-xs text-muted-foreground">éléments natifs hors Design System</span>
      </SummaryCard>

      <SummaryCard
        label="Dette tokens"
        value={<span className="text-2xl font-semibold tabular-nums text-warning">{a.hardColors}</span>}
        hint="couleurs hex et classes arbitraires"
      >
        <span className="text-xs text-muted-foreground">valeurs hors tokens sémantiques</span>
      </SummaryCard>
    </div>
  );
}

/* Qualité, accessibilité et gouvernance participent à l'adoption mais sont
   MESURÉES AILLEURS. On les référence au lieu de les redupliquer ici : un
   domaine ne doit être compté qu'une fois dans la maturité globale. */
function ElsewhereCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Qualité et gouvernance</CardTitle>
        <CardDescription>
          Mesuré dans d'autres aires Health — référencé ici, pas recompté.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        {[
          { to: "health-components--report", label: "Couverture des stories & a11y", note: "story coverage, axe bloquant, variantes" },
          { to: "health-quality-gates--report", label: "Quality gates", note: "garde-fous bloquants avant merge" },
          { to: "health-visual-quality--report", label: "Tests visuels", note: "régression visuelle, baseline Chromatic" },
          { to: "health-governance--report", label: "Gouvernance & documentation", note: "contribution, ADR, versioning, sync design ↔ code" },
        ].map((l) => (
          <div key={l.to} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">{l.label}</span>
              <span className="text-xs text-muted-foreground">{l.note}</span>
            </div>
            <XLink to={l.to}>Voir →</XLink>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Page() {
  if (!summary || summary.reportVersion !== CONTRACT_VERSION) return <Guard />;
  const area = areaBySlug("health-adoption");
  if (!area) return <Guard />;

  const c = areaCounts(area);
  const total = area.domains.length;
  const group = (g: string) => area.domains.filter((d: any) => d.group === g);
  const components = group("components");
  const foundations = group("foundations");

  return (
    <HealthPageShell
      title="Adoption"
      lead="Mesure de l'utilisation réelle du Design System dans le produit."
      intro={
        <>
          Composants, fondations et dette restante, analysés directement dans le code source (<code>src/</code>, hors
          cœur <code>ui/</code>). Aucun score global : les domaines n'ont ni le même poids ni la même maturité.
        </>
      }
      meta={
        <>
          {c.measured} domaines sur {total} mesurés
          <br />
          Mis à jour le {fmtDay(summary.generatedAt)}
        </>
      }
    >
      <ExecutiveSummary />

      {components.length > 0 && (
        <DomainTable
          title="Composants"
          description="Ce que le produit consomme du catalogue, et ce qu'il continue de coder à la main."
          domains={components}
        />
      )}

      {foundations.length > 0 && (
        <DomainTable
          title="Fondations"
          description="Part des usages qui tombent sur l'échelle gouvernée, fondation par fondation. Un score bas ne veut pas dire « cassé » : il dit que les tokens existent mais que le produit ne les consomme pas encore."
          domains={foundations}
        />
      )}

      {components.length === 0 && foundations.length === 0 && (
        <DomainTable title="Domaines" description="Métrique réelle quand elle existe ; statut sinon." domains={area.domains} />
      )}

      <ElsewhereCard />
    </HealthPageShell>
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Adoption",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
