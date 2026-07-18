import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { StreamCoinsDialogProvider } from "@/contexts/StreamCoinsDialogContext";

/**
 * Décorateur des stories du CATALOGUE. Enveloppe les composants feature dans les
 * providers de l'app (Auth + modales). Ceux-ci tapent Supabase au montage — le
 * client est mocké (.storybook/mocks/supabase.ts) donc aucun réseau. QueryClient,
 * Router et Tooltip viennent déjà du preview global.
 *
 * Réservé au catalogue (dev only) : le DS n'a pas besoin de ces providers, et
 * les charger partout alourdit/instabilise le smoke-test navigateur.
 */
export const withApp = (Story: () => ReactNode) => (
  <AuthProvider>
    <AuthModalProvider>
      <StreamCoinsDialogProvider>
        <Story />
      </StreamCoinsDialogProvider>
    </AuthModalProvider>
  </AuthProvider>
);
