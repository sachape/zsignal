import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { lock } from "./_lockControls";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: { defaultChecked: false, disabled: false, "aria-label": "Case à cocher", onCheckedChange: fn() },
  argTypes: {
    ...common("checked", "onCheckedChange", "required", "name", "className"),
    defaultChecked: describe("État initial, en mode non contrôlé.", { control: "boolean", category: CAT.state }),
    defaultChecked: { control: "boolean", description: "État initial (coché/non).", table: { category: "State" } },
    disabled: { control: "boolean", table: { category: "State" } },
    onCheckedChange: { control: false, table: { category: "Events" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Checkbox — sélection dans une liste ou consentement. Toujours associer un label ou un aria-label." } },
  },
};
export default meta;
type S = StoryObj<typeof Checkbox>;

export const Playground: S = {};

export const Checked: S = { args: { defaultChecked: true }, argTypes: lock("defaultChecked") };
export const Unchecked: S = { args: { defaultChecked: false }, argTypes: lock("defaultChecked") };
export const Disabled: S = { args: { disabled: true, defaultChecked: true }, argTypes: lock("disabled") };

/** Use case : consentement étiqueté (le cas normal). */
export const AvecLabel: S = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="cgu" {...args} aria-label={undefined} />
      <Label htmlFor="cgu">J'accepte de publier sur les plateformes connectées</Label>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox");
    await expect(box).not.toBeChecked();
    await userEvent.click(box);
    await expect(box).toBeChecked();
  },
};
