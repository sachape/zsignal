import { createContext, useCallback, useContext, useState, type CSSProperties, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuthForm from "@/components/auth/AuthForm";

// Force the auth modal into the editorial site palette: light surfaces + an
// ink (near-black) primary instead of lime, so the CTA matches the ElevenLabs
// marketing site. Scoped to the modal subtree via inline CSS vars.
const EDITORIAL_VARS = {
  "--primary": "20 14% 4%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "20 14% 4%",
} as CSSProperties;

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
        <DialogContent
          className="light max-w-sm gap-5 rounded-2xl border-el-hairline bg-el-card p-7 text-el-ink sm:max-w-sm"
          style={EDITORIAL_VARS}
        >
          <DialogHeader className="space-y-3">
            <div className="mx-auto">
              <span className="font-el-sans text-[18px] font-semibold tracking-[-0.02em] text-el-ink">
                streamnco
              </span>
            </div>
            <DialogTitle className="text-center font-el-display text-[22px] font-light tracking-[-0.01em] text-el-ink">
              {opts.mode === "login"
                ? "Connecte-toi à Streamnco"
                : "Crée ton compte Streamnco"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Crée ton compte Streamnco pour sauvegarder ta progression. Tu pourras connecter Twitch juste après.
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
