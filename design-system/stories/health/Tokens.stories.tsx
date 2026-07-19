import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, XLink, summary, Card, CardContent, Badge } from "./_shared";

function Extra() {
  const t = summary?.tokens;
  if (!t) return null;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-6">
        <span className="text-3xl font-semibold tabular-nums">{t.total}</span>
        <span className="text-sm text-muted-foreground">tokens · 3 couches + compat</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {Object.entries(t.byLayer).map(([layer, n]) => (
            <Badge key={layer} variant="outline" className="tabular-nums">{layer} {n as number}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  return (
    <HealthDomainPage
      slug="health-tokens"
      title="Tokens Health"
      intro={<>Inventaire réel par couche. L'hygiène (orphelins, dépréciés, alias) est en roadmap — c'est elle qui justifiera un futur provider Token Health. Explorer : <XLink to="foundations-tokens--docs">Foundations / Tokens</XLink>.</>}
      extra={<Extra />}
    />
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Tokens",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
