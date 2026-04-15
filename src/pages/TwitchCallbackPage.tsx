import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";

type CallbackState = "processing" | "error" | "cancelled";

const TwitchCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const code = searchParams.get("code");

    if (error) {
      if (error === "access_denied") {
        setState("cancelled");
      } else {
        setState("error");
        setErrorMsg(error);
      }
      return;
    }

    if (!code) {
      setState("error");
      setErrorMsg("Code d'autorisation manquant.");
      return;
    }

    // TODO: When live credentials are available, call:
    // completeTwitchCallback(code).then(...)
    // For now, simulate processing then redirect with success
    const timer = setTimeout(() => {
      navigate("/connect-twitch?connected=true", { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, navigate]);

  return (
    <AppShell>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center"
        >
          {state === "processing" && (
            <>
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
              <h2 className="text-lg font-bold text-foreground">Connexion en cours…</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                On finalise la liaison avec Twitch.
              </p>
            </>
          )}

          {state === "cancelled" && (
            <>
              <XCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Connexion annulée</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu as refusé l'autorisation Twitch. Pas de souci — tu peux réessayer quand tu veux.
              </p>
              <button
                onClick={() => navigate("/connect-twitch")}
                className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Retour
              </button>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
              <h2 className="text-lg font-bold text-foreground">Erreur de connexion</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {errorMsg || "Une erreur est survenue lors de la connexion avec Twitch."}
              </p>
              <button
                onClick={() => navigate("/connect-twitch")}
                className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Réessayer
              </button>
            </>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
};

export default TwitchCallbackPage;
