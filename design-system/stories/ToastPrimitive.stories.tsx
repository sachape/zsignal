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
    docs: { description: { component: "Toast (primitives) — briques Radix du système de notifications : `Toast`, `ToastTitle`, `ToastDescription`, `ToastAction`, `ToastClose`. Rôle `status`/`alert` selon le type ; fermeture accessible." } },
  },
};
export default meta;
type S = StoryObj<typeof Toast>;

export const Default: S = {
  render: () => (
    <ToastProvider>
      <div className="relative h-40 w-[380px]">
        <Toast open className="static">
          <div className="grid gap-1">
            <ToastTitle>Clip publié</ToastTitle>
            <ToastDescription>Ton clip est en ligne sur Twitch.</ToastDescription>
          </div>
          <ToastAction altText="Voir le clip publié">Voir</ToastAction>
          <ToastClose aria-label="Fermer" />
        </Toast>
      </div>
      <ToastViewport />
    </ToastProvider>
  ),
};
