import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CreationCapacityDialog } from "@/components/CreationCapacityDialog";

/**
 * Global provider for the "Mes StreamCoins" dialog.
 *
 * Any component in the authenticated tree can call `openStreamCoinsDialog()`
 * to surface the balance + top-up flow without hard-navigating to /billing.
 * This is the preferred CTA target when a user hits an insufficient-credits
 * error inside a generation flow (Visual Studio, Clips, VOD import, panels).
 */
type StreamCoinsDialogContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const StreamCoinsDialogContext = createContext<StreamCoinsDialogContextValue | null>(null);

export function StreamCoinsDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <StreamCoinsDialogContext.Provider value={{ open, close, isOpen }}>
      {children}
      <CreationCapacityDialog open={isOpen} onOpenChange={setIsOpen} />
    </StreamCoinsDialogContext.Provider>
  );
}

/**
 * Safe hook: returns a no-op opener if the provider is not mounted
 * (e.g. public / unauthenticated routes) so callers never need to guard.
 */
export function useStreamCoinsDialog(): StreamCoinsDialogContextValue {
  const ctx = useContext(StreamCoinsDialogContext);
  if (!ctx) {
    return {
      open: () => {
        // Fallback: navigate to /billing when the dialog is not mounted.
        if (typeof window !== "undefined") window.location.assign("/billing");
      },
      close: () => {},
      isOpen: false,
    };
  }
  return ctx;
}
