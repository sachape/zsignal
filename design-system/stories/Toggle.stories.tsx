import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Toggle } from "@/components/ui/toggle";

/**
 * Toggle — un bouton à deux états (activé/non), ex. épingler un clip. Distinct
 * du Switch : c'est un bouton d'action, pas un réglage de formulaire.
 */
const meta: Meta<typeof Toggle> = {
  title: "Primitives/Toggle",
  component: Toggle,
  parameters: { docs: { description: { component: "Toggle — un bouton à deux états (activé/non), ex. épingler un clip." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Toggle>;

export const Epingler: S = {
  render: () => <Toggle aria-label="Épingler le clip">Épingler</Toggle>,
  // Comportement : le clic bascule aria-pressed.
  play: async ({ canvas, userEvent }) => {
    const btn = canvas.getByRole("button", { name: /épingler le clip/i });
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(btn);
    await expect(btn).toHaveAttribute("aria-pressed", "true");
  },
};
