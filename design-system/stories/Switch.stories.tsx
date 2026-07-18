import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * Switch — un réglage on/off immédiat (2×). À réserver aux bascules sans étape
 * de validation (ex. « Notifier à la fin d'un rendu »).
 */
const meta: Meta<typeof Switch> = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: { docs: { description: { component: "Switch — un réglage on/off immédiat (2×). À réserver aux bascules sans étape de validation." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Switch>;

/** Playground — bascule `defaultChecked` et `disabled` dans les contrôles. */
export const Playground: S = { args: { defaultChecked: true, disabled: false } };

export const Reglage: S = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="notif" defaultChecked />
      <Label htmlFor="notif">Notifier à la fin du rendu</Label>
    </div>
  ),
  // Comportement : le clic bascule l'état coché.
  play: async ({ canvas, userEvent }) => {
    const sw = canvas.getByRole("switch");
    await expect(sw).toBeChecked();
    await userEvent.click(sw);
    await expect(sw).not.toBeChecked();
  },
};
