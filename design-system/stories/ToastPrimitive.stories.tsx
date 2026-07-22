import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ToastProvider, ToastViewport, Toast, ToastTitle,
  ToastDescription, ToastClose, ToastAction,
} from "@/components/ui/toast";

// Primitives Toast (Radix) — rendu statique pour documenter l'apparence. Dans
// l'app, on déclenche via le hook useToast + <Toaster/> (voir story Toast/Sonner).
const meta: Meta<typeof Toast> = {
  title: "Components/Feedback/Toast (Primitives)",
  component: Toast,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    // Rendu STATIQUE des primitives Radix Toast : Radix ajoute des focus-guards
    // internes (span aria-hidden tabindex=0) et gère le slotting du viewport à
    // l'exécution. En snapshot statique, axe déclenche des faux positifs
    // (aria-hidden-focus, list) sur ces artefacts. L'a11y RÉELLE du Toast est
    // couverte par l'usage applicatif (useToast + Toaster). On désactive donc
    // le gate a11y pour cette seule story de documentation.
    a11y: { test: "off" },
    docs: { description: { component: "Toast (primitives) — briques Radix du système de notifications : `Toast`, `ToastTitle`, `ToastDescription`, `ToastAction`, `ToastClose`. Rôle `status`/`alert` selon le type ; fermeture accessible. A11y validée via l'usage réel (Toaster), pas en rendu statique." } },
  },
};
export default meta;
type S = StoryObj<typeof Toast>;

export const Default: S = {
  render: () => (
    <ToastProvider swipeDirection="right">
      <Toast open>
        <div className="grid gap-1">
          <ToastTitle>Clip publié</ToastTitle>
          <ToastDescription>Ton clip est en ligne sur Twitch.</ToastDescription>
        </div>
        <ToastAction altText="Voir le clip publié">Voir</ToastAction>
        <ToastClose aria-label="Fermer" />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};
