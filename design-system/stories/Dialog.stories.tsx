import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof Dialog> = {
  title: "Components/Overlays/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  args: { modal: true, defaultOpen: false },
  argTypes: {
    ...common("open", "defaultOpen", "onOpenChange", "modal", "children"),
    modal: { control: "boolean", description: "Rend l'arrière-plan inerte (voile bloquant).", table: { category: "State" } },
    defaultOpen: { control: "boolean", description: "Ouvert au montage (non contrôlé).", table: { category: "State" } },
    open: { control: false, description: "Ouverture contrôlée (piloter via onOpenChange).", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Dialog — modale non bloquante (fermeture au clic extérieur / Échap). Composé : Trigger + Content + Header + Footer." } },
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild><Button variant="outline">Ouvrir</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publier les 3 clips ?</DialogTitle>
          <DialogDescription>Ils partiront sur les plateformes connectées. Tu peux annuler après coup.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost">Annuler</Button>
          <Button>Publier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
export default meta;
type S = StoryObj<typeof Dialog>;

/** Exploration libre (`modal`, `defaultOpen`). */
export const Playground: S = {};

/** Ouvert au montage pour montrer le contenu. */
export const Ouvert: S = { args: { defaultOpen: true }, parameters: { controls: { disable: true } } };

/** Test : fermé → clic ouvre → Échap referme. */
export const OuvertureFermeture: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /^ouvrir$/i }));
    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toHaveTextContent(/publier les 3 clips/i);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
