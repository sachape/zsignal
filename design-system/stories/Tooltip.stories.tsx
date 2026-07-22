import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { expect, screen, waitFor } from "storybook/test";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { common, prop, CAT } from "./_argTypes";

// Args = les props du composant + celles que la story pilote sur TooltipContent.
// Dériver de ComponentProps garde `component: Tooltip` assignable ET rend les
// props du Root (delayDuration…) connues du typage des argTypes.
type Args = ComponentProps<typeof Tooltip> & {
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
};

const meta: Meta<Args> = {
  title: "Components/Overlays/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: { side: "top", align: "center" },
  argTypes: {
    ...common("open", "defaultOpen", "onOpenChange", "side", "align", "sideOffset"),
    delayDuration: prop(
      "Temps de survol avant apparition, en millisecondes. Trop court, l'infobulle devient parasite au passage du curseur.",
      { control: "number", category: CAT.state, defaultValue: "700" },
    ),
    disableHoverableContent: prop("Empêche de survoler l'infobulle elle-même : elle se ferme dès que le curseur quitte la cible.", { control: "boolean", category: CAT.advanced }),
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Tooltip — précision au survol (raccourci, unité). Jamais pour une info indispensable (disparaît au clic / mobile)." } },
  },
  // Ouvert par défaut : on VOIT le résultat de side/align en direct.
  render: (args) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip open>
        <TooltipTrigger asChild><Button variant="outline">StreamScore</Button></TooltipTrigger>
        <TooltipContent side={args.side} align={args.align}>Note globale de ta chaîne, sur 100.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
export default meta;
type S = StoryObj<Args>;

/** Exploration libre du placement (`side`, `align`). */
export const Playground: S = {};

/** Test : le survol révèle le contenu. */
export const AuSurvol: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="outline">StreamScore</Button></TooltipTrigger>
        <TooltipContent>Note globale de ta chaîne, sur 100.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button", { name: /streamscore/i }));
    // Radix rend le texte 2× (visible + copie a11y) → getAllByText.
    await waitFor(() => expect(screen.getAllByText(/note globale de ta chaîne/i).length).toBeGreaterThan(0));
  },
};
