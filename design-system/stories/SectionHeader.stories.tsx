import type { Meta, StoryObj } from "@storybook/react-vite";
import SectionHeader from "@/components/SectionHeader";
import { lock } from "./_lockControls";

const meta: Meta<typeof SectionHeader> = {
  title: "Patterns/SectionHeader",
  component: SectionHeader,
  tags: ["autodocs"],
  args: {
    align: "left",
    label: "Réseaux",
    title: "Tes plateformes connectées",
    description: "Gère les connexions et les publications automatiques.",
  },
  argTypes: {
    align: {
      control: "inline-radio", options: ["left", "center"],
      description: "Alignement de la section.",
      table: { category: "Layout", defaultValue: { summary: "center" } },
    },
    label: { control: "text", description: "Sur-titre (chip/eyebrow).", table: { category: "Content" } },
    title: { control: "text", description: "Titre H2 de section.", table: { category: "Content" } },
    description: { control: "text", table: { category: "Content" } },
  },
  parameters: {
    layout: "padded",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "SectionHeader — en-tête d'une section DANS une page (H2). Distinct du PageHeader (H1 de page)." } },
  },
};
export default meta;
type S = StoryObj<typeof SectionHeader>;

/** Exploration libre. */
export const Playground: S = {};

/** Alignement gauche (blocs de contenu). */
export const Gauche: S = { args: { align: "left" }, argTypes: lock("align") };

/** Alignement centré (sections éditoriales). */
export const Centre: S = {
  args: { align: "center", label: "StreamScore", title: "Une note, trois piliers", description: "Régularité, engagement et progression, résumés sur 100." },
  argTypes: lock("align"),
};
