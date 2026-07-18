import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Checkbox — une sélection dans une liste ou un consentement (2×). Radix :
 * expose bien le rôle `checkbox` et l'état coché.
 */
const meta: Meta<typeof Checkbox> = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Checkbox>;

export const Consentement: S = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="cgu" />
      <Label htmlFor="cgu">J'accepte de publier sur les plateformes connectées</Label>
    </div>
  ),
  // Comportement : décoché au départ, le clic le coche.
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox");
    await expect(box).not.toBeChecked();
    await userEvent.click(box);
    await expect(box).toBeChecked();
  },
};
