import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, XLink, summary, pct, Card, CardContent } from "./_shared";
import { Progress } from "@/components/ui/progress";

function Extra() {
  const c = summary?.components;
  if (!c) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Card><CardContent className="flex flex-col gap-2 p-4"><span className="text-xs text-muted-foreground">Story coverage</span><span className="text-2xl font-semibold tabular-nums">{pct(c.coverage)}</span><Progress value={c.coverage * 100} aria-label="coverage" /><span className="text-xs text-muted-foreground">{c.withStory}/{c.total} composants ui/</span></CardContent></Card>
      <Card><CardContent className="flex flex-col gap-2 p-4"><span className="text-xs text-muted-foreground">Stories publiées</span><span className="text-2xl font-semibold tabular-nums">{c.componentStories}</span><span className="text-xs text-muted-foreground">composants + patterns</span></CardContent></Card>
      <Card><CardContent className="flex flex-col gap-2 p-4"><span className="text-xs text-muted-foreground">Accessibilité</span><span className="text-2xl font-semibold">PASS</span><span className="text-xs text-muted-foreground">axe bloquante, toutes stories</span></CardContent></Card>
    </div>
  );
}

function Page() {
  return (
    <HealthDomainPage
      slug="health-components"
      title="Components Health"
      intro={<>Le domaine composant dans son ensemble — couverture, stories, variantes, doc, a11y. Explorer : <XLink to="components-actions-button--docs">Components</XLink>.</>}
      extra={<Extra />}
    />
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Components",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
