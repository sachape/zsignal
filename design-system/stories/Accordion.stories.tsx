import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

/**
 * Accordion — replier des sections (FAQ, détails d'un rapport). Composé :
 * Accordion + Item + Trigger + Content. Réduit la charge cognitive : on ne
 * montre que ce que l'utilisateur ouvre.
 */
const meta: Meta<typeof Accordion> = {
  title: "Primitives/Accordion",
  component: Accordion,
  // "padded" et pas "centered" : un accordéon change de hauteur en s'ouvrant ;
  // centré, tout le bloc se re-centre verticalement à chaque clic (effet « ça
  // saute »). Aligné en haut, l'ouverture pousse simplement vers le bas.
  parameters: { docs: { description: { component: "Accordion — replier des sections (FAQ, détails d'un rapport). Composé : Accordion + Item + Trigger + Content." } },  layout: "padded" },
};
export default meta;
type S = StoryObj<typeof Accordion>;

export const FAQ: S = {
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="a">
        <AccordionTrigger>Comment est calculé le StreamScore ?</AccordionTrigger>
        <AccordionContent>
          Un mélange de régularité, d'engagement et de progression, normalisé sur 100.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Puis-je republier un clip ?</AccordionTrigger>
        <AccordionContent>Oui, depuis le menu d'actions du clip.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  // Comportement : contenu masqué → cliquer le trigger le révèle.
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByText(/normalisé sur 100/i)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /streamscore/i }));
    await waitFor(() =>
      expect(canvas.getByText(/normalisé sur 100/i)).toBeVisible(),
    );
  },
};
