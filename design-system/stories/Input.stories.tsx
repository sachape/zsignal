import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Input + Label — la base des formulaires (input 20×, label 18×). Montrés
 * ensemble : un champ de formulaire complet.
 */
const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  parameters: { docs: { description: { component: "Input + Label — la base des formulaires (input 20×, label 18×). Montrés ensemble : un champ de formulaire complet." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Input>;

/** Playground — joue avec `placeholder`, `disabled`, `type` dans les contrôles. */
export const Playground: S = {
  render: (args) => <Input {...args} className="w-72" />,
  args: { placeholder: "Saisir…", disabled: false },
};

export const Champ: S = {
  render: () => (
    <div className="grid gap-2 w-72">
      <Label htmlFor="chan">Chaîne Twitch</Label>
      <Input id="chan" placeholder="ex. tonpseudo" />
    </div>
  ),
  // Comportement : la saisie met à jour la valeur du champ.
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText(/chaîne twitch/i);
    await userEvent.type(field, "tonpseudo");
    await expect(field).toHaveValue("tonpseudo");
  },
};

export const Desactive: S = {
  render: () => (
    <div className="grid gap-2 w-72">
      <Label htmlFor="mail">Email</Label>
      <Input id="mail" defaultValue="sacha@streamnco.com" disabled />
    </div>
  ),
  // Désactivé : la saisie n'a aucun effet, la valeur ne bouge pas.
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText(/email/i);
    await expect(field).toBeDisabled();
    await userEvent.type(field, "xxx");
    await expect(field).toHaveValue("sacha@streamnco.com");
  },
};
