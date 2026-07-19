import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, XLink } from "./_shared";

function Page() {
  return (
    <HealthDomainPage
      slug="health-quality-gates"
      title="Quality Gates"
      intro={<>Les garde-fous bloquants avant merge — <strong>Accessibility incluse</strong>, car c'est un gate au même titre que typecheck ou lint, pas un domaine à part. Détail a11y : <XLink to="foundations-accessibility--docs">Foundations / Accessibility</XLink>.</>}
    />
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Quality Gates",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
