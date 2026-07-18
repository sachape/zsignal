import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Film } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * EmptyState — l'état vide « premium » (2×), réutilisé sur les pages de création
 * / bibliothèque. Répond aux 3 questions d'un bon état vide : ce que c'est,
 * pourquoi c'est utile, quoi faire ensuite (cf. UX writing — états vides).
 */
const meta: Meta<typeof EmptyState> = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof EmptyState>;

export const AucunClip: S = {
  render: (args) => (
    <div className="w-[520px]">
      <EmptyState {...args} />
    </div>
  ),
  args: {
    icon: Film,
    title: "Aucun clip pour l'instant",
    description:
      "Lance une génération sur ton dernier live : on repère les meilleurs moments et on en fait des clips prêts à publier.",
    ctaLabel: "Générer des clips",
    ctaOnClick: fn(),
  },
  // Comportement : le CTA déclenche l'action passée.
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText(/aucun clip pour l'instant/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /générer des clips/i }));
    await expect(args.ctaOnClick).toHaveBeenCalledTimes(1);
  },
};
