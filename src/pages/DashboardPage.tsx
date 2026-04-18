import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Trophy,
  Lightbulb,
  Clock,
  Target,
  Link2,
  ArrowRight,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import ScoreCard from "@/components/ScoreCard";
import RecommendationCard from "@/components/RecommendationCard";
import StatBlock from "@/components/StatBlock";
import EmptyReportState from "@/components/EmptyReportState";
import ReportHistoryList from "@/components/ReportHistoryList";
import { ErrorState, LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import SyncStatusCard, { formatSyncRelative, type SyncState } from "@/components/SyncStatusCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { supabase } from "@/integrations/supabase/client";
import { validateReportConsistency } from "@/services/reportConsistency";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  getRecentReports,
  type SavedReport,
} from "@/services/reportRepository";
import { resolveSyncSnapshot, type SyncSnapshot } from "@/services/syncStateResolver";
import {
  enqueueRefreshForSelf,
  processPendingForAccount,
} from "@/services/autoRefreshRunner";

const categoryIcons: Record<string, typeof Clock> = {
  regularity: Clock,
  content: Lightbulb,
  positioning: Target,
  structure: Clock,
  monetization: Trophy,
  momentum: Zap,
  general: Lightbulb,
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const daysSince = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { isConnected, account, loading: connectionLoading } = useTwitchConnection();
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncSnapshot, setSyncSnapshot] = useState<SyncSnapshot | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const autoTriggeredRef = useRef(false);
  const processingRef = useRef(false);

  const loadDashboardState = useCallback(async () => {
    if (!user) return;
    const platformUserId = account?.platform_user_id ?? null;
    const currentPromise = platformUserId
      ? getLatestReportForPlatformUser(user.id, platformUserId)
      : getLatestReport(user.id);

    const [c, h] = await Promise.all([currentPromise, getRecentReports(user.id, 5)]);
    setCurrentReport(c);
    setHistory(h);

    if (platformUserId) {
      const snap = await resolveSyncSnapshot(user.id, platformUserId, c?.created_at ?? null);
      setSyncSnapshot(snap);
    } else {
      setSyncSnapshot(null);
    }
  }, [user, account]);

  useEffect(() => {
    if (!user || connectionLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadDashboardState();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, connectionLoading, loadDashboardState]);

  // Auto-trigger first analysis if connected with no report and no job yet.
  useEffect(() => {
    if (!user || !account?.platform_user_id || !syncSnapshot) return;
    if (autoTriggeredRef.current) return;
    if (syncSnapshot.state !== "no_analysis") return;
    autoTriggeredRef.current = true;
    (async () => {
      await enqueueRefreshForSelf("auto_first");
      await loadDashboardState();
    })();
  }, [user, account, syncSnapshot, loadDashboardState]);

  // Hybrid pipeline: claim and run any queued job for the connected account.
  useEffect(() => {
    if (!user || !account?.platform_user_id || !account.platform_login) return;
    if (!syncSnapshot || processingRef.current) return;
    if (syncSnapshot.lastJobStatus !== "queued") return;
    processingRef.current = true;
    (async () => {
      await processPendingForAccount(
        user.id,
        account.platform_user_id!,
        account.platform_login!,
        account.platform_display_name ?? null,
      );
      processingRef.current = false;
      await loadDashboardState();
    })();
  }, [user, account, syncSnapshot, loadDashboardState]);

  // Realtime: react to job changes for this user.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-jobs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "analysis_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadDashboardState();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadDashboardState]);

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    await enqueueRefreshForSelf("manual");
    await loadDashboardState();
    setManualRefreshing(false);
  }, [manualRefreshing, loadDashboardState]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (isConnected && account && !currentReport) {
    const displayName =
      account.platform_display_name || account.platform_login || "ta chaîne";
    return (
      <AppShell>
        <PageContainer>
          <PageHeader
            eyebrow="Tableau de bord"
            title={displayName}
            avatarLogin={account.platform_login}
            description="Compte Twitch connecté"
          />

          <div className="mb-6">
            <SyncStatusCard
              state={syncSnapshot?.state ?? "no_analysis"}
              lastUpdatedLabel={null}
              onManualRefresh={handleManualRefresh}
              manualBusy={manualRefreshing}
            />
          </div>

          <Card className="mb-6">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">
                  Compte Twitch connecté
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Première analyse en préparation. Les prochaines mises à jour
                  se feront automatiquement.
                </p>
              </div>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <section>
              <SectionHeader title="Analyses précédentes (démo)" align="left" />
              <p className="mb-3 text-xs text-muted-foreground">
                Ces analyses ont été générées avec des données de démonstration et
                ne reflètent pas ton vrai compte Twitch.
              </p>
              <ReportHistoryList reports={history} />
            </section>
          )}
        </PageContainer>
      </AppShell>
    );
  }

  if (!currentReport) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            title="Bienvenue sur ton tableau de bord"
            description="Tu peux lancer une analyse de démonstration ou connecter Twitch."
          />
          <EmptyReportState />
        </PageContainer>
      </AppShell>
    );
  }

  const currentConsistency = validateReportConsistency(currentReport, currentReport.report);
  const isCorruptedLiveReport = !currentReport.is_demo && !currentConsistency.isConsistent;

  if (isCorruptedLiveReport) {
    const displayName =
      account?.platform_display_name || account?.platform_login || "ta chaîne";

    return (
      <AppShell>
        <PageContainer>
          <PageHeader
            eyebrow="Tableau de bord"
            title={displayName}
            avatarLogin={account?.platform_login ?? null}
            description={
              account?.platform_login ? "Compte Twitch connecté" : "Rapport live"
            }
          />
          <ErrorState
            title="Ce rapport est incohérent"
            description="La dernière analyse live ne correspond pas à l'identité du compte connecté. Régénère un rapport propre pour continuer."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link to="/analyze">
                    <RefreshCw className="h-4 w-4" /> Régénérer le rapport
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Retour au tableau de bord</Link>
                </Button>
              </div>
            }
          />
          {history.length > 0 && (
            <section className="mt-8">
              <SectionHeader title="Analyses récentes" align="left" />
              <ReportHistoryList reports={history} />
            </section>
          )}
        </PageContainer>
      </AppShell>
    );
  }

  const report = currentReport.report;
  const score = report.score;
  const ap = report.affiliate_progress;
  const summary = report.channel_summary;
  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);

  const headerTitle = account?.platform_display_name || account?.platform_login || summary.display_name;
  const headerEyebrow = isConnected ? "Tableau de bord · Twitch connecté" : "Tableau de bord";

  const previous = history.find(
    (r) => r.id !== currentReport.id && r.platform_user_id === currentReport.platform_user_id,
  );
  const delta = previous ? score.overall - previous.report.score.overall : null;
  const ageDays = daysSince(currentReport.created_at);
  const isFresh = ageDays <= 7;

  const followersAvailable = summary.followers_available !== false;
  const followersMissingScope = summary.followers_missing_scope === true;

  const milestones = [
    {
      label: "Followers",
      current: ap.followers.current ?? 0,
      target: ap.followers.target,
      available: ap.followers.available !== false,
    },
    { label: "Viewers moyens", current: ap.avg_viewers.current, target: ap.avg_viewers.target, available: true },
    { label: "Jours de stream", current: ap.stream_days.current, target: ap.stream_days.target, available: true },
    { label: "Heures de stream", current: ap.stream_hours.current, target: ap.stream_hours.target, available: true },
  ];
  const nextMilestone =
    milestones
      .filter((m) => m.available)
      .map((m) => ({ ...m, pct: Math.min(100, Math.round((m.current / m.target) * 100)) }))
      .filter((m) => m.pct < 100)
      .sort((a, b) => b.pct - a.pct)[0] ?? milestones.map((m) => ({ ...m, pct: 100 }))[0];

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow={headerEyebrow}
          title={headerTitle}
          avatarUrl={report.identity?.avatar_url ?? null}
          avatarLogin={
            account?.platform_login ?? report.identity?.platform_login ?? null
          }
          badges={[
            ...(summary.broadcaster_type === "partner"
              ? [{ label: "Partenaire", variant: "accent" as const }]
              : summary.broadcaster_type === "affiliate"
                ? [{ label: "Affilié", variant: "secondary" as const }]
                : []),
            ...(summary.is_live
              ? [{ label: "Live", variant: "destructive" as const }]
              : []),
          ]}
          description="Aperçu rapide — consulte le rapport complet pour le détail."
          action={
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to={`/result?report_id=${currentReport.id}`}>
                <FileText className="h-3.5 w-3.5" /> Voir le rapport complet
              </Link>
            </Button>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <SyncStatusCard
            state={syncSnapshot?.state ?? ("synchronized" as SyncState)}
            lastUpdatedLabel={
              currentReport
                ? `${formatDate(currentReport.created_at)} · ${formatSyncRelative(currentReport.created_at)}${currentReport.is_demo ? " · démo" : ""}`
                : null
            }
            onManualRefresh={handleManualRefresh}
            manualBusy={manualRefreshing}
          />

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Link2 className={`h-4 w-4 shrink-0 ${isConnected ? "text-success" : "text-warning"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isConnected ? "Twitch connecté" : "Twitch non connecté"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? `Compte : @${account?.platform_login}`
                    : "Connecte Twitch pour des analyses personnalisées."}
                </p>
              </div>
              {!isConnected && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/connect-twitch">Connecter</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <ScoreCard score={score.overall} />
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock
                label="Évolution"
                value={delta === null ? "—" : delta > 0 ? `+${delta}` : String(delta)}
                subtext={
                  delta === null
                    ? "Première analyse"
                    : delta > 0
                      ? "depuis la dernière analyse"
                      : delta < 0
                        ? "depuis la dernière analyse"
                        : "stable"
                }
                accent={delta !== null && delta > 0}
              />
              <StatBlock
                label="Viewers moyens"
                value={String(summary.avg_viewers)}
                subtext="30 derniers jours"
              />
              <StatBlock
                label="Followers"
                value={followersAvailable ? String(summary.follower_count) : "—"}
                subtext={
                  followersAvailable
                    ? summary.broadcaster_type === "affiliate"
                      ? "Affilié"
                      : "Non affilié"
                    : followersMissingScope
                      ? "Reconnecte Twitch pour récupérer"
                      : "Followers indisponibles"
                }
              />
            </div>

            {!followersAvailable && !currentReport.is_demo && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                  <p className="min-w-0 flex-1 text-xs text-foreground">
                    {followersMissingScope
                      ? "La permission Twitch pour lire les followers est manquante. Reconnecte ton compte pour récupérer le vrai nombre de followers."
                      : "Followers temporairement indisponibles. Relance une analyse pour réessayer."}
                  </p>
                  {followersMissingScope && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/connect-twitch">Reconnecter Twitch</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {report.next_best_action && (
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                      À faire aujourd'hui
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.next_best_action.title}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Prochain palier : {nextMilestone.label}
                </h3>
                <p className="text-xs text-muted-foreground">Progression vers l'affiliation</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/result?report_id=${currentReport.id}`}>
                  Détail <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <ProgressRow
              label={nextMilestone.label}
              value={`${nextMilestone.current} / ${nextMilestone.target}`}
              pct={nextMilestone.pct}
            />
          </CardContent>
        </Card>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeader title="À prioriser" align="left" />
            <Button asChild variant="ghost" size="sm">
              <Link to={`/result?report_id=${currentReport.id}`}>
                Toutes les actions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {priorityRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                icon={categoryIcons[rec.category] || Lightbulb}
                title={rec.title}
                reason={rec.reason}
                action={rec.action}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Analyses récentes" align="left" />
          <ReportHistoryList reports={history} />
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
