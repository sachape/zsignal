import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage } from "./_shared";

function Page() {
  return (
    <HealthDomainPage
      slug="health-visual-quality"
      title="Visual Quality"
      intro={<>Domaine <strong>durable</strong> : une baseline n'est qu'un état transitoire, mais la qualité visuelle se pilote sur des années. Ses sous-métriques (baseline, régression, snapshots, changements approuvés/inattendus) passeront de <em>missing/planned</em> à <em>measured</em> dès que la CI Chromatic écrira <code>visual-quality.report.json</code> — sans changer cette page.</>}
    />
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Visual Quality",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
