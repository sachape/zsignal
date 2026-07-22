import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Toaster, toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { common, prop, CAT } from "./_argTypes";

/**
 * Sonner — les notifications éphémères (toasts) déclenchées par du code :
 * `toast("…")`. Le <Toaster /> est monté une fois (ici dans la story ; dans
 * l'app, à la racine). Feedback système non bloquant (heuristique Nielsen 1).
 */
const meta: Meta<typeof Toaster> = {
  title: "Components/Feedback/Sonner",
  component: Toaster,
  argTypes: {
    position: prop(
      "Coin d'apparition des toasts. Un seul par application : les notifications doivent toujours surgir au même endroit.",
      { control: "select", options: ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"], category: CAT.layout, defaultValue: "bottom-right" },
    ),
    duration: prop("Durée d'affichage en millisecondes avant disparition automatique.", { control: "number", category: CAT.state, defaultValue: "4000" }),
    closeButton: prop("Affiche une croix de fermeture — utile si les toasts portent du texte long.", { control: "boolean", category: CAT.appearance }),
    richColors: prop("Colore le toast selon son type (succès, erreur) au lieu du style neutre.", { control: "boolean", category: CAT.appearance }),
    expand: prop("Déplie la pile au survol au lieu de n'afficher que le dernier.", { control: "boolean", category: CAT.appearance }),
    theme: prop("Thème des toasts. Repris de next-themes par défaut.", { control: "inline-radio", options: ["light", "dark", "system"], defaultValue: "system" }),
  },
  parameters: { docs: { description: { component: "Sonner — les notifications éphémères (toasts) déclenchées par du code : toast(\"…\"). Le <Toaster /> est monté une fois (ici dans la story ; dans l'app, à la racine)." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Toaster>;

export const Notification: S = {
  render: () => (
    <>
      <Button onClick={() => toast.success("3 clips générés", { description: "Prêts dans ta galerie." })}>
        Terminer le rendu
      </Button>
      <Toaster />
    </>
  ),
  // Comportement : le clic fait apparaître un toast (porté → screen).
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /terminer le rendu/i }));
    await waitFor(() =>
      expect(screen.getByText(/3 clips générés/i)).toBeInTheDocument(),
    );
  },
};
