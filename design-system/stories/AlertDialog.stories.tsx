import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * AlertDialog — une confirmation BLOQUANTE pour action destructive (supprimer un
 * clip). Différent du Dialog : deux issues explicites (Annuler / Confirmer), pas
 * de fermeture au clic extérieur. Prévention des erreurs (heuristique Nielsen 5).
 */
const meta: Meta<typeof AlertDialog> = {
  title: "Primitives/AlertDialog",
  component: AlertDialog,
  parameters: { controls: { disable: true }, docs: { description: { component: "AlertDialog — une confirmation BLOQUANTE pour action destructive (supprimer un clip). Différent du Dialog : deux issues explicites (Annuler / Confirmer), pas de fermeture au clic extérieur." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof AlertDialog>;

export const Suppression: S = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Supprimer le clip</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce clip ?</AlertDialogTitle>
          <AlertDialogDescription>
            Action définitive. Le clip et ses variantes seront perdus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  // Comportement : fermé → clic ouvre l'alerte → Annuler la referme.
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole("alertdialog")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /supprimer le clip/i }));
    const dialog = await screen.findByRole("alertdialog");
    await expect(dialog).toHaveTextContent(/supprimer ce clip/i);
    await userEvent.click(screen.getByRole("button", { name: /annuler/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};
