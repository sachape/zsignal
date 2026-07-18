import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Input + Label — la base des formulaires (input 20×, label 18×). Montrés
 * ensemble : un champ de formulaire complet.
 */
const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Input>;

export const Champ: S = {
  render: () => (
    <div className="grid gap-2 w-72">
      <Label htmlFor="chan">Chaîne Twitch</Label>
      <Input id="chan" placeholder="ex. tonpseudo" />
    </div>
  ),
};

export const Desactive: S = {
  render: () => (
    <div className="grid gap-2 w-72">
      <Label htmlFor="mail">Email</Label>
      <Input id="mail" value="sacha@streamnco.com" disabled />
    </div>
  ),
};
