import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, XLink } from "./_shared";

function Page() {
  return (
    <HealthDomainPage
      slug="health-foundations"
      title="Foundations Health"
      intro={<>Chaque fondation attendue d'un DS mature, avec son état réel. Documentée = page publiée ; Spacing est la seule mesurée finement (<XLink to="health-spacing--report">voir Spacing Health</XLink>). Explorer les pages : <XLink to="foundations-colors--overview">Foundations</XLink>.</>}
    />
  );
}

const meta: Meta<typeof Page> = {
  title: "Health/Foundations",
  component: Page,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Report: StoryObj<typeof Page> = {};
