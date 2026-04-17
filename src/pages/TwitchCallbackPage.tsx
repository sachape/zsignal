import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, XCircle, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

    const timer = setTimeout(() => {
      navigate("/connect-twitch?connected=true", { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, navigate]);

  return (
    <AppShell>
      <PageContainer size="sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            {state === "processing" && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Connexion en cours…
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    On finalise la liaison avec Twitch.
                  </p>
                </div>
              </>
            )}

            {state === "cancelled" && (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
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
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
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

            {/* unused but keeps icon import non-tree-shaken */}
            <CheckCircle2 className="hidden" />
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default TwitchCallbackPage;
