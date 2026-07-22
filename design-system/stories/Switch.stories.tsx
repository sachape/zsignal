import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { lock } from "./_lockControls";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof Switch> = {
  title: "Components/Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
  // aria-label requis : un switch sans texte doit avoir un nom accessible.
  args: { defaultChecked: false, disabled: false, "aria-label": "Notifier à la fin du rendu", onCheckedChange: fn() },
  argTypes: {
    ...common("checked", "onCheckedChange", "required", "name", "className"),
    defaultChecked: describe("État initial, en mode non contrôlé. Un switch applique son effet IMMÉDIATEMENT — pas de bouton de validation.", { control: "boolean", category: CAT.state }),
    defaultChecked: { control: "boolean", description: "État initial (on/off).", table: { category: "State" } },
    disabled: { control: "boolean", description: "Désactive la bascule.", table: { category: "State" } },
    onCheckedChange: { control: false, description: "Callback au changement d'état.", table: { category: "Events" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Switch — réglage on/off immédiat, sans étape de validation. Toujours associer un label ou un aria-label." } },
  },
};
export default meta;
type S = StoryObj<typeof Switch>;

export const Playground: S = {};

export const Checked: S = { args: { defaultChecked: true }, argTypes: lock("defaultChecked") };
export const Unchecked: S = { args: { defaultChecked: false }, argTypes: lock("defaultChecked") };
export const Disabled: S = { args: { disabled: true, defaultChecked: true }, argTypes: lock("disabled") };

/** Use case : réglage étiqueté (clic sur le label bascule le switch). */
export const AvecLabel: S = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Switch id="notif" {...args} aria-label={undefined} />
      <Label htmlFor="notif">Notifier à la fin du rendu</Label>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const sw = canvas.getByRole("switch");
    await expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    await expect(sw).toBeChecked();
  },
};
