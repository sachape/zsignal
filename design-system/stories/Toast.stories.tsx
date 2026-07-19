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
  title: "Components/Feedback/Toast",
  component: Toaster,
  parameters: {
    controls: { disable: true },
    docs: { description: { component: "Toast (Radix) — l'autre système de notification du repo, à base d'objet toast({ title, description }) + <Toaster /> monté à la racine. Coexiste avec Sonner ; à terme un DS n'en garde qu'un — ici on documente les deux tels quels." } },
    layout: "centered",
    // FAUX POSITIFS de @radix-ui/react-toast — markup interne de la LIBRAIRIE,
    // pas notre code, donc non corrigés (cf. rapport a11y). On les neutralise
    // pour ne pas rougir la CI, en documentant précisément pourquoi :
    //  - list / aria-allowed-role : Radix rend chaque toast en <li role="status">
    //    directement sous <ol> (choix a11y assumé de Radix pour aria-live).
    //  - aria-hidden-focus : Radix ajoute des focus-guards <span aria-hidden
    //    tabindex="0"> autour du viewport (gestion du focus au swipe/clavier).
    // Le bouton de fermeture, lui, ÉTAIT notre bug → corrigé (sr-only "Fermer").
    a11y: {
      config: {
        rules: [
          { id: "list", enabled: false },
          { id: "aria-allowed-role", enabled: false },
          { id: "aria-hidden-focus", enabled: false },
        ],
      },
    },
  },
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
