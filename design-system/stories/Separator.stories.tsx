import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@/components/ui/separator";

/**
 * Separator — une séparation discrète entre groupes. Fin, couleur --border :
 * il structure sans crier (cf. « les bordures chuchotent »).
 */
const meta: Meta<typeof Separator> = {
  title: "Primitives/Separator",
  component: Separator,
  parameters: { docs: { description: { component: "Separator — une séparation discrète entre groupes. Fin, couleur --border : il structure sans crier." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Separator>;

export const Horizontal: S = {
  render: () => (
    <div className="w-72 text-sm">
      <p className="pb-3">Clips détectés</p>
      <Separator />
      <p className="pt-3 text-muted-foreground">3 sur ton dernier live</p>
    </div>
  ),
};

export const Vertical: S = {
  render: () => (
    <div className="flex h-6 items-center gap-3 text-sm text-muted-foreground">
      <span>Twitch</span>
      <Separator orientation="vertical" />
      <span>YouTube</span>
      <Separator orientation="vertical" />
      <span>TikTok</span>
    </div>
  ),
};
