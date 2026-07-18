import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Toaster, toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

/**
 * Sonner — les notifications éphémères (toasts) déclenchées par du code :
 * `toast("…")`. Le <Toaster /> est monté une fois (ici dans la story ; dans
 * l'app, à la racine). Feedback système non bloquant (heuristique Nielsen 1).
 */
const meta: Meta<typeof Toaster> = {
  title: "Primitives/Sonner",
  component: Toaster,
  parameters: { controls: { disable: true }, docs: { description: { component: "Sonner — les notifications éphémères (toasts) déclenchées par du code : toast(\"…\"). Le <Toaster /> est monté une fois (ici dans la story ; dans l'app, à la racine)." } },  layout: "centered" },
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
