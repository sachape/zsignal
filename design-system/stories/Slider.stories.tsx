import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Slider } from "@/components/ui/slider";
import { lock } from "./_lockControls";

const meta: Meta<typeof Slider> = {
  title: "Components/Forms/Slider",
  component: Slider,
  tags: ["autodocs"],
  args: { defaultValue: [60], min: 0, max: 100, step: 1, disabled: false, "aria-label": "Réglage" },
  argTypes: {
    max: { control: { type: "number" }, table: { category: "Behavior" } },
    step: { control: { type: "number" }, table: { category: "Behavior" } },
    disabled: { control: "boolean", table: { category: "State" } },
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
