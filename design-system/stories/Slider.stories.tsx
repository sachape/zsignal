import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "@/components/ui/slider";

/**
 * Slider — un réglage continu (seuil, durée). La piste et le curseur reprennent
 * les tokens (--primary sur la portion active).
 */
const meta: Meta<typeof Slider> = {
  title: "Primitives/Slider",
  component: Slider,
  parameters: { docs: { description: { component: "Slider — un réglage continu (seuil, durée). La piste et le curseur reprennent les tokens (--primary sur la portion active)." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Slider>;

export const Seuil: S = {
  render: () => <Slider defaultValue={[60]} max={100} step={1} className="w-72" />,
};
