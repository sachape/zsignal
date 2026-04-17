import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Check, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { runAnalysis, type JobStage } from "@/services/analysisRunner";
import { cn } from "@/lib/utils";

const stageOrder: JobStage[] = [
  "loading_data",
  "computing_facts",
  "scoring",
  "matching_competitors",
  "generating_recommendations",
  "saving",
];

const stageLabels: Record<JobStage, string> = {
  pending: "Initialisation",
  loading_data: "Chargement des données",
  computing_facts: "Extraction des faits",
  scoring: "Calcul du StreamScore",
  matching_competitors: "Recherche de concurrents",
  generating_recommendations: "Génération des recommandations",
  saving: "Sauvegarde du rapport",
  completed: "Terminé",
  failed: "Échec",
};

const AnalyzePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const channel = searchParams.get("channel") || "nexagaming";
  const [currentStage, setCurrentStage] = useState<JobStage>("pending");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || startedRef.current) return;

    if (!user) {
      const t = setTimeout(() => {
        navigate(`/result?channel=${encodeURIComponent(channel)}`);
      }, 3500);
      let i = 0;
      const iv = setInterval(() => {
        if (i >= stageOrder.length) {
          clearInterval(iv);
          return;
        }
        setCurrentStage(stageOrder[i]);
        i++;
      }, 500);
      return () => {
        clearTimeout(t);
        clearInterval(iv);
      };
    }

    startedRef.current = true;
    (async () => {
      try {
        const { reportId } = await runAnalysis({
          channelName: channel,
          userId: user.id,
          onStage: (s) => setCurrentStage(s),
        });
        setTimeout(() => navigate(`/result?report_id=${reportId}`), 600);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    })();
  }, [authLoading, user, channel, navigate]);

  const currentIndex = stageOrder.indexOf(currentStage);

  const getStatus = (i: number): "pending" | "active" | "done" => {
    if (currentStage === "completed") return "done";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return "active";
    return "pending";
  };

  if (error) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
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
                Analyse en cours
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {channel}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {user
                  ? "Pipeline en cours d'exécution"
                  : "Aperçu rapide en cours…"}
              </p>
            </div>

            <ul className="space-y-2">
              {stageOrder.map((s, i) => {
                const status = getStatus(i);
                return (
                  <li
                    key={s}
                    className={cn(
                      "flex items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm",
                      status === "active" && "border-primary/40 bg-primary/5",
                      status === "done" && "text-muted-foreground",
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      {status === "done" && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                      {status === "active" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      )}
                      {status === "pending" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      )}
                    </span>
                    <span
                      className={cn(
                        status === "active"
                          ? "font-medium text-foreground"
                          : "text-foreground/80",
                      )}
                    >
                      {stageLabels[s]}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: "0%" }}
                animate={{
                  width: `${((Math.max(0, currentIndex) + 1) / stageOrder.length) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default AnalyzePage;
