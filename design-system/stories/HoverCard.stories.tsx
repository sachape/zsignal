import type { Meta, StoryObj } from "@storybook/react-vite";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof HoverCard> = {
  title: "Components/Overlays/Hover Card",
  component: HoverCard,
  tags: ["autodocs"],
  argTypes: {
    ...common("open", "defaultOpen", "onOpenChange", "children"),
    openDelay: prop("Temps de survol avant ouverture, en millisecondes. Trop court, la carte devient intrusive.", { control: "number", category: CAT.state, defaultValue: "700" }),
    closeDelay: prop("Délai avant fermeture après la sortie du pointeur — laisse le temps d'atteindre la carte.", { control: "number", category: CAT.state, defaultValue: "300" }),
  },
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
