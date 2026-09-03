import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

import { AlertCircle, RefreshCw, SearchX, Check, Loader2 } from "lucide-react";
import { analytics } from "@/services/analytics";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import AnalysisStep from "@/components/AnalysisStep";
import SiteNav from "@/components/site/SiteNav";
import { Container, Orb } from "@/components/site/el";
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

/** Editorial light shell for the public teaser funnel (matches the site). */
const TeaserShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
    <SiteNav theme="light" />
    <main className="relative overflow-hidden px-6 pt-36 pb-24 md:pt-44">
      <Orb color="bg-el-mint" className="left-1/4 top-10 h-[24rem] w-[24rem] opacity-50" />
      <Orb color="bg-el-peach" className="right-[-4rem] top-24 h-[22rem] w-[22rem] opacity-50" animate="fast" />
      <Container className="relative flex max-w-xl flex-col items-center">{children}</Container>
    </main>
  </div>
);

/** Editorial step row (el-* tokens) for the teaser. */
const TeaserStep = ({ label, status }: { label: string; status: "pending" | "active" | "done" }) => (
  <div
    className={
      "flex items-center gap-3 rounded-xl border bg-el-card px-4 py-2.5 font-el-sans text-[15px] transition-colors " +
      (status === "active" ? "border-el-hairline-strong" : "border-el-hairline")
    }
  >
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {status === "done" && <Check className="h-4 w-4 text-el-ink" />}
      {status === "active" && <Loader2 className="h-4 w-4 animate-spin text-el-ink" />}
      {status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-el-muted-soft" />}
    </span>
    <span className={status === "pending" ? "text-el-muted" : "text-el-ink"}>{label}</span>
  </div>
);

const AnalyzePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();

  const urlChannel = searchParams.get("channel") || "";
  const hintGame = searchParams.get("hint_game") || null;
  const connectedLogin = account?.platform_login ?? "";
  const modeParam = searchParams.get("mode");

  const mode: "teaser" | "full" =
    modeParam === "teaser" || !user ? "teaser" : "full";

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
    if (mode === "teaser") {
      teaserStore.clearPendingChannel();
    }
    startedRef.current = true;
    const analysisMode = mode === "full" && user ? "full" : "teaser";
    analytics.analysisStarted(channel, analysisMode);

    (async () => {
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
  const teaser = mode === "teaser";

  const getStatus = (i: number): "pending" | "active" | "done" => {
    if (currentStage === "completed") return "done";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return "active";
    return "pending";
  };

  const isDone = currentStage === "completed" || notFound || error !== null;
  const isFailed = notFound || error !== null;
  const stageTarget = (() => {
    if (isFailed) return 100;
    if (currentStage === "completed") return 100;
    const idx = Math.max(0, currentIndex);
    const ratio = (idx + 1) / order.length;
    if (ratio <= 0.5) return 10 + ratio * 100;
    return 60 + (ratio - 0.5) * 64;
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
        const delta = Math.max(0.4, (ceiling - prev) * 0.08);
        return Math.min(ceiling, prev + delta);
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [stageTarget, isDone]);

  // ── NOT FOUND ───────────────────────────────────────────────────────────
  if (notFound) {
    if (teaser) {
      return (
        <TeaserShell>
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-el-hairline bg-el-card p-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-el-strong">
              <SearchX className="h-5 w-5 text-el-ink" />
            </span>
            <div className="space-y-2">
              <h2 className="font-el-display text-[24px] font-light text-el-ink">Chaîne introuvable</h2>
              <p className="font-el-sans text-[15px] leading-[1.6] text-el-body">
                Aucune chaîne publique ne correspond à « {channel} ». Vérifie l'orthographe ou essaie une autre chaîne.
              </p>
            </div>
            <Link to="/" className="mt-1 inline-flex h-11 items-center rounded-full bg-el-ink px-6 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
              Retour à l'accueil
            </Link>
          </div>
        </TeaserShell>
      );
    }
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <SearchX className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">Chaîne introuvable</h2>
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

  // ── ERROR ───────────────────────────────────────────────────────────────
  if (error) {
    const retry = () => {
      startedRef.current = false;
      setError(null);
      setCurrentStage("pending");
    };
    if (teaser) {
      return (
        <TeaserShell>
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-el-hairline bg-el-card p-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-el-rose/60">
              <AlertCircle className="h-5 w-5 text-el-ink" />
            </span>
            <div className="space-y-2">
              <h2 className="font-el-display text-[24px] font-light text-el-ink">Analyse échouée</h2>
              <p className="font-el-sans text-[15px] leading-[1.6] text-el-body">{error}</p>
            </div>
            <div className="mt-1 flex gap-2">
              <Link to="/" className="inline-flex h-11 items-center rounded-full border border-el-hairline-strong px-5 font-el-sans text-[15px] font-medium text-el-ink transition-colors hover:bg-el-strong">
                Retour
              </Link>
              <button onClick={retry} className="inline-flex h-11 items-center gap-2 rounded-full bg-el-ink px-5 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
                <RefreshCw className="h-4 w-4" /> Réessayer
              </button>
            </div>
          </div>
        </TeaserShell>
      );
    }
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">Analyse échouée</h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="mt-2 flex gap-2">
                <Button asChild variant="outline">
                  <Link to={user ? "/dashboard" : "/"}>Retour</Link>
                </Button>
                <Button onClick={retry}>
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

  // ── LOADING ─────────────────────────────────────────────────────────────
  if (teaser) {
    return (
      <TeaserShell>
        <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-el-muted">Aperçu en cours</p>
        <h1 className="mt-3 font-el-display text-[clamp(2rem,5vw,2.75rem)] font-light tracking-[-0.02em] text-el-ink">{channel}</h1>
        <p className="mt-3 font-el-sans text-[16px] text-el-body">Génération de ton StreamScore gratuit…</p>

        <div className="mt-9 w-full space-y-2.5">
          {order.map((s, i) => (
            <TeaserStep key={s} label={stageLabels[s]} status={getStatus(i)} />
          ))}
        </div>

        <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-el-strong">
          <div className="h-full rounded-full bg-el-ink transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        {progress >= 85 && !isDone && (
          <p className="mt-3 font-el-sans text-[13px] text-el-muted">Finalisation de l'analyse, encore quelques secondes…</p>
        )}
      </TeaserShell>
    );
  }

  return (
    <AppShell>
      <PageContainer size="sm">
        <Card>
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Analyse en cours
              </p>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {channel}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Pipeline en cours d'exécution</p>
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
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default AnalyzePage;
