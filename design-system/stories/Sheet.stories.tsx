import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter,
  SheetTitle, SheetDescription, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { common, describe, CAT } from "./_argTypes";

type Args = { side: "top" | "right" | "bottom" | "left" };

const meta: Meta<Args> = {
  title: "Components/Overlays/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  args: { side: "right" },
  argTypes: {
    ...common("open", "defaultOpen", "onOpenChange", "modal"),
    side: describe("Bord depuis lequel le panneau glisse.", { control: "inline-radio", options: ["top", "right", "bottom", "left"], category: CAT.layout, defaultValue: "right" }),
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Sheet — panneau latéral (filtres, détail) qui glisse depuis un bord sans quitter la page." } },
  },
  render: (args) => (
    <Sheet>
      <SheetTrigger asChild><Button variant="outline">Filtres avancés</Button></SheetTrigger>
      <SheetContent side={args.side}>
        <SheetHeader>
          <SheetTitle>Filtres avancés</SheetTitle>
          <SheetDescription>Affine la liste des clips détectés.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild><Button>Appliquer</Button></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
export default meta;
type S = StoryObj<Args>;

/** Exploration libre du bord (`side`). Clique « Filtres avancés » pour l'ouvrir. */
export const Playground: S = {};

/** Test : fermé → clic ouvre → Échap referme. */
export const OuvertureFermeture: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /filtres avancés/i }));
    const panel = await screen.findByRole("dialog");
    await expect(panel).toHaveTextContent(/affine la liste des clips/i);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
