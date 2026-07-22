import type { Meta, StoryObj } from "@storybook/react-vite";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof HoverCard> = {
  title: "Components/Overlays/Hover Card",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Hover Card — aperçu contextuel au survol d'un élément (profil, aperçu de lien). À réserver au pointeur : ne jamais y placer d'action essentielle (inaccessible au clavier / tactile)." } },
  },
};
export default meta;
type S = StoryObj<typeof HoverCard>;

export const Default: S = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@streamnco</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-1">
          <p className="text-[14px] font-semibold">Streamnco</p>
          <p className="text-[14px] text-muted-foreground">Analyse et génération de clips pour streamers Twitch.</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
