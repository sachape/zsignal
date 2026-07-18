import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Dialog — les modales (15×). Composé : Dialog + Trigger + Content + Header +
 * Footer. Ouvert par défaut pour le montrer (portail dans #modal-root).
 */
const meta: Meta<typeof Dialog> = {
  title: "Primitives/Dialog",
  component: Dialog,
  parameters: { docs: { description: { component: "Dialog — les modales (15×). Composé : Dialog + Trigger + Content + Header + Footer." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Dialog>;

export const Confirmation: S = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline">Ouvrir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publier les 3 clips ?</DialogTitle>
          <DialogDescription>
            Ils partiront sur les plateformes connectées. Tu peux annuler après coup.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost">Annuler</Button>
          <Button>Publier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** Comportement : fermé → clic sur le trigger l'ouvre → Échap le referme. */
export const OuvertureFermeture: S = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Ouvrir la confirmation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publier les 3 clips ?</DialogTitle>
          <DialogDescription>Tu peux annuler après coup.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, userEvent }) => {
    // Fermé au départ : aucun dialog dans le DOM.
    await expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /ouvrir la confirmation/i }));
    // Le contenu est porté dans #modal-root (portail) → screen.
    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toHaveTextContent(/publier les 3 clips/i);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
