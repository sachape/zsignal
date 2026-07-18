import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter,
  SheetTitle, SheetDescription, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Sheet — un panneau latéral (filtres avancés, détail d'un clip) qui glisse
 * depuis un bord sans quitter la page. Composé : Trigger + Content (+ Header/Footer).
 */
const meta: Meta<typeof Sheet> = {
  title: "Primitives/Sheet",
  component: Sheet,
  parameters: { controls: { disable: true }, docs: { description: { component: "Sheet — un panneau latéral (filtres avancés, détail d'un clip) qui glisse depuis un bord sans quitter la page. Composé : Trigger + Content (+ Header/Footer)." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Sheet>;

export const PanneauLateral: S = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Filtres avancés</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filtres avancés</SheetTitle>
          <SheetDescription>Affine la liste des clips détectés.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Appliquer</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  // Comportement : fermé → clic ouvre le panneau → Échap le referme.
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /filtres avancés/i }));
    const panel = await screen.findByRole("dialog");
    await expect(panel).toHaveTextContent(/affine la liste des clips/i);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
