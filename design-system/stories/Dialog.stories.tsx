import type { Meta, StoryObj } from "@storybook/react-vite";
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
  parameters: { layout: "centered" },
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
