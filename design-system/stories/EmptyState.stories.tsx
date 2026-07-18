import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Film } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

const meta: Meta<typeof EmptyState> = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: {
    icon: Film,
    title: "Aucun clip pour l'instant",
    description: "Lance une génération sur ton dernier live : on repère les meilleurs moments et on en fait des clips prêts à publier.",
    ctaLabel: "Générer des clips",
    ctaOnClick: fn(),
  },
  argTypes: {
    title: { control: "text", table: { category: "Content" } },
    description: { control: "text", table: { category: "Content" } },
    ctaLabel: { control: "text", description: "Libellé du bouton d'action principal.", table: { category: "Content" } },
    secondaryLabel: { control: "text", description: "Libellé d'une action secondaire.", table: { category: "Content" } },
    icon: { control: false, description: "Icône lucide (obligatoire).", table: { category: "Content" } },
    ctaOnClick: { control: false, table: { category: "Events" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "EmptyState — état vide « premium » : dit ce que c'est, pourquoi c'est utile, et quoi faire ensuite (CTA)." } },
  },
  render: (args) => <div className="w-[520px]"><EmptyState {...args} /></div>,
};
export default meta;
type S = StoryObj<typeof EmptyState>;

/** Exploration libre. */
export const Playground: S = {};

/** Use case : bibliothèque de clips vide, avec CTA de génération. */
export const AucunClip: S = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText(/aucun clip pour l'instant/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /générer des clips/i }));
    await expect(args.ctaOnClick).toHaveBeenCalledTimes(1);
  },
};
