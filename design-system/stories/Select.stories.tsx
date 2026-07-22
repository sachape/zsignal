import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof Select> = {
  title: "Components/Forms/Select",
  component: Select,
  tags: ["autodocs"],
  args: { disabled: false },
  argTypes: {
    ...common("value", "onValueChange", "required", "name"),
    open: prop("Ouverture de la liste. Contrôlé : à piloter avec `onOpenChange`.", { control: "boolean", category: CAT.state }),
    disabled: { control: "boolean", description: "Désactive le sélecteur.", table: { category: "State" } },
    defaultValue: { control: false, description: "Valeur initiale (non contrôlée).", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Select — brique de base des filtres. Composé : Select + Trigger + Content + Item." } },
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56" aria-label="Plateforme"><SelectValue placeholder="Choisir une plateforme" /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Plateformes</SelectLabel>
          <SelectItem value="twitch">Twitch</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
export default meta;
type S = StoryObj<typeof Select>;

/** Exploration libre (`disabled`). */
export const Playground: S = {};

/** État désactivé (identité verrouillée). */
export const Disabled: S = { args: { disabled: true }, argTypes: { disabled: { control: false } } };

/** Test : ouvrir → choisir YouTube → le trigger reflète la sélection. */
export const OuvertureSelection: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("combobox");
    await userEvent.click(trigger);
    const option = await screen.findByRole("option", { name: /youtube/i });
    await userEvent.click(option);
    await waitFor(() => expect(trigger).toHaveTextContent(/youtube/i));
  },
};
