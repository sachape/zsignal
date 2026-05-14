import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/services/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

const translateError = (msg: string): string => {
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
  const { signUp, signIn } = useAuth();
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
          analytics.signupCompleted(email);
          localStorage.setItem(`streamnco:signup_tracked:email:${email}`, "1");
          setSuccess(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(translateError(error.message));
        } else {
          analytics.signinCompleted(email);
          onSuccess?.();
          navigate(redirectTo);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + redirectTo,
        },
      });
      if (error) {
        setError("La connexion Google a échoué. Réessaie.");
        setGoogleLoading(false);
      }
      // On success: browser redirects automatically to Google then back to redirectTo
    } catch {
      setError("La connexion Google a échoué. Réessaie.");
      setGoogleLoading(false);
    }
  };

  if (success && showInlineSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
          <Mail className="h-4 w-4 text-primary" />
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
            <p className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              Chaîne en attente d'analyse&nbsp;:{" "}
              <span className="font-semibold">{pendingChannel}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex rounded-md bg-muted p-1">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "signup" ? "Créer un compte" : "Se connecter"}
          </button>
        ))}
      </div>

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
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
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
            className="font-medium text-primary hover:underline"
          >
            Crée-en un
          </button>
        )}
      </p>
    </div>
  );
};

export default AuthForm;
