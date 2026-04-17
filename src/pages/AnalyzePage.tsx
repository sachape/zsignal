import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AnalysisStep from "@/components/AnalysisStep";
import { useAuth } from "@/contexts/AuthContext";
import { runAnalysis, type JobStage } from "@/services/analysisRunner";

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

    // Unauth: keep teaser flow → redirect to /result with channel
    if (!user) {
      const t = setTimeout(() => {
        navigate(`/result?channel=${encodeURIComponent(channel)}`);
      }, 3500);
      // Animate fake stages for visual continuity
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

    // Authenticated: real persisted run
    startedRef.current = true;
    (async () => {
      try {
        const { jobId } = await runAnalysis({
          channelName: channel,
          userId: user.id,
          onStage: (s) => setCurrentStage(s),
        });
        setTimeout(() => navigate(`/result?jobId=${jobId}`), 600);
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
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Analyse échouée</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => {
                startedRef.current = false;
                setError(null);
                setCurrentStage("pending");
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-xl font-bold text-foreground">Analyse de {channel}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user ? "Pipeline en cours d'exécution" : "Aperçu rapide en cours…"}
            </p>
          </motion.div>

          <div className="space-y-3">
            {stageOrder.map((s, i) => (
              <AnalysisStep key={s} label={stageLabels[s]} status={getStatus(i)} index={i} />
            ))}
          </div>

          <div className="mt-8 h-1 rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: "0%" }}
              animate={{
                width: `${((Math.max(0, currentIndex) + 1) / stageOrder.length) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default AnalyzePage;
