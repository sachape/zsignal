import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeTwitchCallback, consumePendingTeaserId } from "@/services/twitchOAuth";
import { onboardingFlags } from "@/services/onboardingFlags";

type CallbackState = "processing" | "error" | "cancelled";

const PROGRESS_STEPS = [
  "Connexion à Twitch…",
  "Récupération de tes données récentes…",
  "Enrichissement de ton diagnostic…",
];

const TwitchCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const [stepIndex, setStepIndex] = useState(0);

  // Honest, premium sequential loader. Steps advance every 900ms while the
  // OAuth exchange runs in parallel — we never block on the timer.
  useEffect(() => {
    if (state !== "processing") return;
    const t = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, 900);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    const error = searchParams.get("error");
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");

    if (error) {
      if (error === "access_denied") {
        setState("cancelled");
      } else {
        setState("error");
        setErrorMsg(searchParams.get("error_description") || error);
      }
      return;
    }

    if (!code || !stateParam) {
      setState("error");
      setErrorMsg("Paramètres OAuth manquants.");
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await completeTwitchCallback(code, stateParam);
      if (cancelled) return;
      if (result.success) {
        // Mark the durable flag immediately — server is still source of truth
        // for the actual connection, but this drives the welcome UX.
        onboardingFlags.markTwitchConnected();

        // Reconcile with the teaser diagnostic if we came from there.
        const teaserId = consumePendingTeaserId();
        const target = teaserId
          ? `/result?teaser=${encodeURIComponent(teaserId)}&from=onboarding`
          : `/result?from=onboarding`;

        // replace: true so the back button doesn't return to the callback URL.
        navigate(target, { replace: true });
      } else {
        setState("error");
        setErrorMsg(result.error || "Erreur lors de la connexion.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <AppShell>
      <PageContainer size="sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            {state === "processing" && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {PROGRESS_STEPS[stepIndex]}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    On finalise ton diagnostic enrichi.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {PROGRESS_STEPS.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 w-6 rounded-full transition-colors ${
                          i <= stepIndex ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {state === "cancelled" && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Connexion annulée
                  </h2>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Tu as refusé l'autorisation Twitch. Pas de souci — tu peux
                    réessayer quand tu veux.
                  </p>
                </div>
                <Button onClick={() => navigate("/connect-twitch")} className="mt-2">
                  Retour
                </Button>
              </>
            )}

            {state === "error" && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Erreur de connexion
                  </h2>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {errorMsg ||
                      "Une erreur est survenue lors de la connexion avec Twitch."}
                  </p>
                </div>
                <Button onClick={() => navigate("/connect-twitch")} className="mt-2">
                  Réessayer
                </Button>
              </>
            )}

          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default TwitchCallbackPage;
