import type { Meta, StoryObj } from "@storybook/react-vite";
import SectionHeader from "@/components/SectionHeader";

/**
 * SectionHeader — l'en-tête d'une section DANS une page (4×). Deux alignements :
 * centré (sections marketing/landing d'app) ou à gauche (blocs de contenu).
 * Distinct du PageHeader (h1 de page) : ici c'est un h2 de section.
 */
const meta: Meta<typeof SectionHeader> = {
  title: "Patterns/SectionHeader",
  component: SectionHeader,
  parameters: { docs: { description: { component: "SectionHeader — l'en-tête d'une section DANS une page (4×). Deux alignements : centré (sections marketing/landing d'app) ou à gauche (blocs de contenu)." } },  layout: "padded" },
};
export default meta;
type S = StoryObj<typeof SectionHeader>;

export const Gauche: S = {
  args: {
    align: "left",
    label: "Réseaux",
    title: "Tes plateformes connectées",
    description: "Gère les connexions et les publications automatiques.",
  },
};

export const Centre: S = {
  args: {
    align: "center",
    label: "StreamScore",
    title: "Une note, trois piliers",
    description: "Régularité, engagement et progression, résumés sur 100.",
  },
};
