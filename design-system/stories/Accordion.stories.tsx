import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

const items = [
  ["a", "Comment est calculé le StreamScore ?", "Un mélange de régularité, d'engagement et de progression, normalisé sur 100."],
  ["b", "Puis-je republier un clip ?", "Oui, depuis le menu d'actions du clip."],
] as const;

const meta: Meta<typeof Accordion> = {
  title: "Primitives/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  args: { type: "single", collapsible: true },
  argTypes: {
    type: {
      control: "inline-radio", options: ["single", "multiple"],
      description: "`single` = un seul panneau ouvert ; `multiple` = plusieurs.",
      table: { category: "Behavior", defaultValue: { summary: "single" } },
    },
    collapsible: {
      control: "boolean",
      description: "En mode single, autorise à tout refermer.",
      table: { category: "Behavior" },
      if: { arg: "type", eq: "single" },
    },
    disabled: { control: "boolean", description: "Désactive tout l'accordéon.", table: { category: "State" } },
  },
  // "padded" : un accordéon change de hauteur en s'ouvrant ; centré, tout se
  // re-centre à chaque clic. Aligné en haut, l'ouverture pousse vers le bas.
  parameters: {
    layout: "padded",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Accordion — replier des sections (FAQ, détails). Réduit la charge cognitive : on ne montre que ce que l'utilisateur ouvre." } },
  },
  render: (args) => (
    <Accordion {...args} className="w-96">
      {items.map(([v, q, a]) => (
        <AccordionItem key={v} value={v}>
          <AccordionTrigger>{q}</AccordionTrigger>
          <AccordionContent>{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};
export default meta;
type S = StoryObj<typeof Accordion>;

/** Exploration libre (bascule `type`, `collapsible`, `disabled`). */
export const Playground: S = {};

/** Mode `single` (identité verrouillée). */
export const Single: S = { args: { type: "single" }, argTypes: { type: { control: false } } };

/** Mode `multiple` : plusieurs panneaux ouverts à la fois. */
export const Multiple: S = { args: { type: "multiple" }, argTypes: { type: { control: false } } };

/** Use case FAQ + test d'ouverture/fermeture. */
export const FAQ: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByText(/normalisé sur 100/i)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /streamscore/i }));
    await waitFor(() => expect(canvas.getByText(/normalisé sur 100/i)).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: /streamscore/i }));
    await waitFor(() => expect(canvas.queryByText(/normalisé sur 100/i)).toBeNull());
  },
};
