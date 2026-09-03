import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AuthFormProps {
  /** Where to navigate after a successful login (email or Google). */
  redirectTo?: string;
  /** Called after a successful login so the parent (modal) can close. */
  onSuccess?: () => void;
  /** Pending channel username, displayed as context when set. */
  pendingChannel?: string | null;
  /** Optional intro text above the form. */
  contextText?: string;
  /** Hide the success screen behavior — useful inside modal flows. */
  showInlineSuccess?: boolean;
  /** Initial tab (defaults to "signup"). */
  initialMode?: "login" | "signup";
}

/** Supabase renvoie ce message quand le compte existe mais n'a jamais été confirmé. */
const isUnconfirmed = (msg: string) =>
  msg.includes("Email not confirmed") || msg.includes("email_not_confirmed");

const translateError = (msg: string): string => {
  if (isUnconfirmed(msg))
    return "Ton compte existe mais son adresse n'a pas encore été confirmée. Renvoie-toi le mail ci-dessous.";
  if (msg.includes("Invalid login credentials"))
    return "Email ou mot de passe incorrect.";
  if (msg.includes("already registered"))
    return "Un compte existe déjà avec cet email.";
  if (msg.includes("Password should be"))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  if (msg.includes("valid email")) return "Adresse email invalide.";
  return "Une erreur est survenue. Réessaie.";
};

const AuthForm = ({
  redirectTo = "/dashboard",
  onSuccess,
  pendingChannel,
  contextText = "Crée ton compte Streamnco pour sauvegarder ton diagnostic. Tu pourras connecter Twitch juste après.",
  showInlineSuccess = true,
  initialMode = "signup",
}: AuthFormProps) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  /** Le compte existe mais n'est pas confirmé : on propose le renvoi sous l'erreur. */
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);
  const { signUp, signIn, resendConfirmation } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          setError(translateError(error.message));
        } else {
          setSuccess(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setNeedsConfirmation(isUnconfirmed(error.message));
          setError(translateError(error.message));
        } else {
          onSuccess?.();
          navigate(redirectTo);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Décompte du délai avant un nouveau renvoi possible.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResendState("sending");
    const { error } = await resendConfirmation(email);
    if (error) {
      setResendState("error");
      return;
    }
    setResendState("sent");
    setCooldown(60);
  };

  /** Bloc de renvoi, partagé par l'écran de succès et l'erreur « non confirmé ». */
  const resendBlock = (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleResend}
        disabled={resendState === "sending" || cooldown > 0}
        className="text-xs font-medium text-primary-strong underline underline-offset-4 disabled:opacity-60 disabled:no-underline"
      >
        {resendState === "sending"
          ? "Envoi en cours…"
          : cooldown > 0
            ? `Renvoyer le mail (${cooldown} s)`
            : "Renvoyer le mail de confirmation"}
      </button>
      {resendState === "sent" && (
        <p className="text-xs text-muted-foreground">
          Mail renvoyé. Pense à regarder dans tes spams.
        </p>
      )}
      {resendState === "error" && (
        <p className="text-xs text-destructive">
          Le renvoi a échoué. Réessaie dans un moment ou écris-nous.
        </p>
      )}
    </div>
  );

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + redirectTo,
      });
      if (result.redirected) return;
      if (result.error) {
        setError("La connexion Google a échoué. Réessaie.");
        setGoogleLoading(false);
        return;
      }
      onSuccess?.();
      navigate(redirectTo);
    } catch {
      setError("La connexion Google a échoué. Réessaie.");
      setGoogleLoading(false);
    }
  };

  if (success && showInlineSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
          <Mail className="h-4 w-4 text-primary-strong" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">
            Vérifie ta boîte mail
          </h2>
          <p className="text-sm text-muted-foreground">
            Un lien de confirmation a été envoyé à{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
        {resendBlock}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(contextText || pendingChannel) && (
        <div className="space-y-2 text-center">
          {contextText && (
            <p className="text-sm text-muted-foreground">{contextText}</p>
          )}
          {pendingChannel && (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-strong">
              Chaîne en attente d'analyse&nbsp;:{" "}
              <span className="font-semibold">{pendingChannel}</span>
            </p>
          )}
        </div>
      )}

      <SegmentedControl
        value={mode}
        onValueChange={(v) => {
          setMode(v as "login" | "signup");
          setError(null);
        }}
        className="flex w-full bg-muted"
      >
        {(["signup", "login"] as const).map((m) => (
          <SegmentedControlItem key={m} value={m} className="flex-1">
            {m === "signup" ? "Créer un compte" : "Se connecter"}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.96h5.52c-.24 1.44-1.68 4.2-5.52 4.2-3.32 0-6.04-2.76-6.04-6.16s2.72-6.16 6.04-6.16c1.88 0 3.16.8 3.88 1.48l2.64-2.56C16.84 3.36 14.64 2.4 12 2.4 6.72 2.4 2.4 6.72 2.4 12s4.32 9.6 9.6 9.6c5.52 0 9.2-3.88 9.2-9.36 0-.64-.08-1.12-.16-1.64H12z"
              />
            </svg>
            Continuer avec Google
          </>
        )}
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          ou avec un email
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Mot de passe</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              className="pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
            {needsConfirmation && resendBlock}
          </div>
        )}

        <Button type="submit" variant="outline" disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {mode === "signup" ? "Créer mon compte" : "Se connecter"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "signup"
          ? "En créant un compte, tu acceptes nos conditions d'utilisation."
          : "Tu n'as pas de compte ? "}
        {mode === "login" && (
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="font-medium text-primary-strong hover:underline"
          >
            Crée-en un
          </button>
        )}
      </p>
    </div>
  );
};

export default AuthForm;
