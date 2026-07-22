import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronsUpDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof Collapsible> = {
  title: "Components/Content & Structure/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  argTypes: {
    ...common("open", "defaultOpen", "onOpenChange", "disabled", "children", "className"),
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Collapsible — révèle ou masque une zone de contenu secondaire. Le trigger porte toujours un nom accessible (texte visible ou `aria-label`)." } },
  },
};
export default meta;
type S = StoryObj<typeof Collapsible>;

const Body = () => (
  <CollapsibleContent className="space-y-1 rounded-md border px-4 py-3 text-[14px] text-muted-foreground">
    <p>Durée : 0:42</p>
    <p>StreamScore : 87</p>
    <p>Plateforme : Twitch</p>
  </CollapsibleContent>
);

export const Default: S = {
  render: () => (
    <Collapsible className="w-[320px] space-y-2">
      <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-2">
        <span className="text-[14px] font-medium">Détails du clip</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Afficher les détails"><ChevronsUpDown /></Button>
        </CollapsibleTrigger>
      </div>
      <Body />
    </Collapsible>
  ),
};

export const DefaultOpen: S = {
  render: () => (
    <Collapsible defaultOpen className="w-[320px] space-y-2">
      <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-2">
        <span className="text-[14px] font-medium">Détails du clip</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Masquer les détails"><ChevronsUpDown /></Button>
        </CollapsibleTrigger>
      </div>
      <Body />
    </Collapsible>
  ),
};
