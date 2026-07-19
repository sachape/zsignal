import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, summary, pct, Card, CardContent } from "./_shared";
import { Progress } from "@/components/ui/progress";

function Extra() {
  const a = summary?.adoption;
  if (!a) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card><CardContent className="flex flex-col gap-2 p-4">
        <span className="text-xs text-muted-foreground">Component adoption</span>
        <span className="text-2xl font-semibold tabular-nums">{pct(a.componentAdoption)}</span>
        <Progress value={a.componentAdoption * 100} aria-label="component adoption" />
        <span className="text-xs text-muted-foreground">{a.dsFiles}/{a.jsxFiles} fichiers app</span>
      </CardContent></Card>
      <Card><CardContent className="flex flex-col gap-2 p-4">
        <span className="text-xs text-muted-foreground">Spacing scale</span>
        <span className="text-2xl font-semibold tabular-nums">{pct(a.scaleAdoption)}</span>
        <Progress value={a.scaleAdoption * 100} aria-label="spacing adoption" />
        <span className="text-xs text-muted-foreground">sur l'échelle gouvernée</span>
      </CardContent></Card>
      <Card><CardContent className="flex flex-col gap-2 p-4">
        <span className="text-xs text-muted-foreground">Éléments bruts</span>
        <span className="text-2xl font-semibold tabular-nums text-warning">{a.rawElements}</span>
        <span className="text-xs text-muted-foreground">{a.rawByTag?.button} button · {a.rawByTag?.input} input · {a.rawByTag?.select} select</span>
      </CardContent></Card>
      <Card><CardContent className="flex flex-col gap-2 p-4">
        <span className="text-xs text-muted-foreground">Couleurs en dur</span>
        <span className="text-2xl font-semibold tabular-nums text-warning">{a.hardColors}</span>
        <span className="text-xs text-muted-foreground">hex hors tokens</span>
      </CardContent></Card>
    </div>
  );
}

function Page() {
  return (
    <HealthDomainPage
      slug="health-adoption"
      title="Adoption"
      intro={<>À quel point le <strong>produit Streamnco</strong> consomme réellement le DS — mesuré sur le vrai code <code>src/</code> (hors cœur <code>ui/</code>). Les éléments bruts et couleurs en dur sont la dette d'adoption restante.</>}
      extra={<Extra />}
    />
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
