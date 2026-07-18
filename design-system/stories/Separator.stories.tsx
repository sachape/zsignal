import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@/components/ui/separator";
import { lock } from "./_lockControls";

const meta: Meta<typeof Separator> = {
  title: "Primitives/Separator",
  component: Separator,
  tags: ["autodocs"],
  args: { orientation: "horizontal" },
  argTypes: {
    orientation: {
      control: "inline-radio", options: ["horizontal", "vertical"],
      description: "Sens du trait.", table: { category: "Layout", defaultValue: { summary: "horizontal" } },
    },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Separator — séparation discrète entre groupes. Fin, couleur --border : il structure sans crier." } },
  },
};
export default meta;
type S = StoryObj<typeof Separator>;

export const Horizontal: S = {
  args: { orientation: "horizontal" },
  argTypes: lock("orientation"),
  render: (args) => (
    <div className="w-72 text-sm">
      <p className="pb-3">Clips détectés</p>
      <Separator {...args} />
      <p className="pt-3 text-muted-foreground">3 sur ton dernier live</p>
    </div>
  ),
};

export const Vertical: S = {
  args: { orientation: "vertical" },
  argTypes: lock("orientation"),
  render: (args) => (
    <div className="flex h-6 items-center gap-3 text-sm text-muted-foreground">
      <span>Twitch</span>
      <Separator {...args} />
      <span>YouTube</span>
      <Separator {...args} />
      <span>TikTok</span>
    </div>
  ),
};
