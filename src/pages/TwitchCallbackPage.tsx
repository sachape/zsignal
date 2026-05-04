import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  completeTwitchCallback,
  consumePendingTeaserId,
  peekPendingTeaserId,
} from "@/services/twitchOAuth";
import { onboardingFlags } from "@/services/onboardingFlags";
import { supabase } from "@/integrations/supabase/client";
import { runAnalysis } from "@/services/analysisRunner";
import { bootstrapTwitchEventSub } from "@/services/twitchEventSubBootstrap";

type CallbackState = "processing" | "error" | "cancelled" | "enrichment_failed";

const PROGRESS_STEPS = [
  "On vérifie ta chaîne Twitch…",
  "On lit tes 30 derniers jours de stream…",
  "On calcule ton StreamScore et ton plan…",
];

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[TwitchCallback]", ...args);
  }
};

const TwitchCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const pendingTeaserId = peekPendingTeaserId();
  const previewTarget = pendingTeaserId
    ? `/result?teaser=${encodeURIComponent(pendingTeaserId)}`
    : "/";
  const retryTarget = pendingTeaserId
    ? `/connect-twitch?teaser=${encodeURIComponent(pendingTeaserId)}`
    : "/connect-twitch";

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
      devLog("callback received");
      const oauthResult = await completeTwitchCallback(code, stateParam);
      if (cancelled) return;

      if (!oauthResult.success) {
        setState("error");
        setErrorMsg("error" in oauthResult ? oauthResult.error : "La connexion n’a pas pu être finalisée.");
        return;
      }

      devLog("oauth success, platform_login:", oauthResult.platform_login);

      // The server-side edge function already bootstrapped a Supabase session
      // and wrote the connected_accounts row. Read back the authoritative
      // identity from the DB (source of truth) before running enrichment.
      setStepIndex(2); // move the UI to "On calcule ton StreamScore et ton plan…"

      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      const userId = sessionData.session?.user?.id;
      if (!userId) {
        devLog("no user session after oauth");
        setState("enrichment_failed");
        setErrorMsg(
          "La connexion Twitch a réussi, mais le diagnostic enrichi n’a pas pu être finalisé. Réessaie dans un instant.",
        );
        return;
      }

      const { data: connected } = await supabase
        .from("connected_accounts")
        .select("platform_user_id, platform_login, platform_display_name")
        .eq("user_id", userId)
        .eq("platform", "twitch")
        .maybeSingle();

      if (cancelled) return;

      if (!connected?.platform_user_id || !connected.platform_login) {
        devLog("connected_accounts row incomplete", connected);
        setState("enrichment_failed");
        setErrorMsg(
          "La connexion Twitch a réussi, mais le diagnostic enrichi n’a pas pu être finalisé. Réessaie dans un instant.",
        );
        return;
      }

      devLog("connected identity:", connected);

      // Mark the durable flag now that we really have a connection the DB
      // confirms — this drives the welcome UX down the line.
      onboardingFlags.markTwitchConnected();

      // Fire-and-forget: create EventSub subscriptions for the connected
      // Twitch account. The edge function is idempotent and never blocks.
      void bootstrapTwitchEventSub();

      let enrichedReportId: string | null = null;
      try {
        devLog("starting enrichment run");
        const result = await runAnalysis({
          channelName: connected.platform_login,
          userId,
          platform: "twitch",
          platformUserId: connected.platform_user_id,
          platformLogin: connected.platform_login,
          platformDisplayName: connected.platform_display_name ?? connected.platform_login,
        });
        enrichedReportId = result.reportId;
        devLog("enrichment done, reportId:", enrichedReportId);
      } catch (err) {
        devLog("enrichment failed", err);
        enrichedReportId = null;
      }

      if (cancelled) return;

      if (!enrichedReportId) {
        // Do NOT silently fall back to the teaser. Surface a real error and
        // keep the pending teaser id around so the retry CTA can resume.
        setState("enrichment_failed");
        setErrorMsg(
          "La connexion Twitch a réussi, mais le diagnostic enrichi n’a pas pu être finalisé. Réessaie dans un instant.",
        );
        return;
      }

      // Only now that the enriched report exists do we consume the pending
      // teaser id — it has served its reconciliation purpose.
      consumePendingTeaserId();

      // Cockpit is the canonical authenticated home. The enriched report is
      // reachable one click away via the welcome banner / "Rapport complet".
      const target = `/dashboard?welcome=1`;
      devLog("navigating to:", target);
      navigate(target, { replace: true });
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
                    Tu arrives sur ton cockpit dans quelques secondes.
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
                    Connexion annulée. Tu peux rester sur l'aperçu gratuit et reconnecter Twitch plus tard.
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => navigate(previewTarget)}>Revenir à l'aperçu</Button>
                  <Button variant="ghost" onClick={() => navigate(retryTarget)}>
                    Réessayer
                  </Button>
                </div>
              </>
            )}

            {state === "enrichment_failed" && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Diagnostic enrichi indisponible
                  </h2>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {errorMsg}
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => navigate(retryTarget)}>Réessayer</Button>
                  <Button variant="ghost" onClick={() => navigate(previewTarget)}>
                    Revenir à l'aperçu
                  </Button>
                </div>
              </>
            )}

            {state === "error" && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Connexion Twitch impossible
                  </h2>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {errorMsg || "La connexion n'a pas pu être finalisée. Réessaie dans un instant."}
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => navigate(retryTarget)}>Réessayer</Button>
                  <Button variant="ghost" onClick={() => navigate(previewTarget)}>
                    Revenir à l'aperçu
                  </Button>
                </div>
              </>
            )}

          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default TwitchCallbackPage;
