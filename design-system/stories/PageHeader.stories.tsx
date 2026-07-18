import type { Meta, StoryObj } from "@storybook/react-vite";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof PageHeader> = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  args: {
    eyebrow: "Studio",
    title: "Clips",
    description: "Les meilleurs moments de tes lives, prêts à publier.",
  },
  argTypes: {
    title: { control: "text", description: "Titre H1 de la page.", table: { category: "Content" } },
    eyebrow: { control: "text", description: "Sur-titre discret au-dessus du H1.", table: { category: "Content" } },
    description: { control: "text", description: "Sous-titre.", table: { category: "Content" } },
    avatarLogin: { control: "text", description: "Active le bloc identité chaîne (@login + fallback initiales).", table: { category: "Content" } },
    avatarUrl: { control: "text", description: "URL de l'avatar chaîne.", table: { category: "Content" } },
    action: { control: false, description: "Zone d'action à droite (ReactNode).", table: { category: "Advanced" } },
    badges: { control: false, description: "Badges d'identité (live / partner…).", table: { category: "Advanced" } },
  },
  parameters: {
    layout: "padded",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "PageHeader — en-tête standard d'une page produit (pattern le plus utilisé). UNE source de vérité pour la hiérarchie de titre." } },
  },
};
export default meta;
type S = StoryObj<typeof PageHeader>;

/** Exploration libre. */
export const Playground: S = {};

/** Use case : en-tête simple avec action. */
export const Simple: S = {
  args: { action: <Button>Générer des clips</Button> },
};

/** Use case : bloc identité chaîne (avatar + @login + badges). */
export const AvecIdentite: S = {
  args: {
    eyebrow: undefined,
    title: "tonpseudo",
    avatarLogin: "tonpseudo",
    avatarUrl: null,
    badges: [
      { label: "Live", variant: "destructive" },
      { label: "Partner", variant: "accent" },
    ],
    description: "Dernier live il y a 2 h · 1 240 spectateurs de pointe",
  },
};
