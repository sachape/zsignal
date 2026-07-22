import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Slider } from "@/components/ui/slider";
import { lock } from "./_lockControls";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof Slider> = {
  title: "Components/Forms/Slider",
  component: Slider,
  tags: ["autodocs"],
  args: { defaultValue: [60], min: 0, max: 100, step: 1, disabled: false, "aria-label": "Réglage" },
  argTypes: {
    ...common("disabled", "onValueChange", "className"),
    defaultValue: describe("Position initiale du curseur, en mode non contrôlé. Tableau : une entrée par poignée.", { control: false, category: CAT.state }),
    min: describe("Borne basse de la plage.", { control: "number", category: CAT.state, defaultValue: "0" }),
    max: describe("Borne haute de la plage.", { control: "number", category: CAT.state, defaultValue: "100" }),
    step: describe("Incrément entre deux positions atteignables, au clavier comme à la souris.", { control: "number", category: CAT.state, defaultValue: "1" }),
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Slider — réglage continu (seuil, durée). La portion active reprend le token --primary." } },
  },
  render: (args) => <Slider {...args} className="w-72" />,
};
export default meta;
type S = StoryObj<typeof Slider>;

export const Playground: S = {};
export const Disabled: S = { args: { disabled: true }, argTypes: lock("disabled") };

/** Test : la flèche clavier modifie la valeur (aria-valuenow). */
export const ValueChange: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const thumb = canvas.getByRole("slider");
    await expect(thumb).toHaveAttribute("aria-valuenow", "60");
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "61");
  },
};
