import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton — l'état de chargement (1–10 s) : on préfigure la forme du contenu
 * plutôt qu'un spinner, pour réduire la perception d'attente.
 */
const meta: Meta<typeof Skeleton> = {
  title: "Components/Feedback/Skeleton",
  component: Skeleton,
  parameters: { controls: { disable: true }, docs: { description: { component: "Skeleton — l'état de chargement (1–10 s) : on préfigure la forme du contenu plutôt qu'un spinner, pour réduire la perception d'attente." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Skeleton>;

export const CarteEnChargement: S = {
  render: () => (
    <div className="w-72 space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  ),
};
