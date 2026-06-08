import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

import { AlertCircle, RefreshCw, SearchX } from "lucide-react";
import { analytics } from "@/services/analytics";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import AnalysisStep from "@/components/AnalysisStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { runAnalysis, type JobStage } from "@/services/analysisRunner";
import { runTeaserAnalysis, type TeaserStage } from "@/services/teaserAnalysisRunner";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import { teaserStore } from "@/services/teaserStore";

type Stage = JobStage | TeaserStage;

const fullStageOrder: JobStage[] = [
  "loading_data",
  "computing_facts",
  "scoring",
  "matching_competitors",
  "generating_recommendations",
  "saving",
];

const teaserStageOrder: TeaserStage[] = [
  "looking_up",
  "loading_data",
  "computing_facts",
  "scoring",
  "matching_competitors",
  "generating_recommendations",
];

const stageLabels: Record<Stage, string> = {
  pending: "Initialisation",
  looking_up: "Recherche de la chaîne",
  loading_data: "Chargement des données",
  computing_facts: "Extraction des faits",
  scoring: "Calcul du StreamScore",
  matching_competitors: "Recherche de concurrents",
  generating_recommendations: "Génération des recommandations",
  saving: "Sauvegarde du rapport",
  completed: "Terminé",
  failed: "Échec",
  not_found: "Chaîne introuvable",
};

const AnalyzePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();

  const urlChannel = searchParams.get("channel") || "";
  const hintGame = searchParams.get("hint_game") || null;
  const connectedLogin = account?.platform_login ?? "";
  const modeParam = searchParams.get("mode");

  // Mode resolution:
  // - explicit ?mode=teaser  -> always teaser (public search, isolated from auth context)
  // - unauthenticated        -> teaser
  // - authenticated otherwise -> full
  const mode: "teaser" | "full" =
    modeParam === "teaser" || !user ? "teaser" : "full";

  // Canonical channel source-of-truth:
  // - teaser mode: ONLY the URL ?channel= param (normalized). Never fall back
  //   to the connected Twitch account — public search must be fully isolated.
  // - full mode: the connected Twitch login is canonical.
  const channel =
    mode === "teaser"
      ? (normalizeChannelInput(urlChannel) ?? urlChannel)
      : (connectedLogin || urlChannel);
  const [currentStage, setCurrentStage] = useState<Stage>("pending");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{
    login: string;
    source: string;
    displayName: string;
  } | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || connectionLoading || startedRef.current) return;
    if (!channel) {
      setError("Aucune chaîne fournie. Retourne à l'accueil pour lancer une analyse.");
      return;
    }
    // Public search must be isolated: clear stale teaser/pending channel
    // state so the searched channel is the only active teaser target.
    if (mode === "teaser") {
      teaserStore.clearPendingChannel();
    }
    startedRef.current = true;
    const analysisMode = mode === "full" && user ? "full" : "teaser";
    analytics.analysisStarted(channel, analysisMode);

    (async () => {
      // Authenticated full analysis
      if (mode === "full" && user) {
        try {
          const { reportId } = await runAnalysis({
            channelName: channel,
            userId: user.id,
            platform: account ? "twitch" : null,
            platformUserId: account?.platform_user_id ?? null,
            platformLogin: account?.platform_login ?? null,
            platformDisplayName: account?.platform_display_name ?? null,
            onStage: (s) => setCurrentStage(s),
          });
          analytics.analysisCompleted(channel, "full");
          setTimeout(() => navigate(`/result?report_id=${reportId}`), 500);
        } catch (e) {
          const reason = e instanceof Error ? e.message : "unknown";
          analytics.analysisFailed(channel, reason);
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        }
        return;
      }

      // Public teaser analysis (real Twitch public lookup, no mock fallback)
      const result = await runTeaserAnalysis({
        channelInput: channel,
        gameNameHint: hintGame,
        onStage: (s) => setCurrentStage(s),
        onLookupResolved: (info) => setLookupInfo(info),
      });
      if (result.ok === true) {
        analytics.analysisCompleted(channel, "teaser");
        setTimeout(() => navigate(`/result?teaser=${result.record.id}`), 500);
      } else if (result.reason === "not_found") {
        analytics.analysisFailed(channel, "not_found");
        setNotFound(true);
      } else {
        analytics.analysisFailed(channel, result.message ?? "unknown");
        setError(result.message ?? "Une erreur est survenue.");
      }
    })();
  }, [authLoading, connectionLoading, user, account, channel, mode, navigate]);

  const order: Stage[] = mode === "full" ? fullStageOrder : teaserStageOrder;
  const currentIndex = order.indexOf(currentStage);

  const getStatus = (i: number): "pending" | "active" | "done" => {
    if (currentStage === "completed") return "done";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return "active";
    return "pending";
  };

  // Monotone, credible progress bar.
  // - Strictly increasing (never resets within a cycle).
  // - Fast climb early, slows near the end, holds at ~92% until completion.
  // - Snaps to 100% only when the async pipeline is actually done.
  const isDone = currentStage === "completed" || notFound || error !== null;
  const isFailed = notFound || error !== null;
  const stageTarget = (() => {
    if (isFailed) return 100;
    if (currentStage === "completed") return 100;
    const idx = Math.max(0, currentIndex);
    // Map stage index to a ceiling: fast to 60%, then slow toward 92%.
    const ratio = (idx + 1) / order.length;
    if (ratio <= 0.5) return 10 + ratio * 100; // 10% -> 60%
    return 60 + (ratio - 0.5) * 64; // 60% -> 92%
  })();

  const [progress, setProgress] = useState(6);
  useEffect(() => {
    if (isDone) {
      setProgress(100);
      return;
    }
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const ceiling = Math.min(stageTarget, 92);
        if (prev >= ceiling) return prev;
        // Ease toward ceiling — never decreases.
        const delta = Math.max(0.4, (ceiling - prev) * 0.08);
        return Math.min(ceiling, prev + delta);
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [stageTarget, isDone]);

  if (notFound) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <SearchX className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">
                  Chaîne introuvable
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aucune chaîne publique ne correspond à « {channel} ». Vérifie l'orthographe ou essaie une autre chaîne.
                </p>
              </div>
              <Button asChild className="mt-2">
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">
                  Analyse échouée
                </h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="mt-2 flex gap-2">
                <Button asChild variant="outline">
                  <Link to={user ? "/dashboard" : "/"}>Retour</Link>
                </Button>
                <Button
                  onClick={() => {
                    startedRef.current = false;
                    setError(null);
                    setCurrentStage("pending");
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer size="sm">
        <Card>
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {mode === "teaser" ? "Aperçu en cours" : "Analyse en cours"}
              </p>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {channel}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "teaser"
                  ? "Génération de ton aperçu gratuit…"
                  : "Pipeline en cours d'exécution"}
              </p>
            </div>

            <ul className="space-y-2">
              {order.map((s, i) => (
                <li key={s}>
                  <AnalysisStep label={stageLabels[s]} status={getStatus(i)} />
                </li>
              ))}
            </ul>

            <Progress value={progress} className="mt-6" />
            {progress >= 85 && !isDone && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
                Finalisation de l'analyse, encore quelques secondes…
              </p>
            )}
            {import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1" && (
              <div className="mt-6 rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                <div className="mb-1 font-semibold text-foreground">DEBUG /analyze</div>
                <div>raw input (?channel): {urlChannel || "—"}</div>
                <div>normalized searched: {normalizeChannelInput(urlChannel) ?? "—"}</div>
                <div>mode: {mode}</div>
                <div>connected twitch login: {connectedLogin || "—"}</div>
                <div>
                  source used:{" "}
                  {mode === "teaser"
                    ? "url_channel_param (isolated from auth)"
                    : connectedLogin
                      ? "connected_twitch_login"
                      : "url_channel_param"}
                </div>
                <div>resolved channel: {channel || "—"}</div>
                {mode === "teaser" && (
                  <>
                    <div className="mt-1 border-t border-border/40 pt-1">
                      twitch lookup source:{" "}
                      {lookupInfo?.source ??
                        (currentStage === "looking_up" ? "(en cours…)" : "—")}
                    </div>
                    <div>
                      twitch lookup login: {lookupInfo?.login ?? "—"}
                    </div>
                    <div>
                      twitch lookup display_name:{" "}
                      {lookupInfo?.displayName ?? "—"}
                    </div>
                    <div>real twitch api: {lookupInfo ? "yes" : "—"}</div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default AnalyzePage;
