import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

import { AlertCircle, RefreshCw, SearchX } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import AnalysisStep from "@/components/AnalysisStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { runAnalysis, type JobStage } from "@/services/analysisRunner";
import { runTeaserAnalysis, type TeaserStage } from "@/services/teaserAnalysisRunner";

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
  const channel = searchParams.get("channel") || "";
  const mode = searchParams.get("mode") === "teaser" || !user ? "teaser" : "full";
  const [currentStage, setCurrentStage] = useState<Stage>("pending");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || startedRef.current) return;
    if (!channel) {
      setError("Aucune chaîne fournie. Retourne à l'accueil pour lancer une analyse.");
      return;
    }
    startedRef.current = true;

    (async () => {
      // Authenticated full analysis
      if (mode === "full" && user) {
        try {
          const { reportId } = await runAnalysis({
            channelName: channel,
            userId: user.id,
            onStage: (s) => setCurrentStage(s),
          });
          setTimeout(() => navigate(`/result?report_id=${reportId}`), 500);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        }
        return;
      }

      // Public teaser analysis
      const result = await runTeaserAnalysis({
        channelInput: channel,
        onStage: (s) => setCurrentStage(s),
      });
      if (result.ok === true) {
        setTimeout(() => navigate(`/result?teaser=${result.record.id}`), 500);
      } else if (result.reason === "not_found") {
        setNotFound(true);
      } else {
        setError(result.message ?? "Une erreur est survenue.");
      }
    })();
  }, [authLoading, user, channel, mode, navigate]);

  const order: Stage[] = mode === "full" ? fullStageOrder : teaserStageOrder;
  const currentIndex = order.indexOf(currentStage);

  const getStatus = (i: number): "pending" | "active" | "done" => {
    if (currentStage === "completed") return "done";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return "active";
    return "pending";
  };

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
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
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

            <Progress
              value={((Math.max(0, currentIndex) + 1) / order.length) * 100}
              className="mt-6"
            />
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default AnalyzePage;
