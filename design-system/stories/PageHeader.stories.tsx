import type { Meta, StoryObj } from "@storybook/react-vite";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

/**
 * PageHeader — pattern métier le plus utilisé (25×) : l'en-tête standard d'une
 * page produit. UNE source de vérité pour la hiérarchie de titre. Variante riche
 * avec bloc d'identité chaîne (avatar + login + badges) pour les pages rapport.
 */
const meta: Meta<typeof PageHeader> = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  parameters: { docs: { description: { component: "PageHeader — pattern métier le plus utilisé (25×) : l'en-tête standard d'une page produit. UNE source de vérité pour la hiérarchie de titre." } },  layout: "padded" },
};
export default meta;
type S = StoryObj<typeof PageHeader>;

export const Simple: S = {
  args: {
    eyebrow: "Studio",
    title: "Clips",
    description: "Les meilleurs moments de tes lives, prêts à publier.",
    action: <Button>Générer des clips</Button>,
  },
};

/** Variante « identité chaîne » : avatar + @login + badges. */
export const AvecIdentite: S = {
  args: {
    title: "tonpseudo",
    avatarLogin: "tonpseudo",
    avatarUrl: null, // pas d'image → fallback initiales
    badges: [
      { label: "Live", variant: "destructive" },
      { label: "Partner", variant: "accent" },
    ],
    description: "Dernier live il y a 2 h · 1 240 spectateurs de pointe",
  },
};
