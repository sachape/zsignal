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

type OpenAuthModalArg = OpenAuthModalOptions | "signup" | "login";

interface AuthModalContextValue {
  openAuthModal: (opts?: OpenAuthModalArg) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [opts, setOpts] = useState<OpenAuthModalOptions>({});

  const openAuthModal = useCallback((next?: OpenAuthModalArg) => {
    const normalized: OpenAuthModalOptions =
      typeof next === "string" ? { mode: next } : next ?? {};
    setOpts(normalized);
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
                Streamnco
              </span>
            </div>
            <DialogTitle className="text-center text-base">
              {opts.mode === "login"
                ? "Connecte-toi à Streamnco"
                : "Crée ton compte Streamnco"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Crée ton compte Streamnco pour sauvegarder ton diagnostic. Tu pourras connecter Twitch juste après.
            </DialogDescription>
          </DialogHeader>
          <AuthForm
            redirectTo={opts.redirectTo ?? "/dashboard"}
            pendingChannel={opts.pendingChannel}
            contextText={opts.contextText}
            initialMode={opts.mode}
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
