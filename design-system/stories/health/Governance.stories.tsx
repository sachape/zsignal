import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, XLink } from "./_shared";

function Page() {
  return (
    <HealthDomainPage
      slug="health-governance"
      title="Governance"
      intro={<>Contribution, décisions, versioning et documentation du DS. Le socle est documenté ; ADR, versioning et changelog sont en roadmap. Guides : <XLink to="getting-started-contribution--docs">Contribution</XLink> · <XLink to="getting-started-governance--docs">Governance</XLink>.</>}
    />
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Governance",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
