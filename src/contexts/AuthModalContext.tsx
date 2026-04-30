import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";

interface OpenAuthModalOptions {
  redirectTo?: string;
  pendingChannel?: string | null;
  contextText?: string;
  /** Force initial mode of the auth form (defaults to "signup"). */
  mode?: "signup" | "login";
}

interface AuthModalContextValue {
  openAuthModal: (opts?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [opts, setOpts] = useState<OpenAuthModalOptions>({});

  const openAuthModal = useCallback((next?: OpenAuthModalOptions) => {
    setOpts(next ?? {});
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm gap-5 rounded-lg p-6 sm:max-w-sm">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                StreamPulse
              </span>
            </div>
            <DialogTitle className="text-center text-base">
              Bienvenue
            </DialogTitle>
            <DialogDescription className="sr-only">
              Connecte-toi ou crée un compte pour continuer.
            </DialogDescription>
          </DialogHeader>
          <AuthForm
            redirectTo={opts.redirectTo ?? "/dashboard"}
            pendingChannel={opts.pendingChannel}
            contextText={opts.contextText}
            onSuccess={closeAuthModal}
          />
        </DialogContent>
      </Dialog>
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
};
