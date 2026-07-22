import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof AlertDialog> = {
  title: "Components/Overlays/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  args: { defaultOpen: false, onConfirm: fn() },
  argTypes: {
    ...common("open", "onOpenChange", "children"),
    defaultOpen: { control: "boolean", description: "Ouvert au montage (non contrôlé).", table: { category: "State" } },
    onConfirm: { control: false, description: "Callback de confirmation (test).", table: { category: "Events" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "AlertDialog — confirmation BLOQUANTE pour action destructive. Deux issues explicites (Annuler / Confirmer), pas de fermeture au clic extérieur." } },
  },
  render: ({ defaultOpen, onConfirm }: any) => (
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogTrigger asChild><Button variant="destructive">Supprimer le clip</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce clip ?</AlertDialogTitle>
          <AlertDialogDescription>Action définitive. Le clip et ses variantes seront perdus.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
export default meta;
type S = StoryObj<typeof AlertDialog>;

/** Exploration libre (`defaultOpen`). */
export const Playground: S = {};

/** Test : ouvrir → Annuler referme sans confirmer. */
export const Annulation: S = {
  parameters: { controls: { disable: true } },
  play: async ({ args, canvas, userEvent }: any) => {
    await userEvent.click(canvas.getByRole("button", { name: /supprimer le clip/i }));
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: /annuler/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** Test : ouvrir → Confirmer déclenche l'action et referme. */
export const Confirmation: S = {
  parameters: { controls: { disable: true } },
  play: async ({ args, canvas, userEvent }: any) => {
    await userEvent.click(canvas.getByRole("button", { name: /supprimer le clip/i }));
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: /^supprimer$/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};
