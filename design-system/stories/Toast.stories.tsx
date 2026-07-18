import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

/**
 * Toast (Radix) — l'autre système de notification du repo, à base d'objet
 * `toast({ title, description })` + <Toaster /> monté à la racine. Coexiste avec
 * Sonner ; à terme un DS n'en garde qu'un — ici on documente les deux tels quels.
 */
const meta: Meta<typeof Toaster> = {
  title: "Primitives/Toast",
  component: Toaster,
  parameters: { docs: { description: { component: "Toast (Radix) — l'autre système de notification du repo, à base d'objet toast({ title, description }) + <Toaster /> monté à la racine. Coexiste avec Sonner ; à terme un DS n'en garde qu'un — ici on documente les deux tels quels." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Toaster>;

export const Notification: S = {
  render: () => (
    <>
      <Button
        variant="outline"
        onClick={() =>
          toast({ title: "Clip publié", description: "Visible sur ta chaîne Twitch." })
        }
      >
        Publier
      </Button>
      <Toaster />
    </>
  ),
  // Comportement : le clic empile un toast (porté → screen).
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /publier/i }));
    await waitFor(() =>
      expect(screen.getByText(/clip publié/i)).toBeInTheDocument(),
    );
  },
};
