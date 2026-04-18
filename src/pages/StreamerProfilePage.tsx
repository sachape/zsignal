import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Radio, Sparkles, Lightbulb, Target } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import ScoreCard from "@/components/ScoreCard";
import StatBlock from "@/components/StatBlock";
import { ErrorState, LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { runTeaserAnalysis } from "@/services/teaserAnalysisRunner";
import type { AnalysisReport } from "@/types/analysis";

type Relation = "direct" | "catch-up" | "inspiration" | "self" | "none";

const StreamerProfilePage = () => {
  const { login } = useParams<{ login: string }>();
  const { user } = useAuth();
  const { account } = useTwitchConnection();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relation, setRelation] = useState<Relation>("none");

  useEffect(() => {
    if (!login) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setReport(null);

      const result = await runTeaserAnalysis({ channelInput: login });
      if (cancelled) return;

      if (result.ok !== true) {
        setError(result.reason);
        setLoading(false);
        return;
      }
      setReport(result.record.report);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [login]);

  useEffect(() => {
    if (!report || !login) return;
    if (account?.platform_login?.toLowerCase() === login.toLowerCase()) {
      setRelation("self");
      return;
    }
    setRelation("none");
  }, [report, login, account]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <ErrorState
            title={error === "not_found" ? "Chaîne introuvable" : "Analyse impossible"}
            description={
              error === "not_found"
                ? `Aucune chaîne Twitch trouvée pour "${login}".`
                : "On n'a pas pu récupérer cette chaîne pour le moment."
            }
            action={
              <Button asChild variant="outline">
                <Link to={user ? "/dashboard" : "/"}>Retour</Link>
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  const summary = report.channel_summary;
  const score = report.score;
  const weakest = score.breakdown.slice().sort((a, b) => a.score - b.score)[0];
  const strongest = score.breakdown.slice().sort((a, b) => b.score - a.score)[0];

  return (
    <AppShell>
      <PageContainer>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to={user ? "/competitors" : "/"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
        </Button>

        <PageHeader
          eyebrow="Profil streamer · données publiques"
          title={summary.display_name}
          avatarUrl={report.identity?.avatar_url ?? null}
          avatarLogin={report.identity?.platform_login ?? summary.channel_name}
          badges={[
            ...(summary.broadcaster_type === "partner"
              ? [{ label: "Partenaire", variant: "accent" as const }]
              : summary.broadcaster_type === "affiliate"
                ? [{ label: "Affilié", variant: "secondary" as const }]
                : []),
            ...(summary.is_live ? [{ label: "Live", variant: "destructive" as const }] : []),
            ...(summary.category ? [{ label: summary.category, variant: "outline" as const }] : []),
            ...(relation === "self" ? [{ label: "C'est toi", variant: "secondary" as const }] : []),
          ]}
          description={
            summary.is_live
              ? `En live · ${summary.live_viewer_count ?? 0} viewers`
              : "Profil public — analyse basée sur les données Twitch publiques."
          }
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <ScoreCard score={score.overall} />
          <StatBlock
            label="Vues moyennes par VOD"
            value={String(summary.avg_viewers)}
            subtext="30 derniers jours · pas du live"
          />
          <StatBlock
            label="Type de chaîne"
            value={summary.broadcaster_type || "Standard"}
            subtext={summary.category || "Catégorie non identifiée"}
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">Ce qu'iel fait bien</h3>
              </div>
              <p className="text-sm text-foreground">{strongest?.dimension ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {strongest?.reasons[0] ?? "Pas assez de signaux publics."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Point faible visible</h3>
              </div>
              <p className="text-sm text-foreground">{weakest?.dimension ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {weakest?.reasons[0] ?? "Pas assez de signaux publics."}
              </p>
            </CardContent>
          </Card>
        </div>

        {strongest?.levers && strongest.levers.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Mécanique à copier</h3>
              </div>
              <p className="text-sm text-foreground">{strongest.levers[0]}</p>
            </CardContent>
          </Card>
        )}

        {summary.is_live && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Radio className="h-4 w-4 text-destructive" />
              <p className="text-sm text-foreground">
                Actuellement en live · <span className="text-muted-foreground">{summary.live_title}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default StreamerProfilePage;
