import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lock } from "./_lockControls";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  // aria-label : un champ sans label associé doit avoir un nom accessible.
  args: { placeholder: "Saisir…", disabled: false, readOnly: false, "aria-label": "Champ de saisie" },
  argTypes: {
    placeholder: { control: "text", description: "Exemple de format attendu.", table: { category: "Content" } },
    disabled: { control: "boolean", description: "Désactive le champ.", table: { category: "State" } },
    readOnly: { control: "boolean", description: "Lecture seule (valeur non éditable).", table: { category: "State" } },
    type: { control: "select", options: ["text", "email", "password", "number", "search"], description: "Type HTML du champ.", table: { category: "Behavior" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Input — champ de saisie court. Surface « inset », focus ring token. Toujours associer un label ou un aria-label." } },
  },
  render: (args) => <Input {...args} className="w-72" />,
};
export default meta;
type S = StoryObj<typeof Input>;

export const Playground: S = {};

export const Filled: S = { args: { defaultValue: "tonpseudo", placeholder: undefined } };
export const Disabled: S = { args: { disabled: true, defaultValue: "sacha@streamnco.com" }, argTypes: lock("disabled") };
export const ReadOnly: S = { args: { readOnly: true, defaultValue: "identifiant-verrouillé" }, argTypes: lock("readOnly") };
export const Invalid: S = {
  args: { defaultValue: "pas-un-email", "aria-invalid": true },
  render: (args) => <Input {...args} aria-label="Email" className="w-72 border-destructive focus-visible:ring-destructive" />,
};

/** Use case : champ étiqueté (le cas normal en formulaire). */
export const AvecLabel: S = {
  render: () => (
    <div className="grid gap-2 w-72">
      <Label htmlFor="chan">Chaîne Twitch</Label>
      <Input id="chan" placeholder="ex. tonpseudo" />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText(/chaîne twitch/i);
    await userEvent.type(field, "tonpseudo");
    await expect(field).toHaveValue("tonpseudo");
  },
};
