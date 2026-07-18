import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

/**
 * Tooltip — une précision au survol (raccourci, unité). Jamais pour une info
 * indispensable (elle disparaît au clic / mobile). Composé : Trigger + Content.
 */
const meta: Meta<typeof Tooltip> = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  parameters: { controls: { disable: true }, docs: { description: { component: "Tooltip — une précision au survol (raccourci, unité). Jamais pour une info indispensable (elle disparaît au clic / mobile)." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Tooltip>;

export const AuSurvol: S = {
  // delayDuration=0 : sinon Radix attend 700 ms avant d'afficher (flaky en test).
  render: () => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">StreamScore</Button>
        </TooltipTrigger>
        <TooltipContent>Note globale de ta chaîne, sur 100.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  // Comportement : le survol révèle le contenu (porté → screen).
  // Radix rend le texte 2× (tooltip visible + copie cachée pour lecteurs
  // d'écran) → getAllByText, pas getByText qui jetterait sur le multi-match.
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button", { name: /streamscore/i }));
    await waitFor(() =>
      expect(screen.getAllByText(/note globale de ta chaîne/i).length).toBeGreaterThan(0),
    );
  },
};
