import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "@/components/ui/slider";
import { lock } from "./_lockControls";

const meta: Meta<typeof Slider> = {
  title: "Primitives/Slider",
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
