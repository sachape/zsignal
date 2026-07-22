import type { Meta, StoryObj } from "@storybook/react-vite";
import { HealthDomainPage, XLink } from "./_shared";

function Page() {
  return (
    <HealthDomainPage
      slug="health-foundations"
      title="Foundations Health"
      intro={<>Chaque fondation attendue d'un DS mature, avec son état réel. Le pourcentage est un taux d'<strong>adoption</strong> : la part des usages du produit qui tombent sur l'échelle gouvernée — un score bas signifie que les tokens existent mais ne sont pas consommés, pas que la fondation manque. Spacing expose son score de santé composite (<XLink to="health-spacing--report">voir Spacing Health</XLink>) ; le détail par domaine est dans <XLink to="health-adoption--report">Adoption</XLink>. Explorer les pages : <XLink to="foundations-colors--overview">Foundations</XLink>.</>}
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
