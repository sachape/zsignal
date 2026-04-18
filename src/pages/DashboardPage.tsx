import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import ScoreCard from "@/components/ScoreCard";
import StatBlock from "@/components/StatBlock";
import EmptyReportState from "@/components/EmptyReportState";
import { ErrorState, LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import SyncStatusCard, { formatSyncRelative, type SyncState } from "@/components/SyncStatusCard";
import WeeklyPlanCard from "@/components/WeeklyPlanCard";
import ProgressionSignalsCard from "@/components/ProgressionSignalsCard";
import StreamerBenchmarkCard from "@/components/StreamerBenchmarkCard";
import PlaybookCard from "@/components/PlaybookCard";
import FoundationModeBanner from "@/components/FoundationModeBanner";
import MainBlockerCard from "@/components/MainBlockerCard";
import WeeklySequenceCard from "@/components/WeeklySequenceCard";
import { diagnoseFoundationMode } from "@/services/foundationMode";
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
import { buildProgressionSignals } from "@/services/progressionSignals";
import { recommendPlaybookForReport } from "@/services/playbookLibrary";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

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
      const followersAvailable = c?.report?.channel_summary?.followers_available !== false;
      const streams30d = Number(
        c?.report?.facts?.find((f) => f.key === "streams_30d")?.value ?? 0,
      );
      const snap = await resolveSyncSnapshot(
        user.id,
        platformUserId,
        c?.created_at ?? null,
        { followersAvailable, hasAnyVideos: streams30d > 0 },
      );
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

  // Connected, first analysis pending
  if (isConnected && account && !currentReport) {
    const displayName = account.platform_display_name || account.platform_login || "ta chaîne";
    return (
      <AppShell>
        <PageContainer>
          <PageHeader
            eyebrow="Cockpit"
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
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">
                  Première analyse en préparation
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Ton cockpit s'active dès que la première synchronisation est terminée.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  if (!currentReport) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            title="Bienvenue sur ton cockpit"
            description="Connecte Twitch pour activer ton plan personnalisé."
          />
          <EmptyReportState />
        </PageContainer>
      </AppShell>
    );
  }

  const consistency = validateReportConsistency(currentReport, currentReport.report);
  if (!currentReport.is_demo && !consistency.isConsistent) {
    const displayName = account?.platform_display_name || account?.platform_login || "ta chaîne";
    return (
      <AppShell>
        <PageContainer>
          <PageHeader
            eyebrow="Cockpit"
            title={displayName}
            avatarLogin={account?.platform_login ?? null}
          />
          <ErrorState
            title="Ce rapport est incohérent"
            description="La dernière analyse ne correspond pas au compte connecté. Régénère un rapport propre."
            action={
              <Button onClick={handleManualRefresh} disabled={manualRefreshing}>
                <Sparkles className="h-4 w-4" /> Relancer une analyse
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  const report = currentReport.report;
  const score = report.score;
  const ap = report.affiliate_progress;
  const summary = report.channel_summary;

  const headerTitle = account?.platform_display_name || account?.platform_login || summary.display_name;

  const previous = history.find(
    (r) => r.id !== currentReport.id && r.platform_user_id === currentReport.platform_user_id,
  ) ?? null;
  const delta = previous ? score.overall - previous.report.score.overall : null;

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

  const signals = buildProgressionSignals(currentReport, previous);
  const oneCompetitor =
    report.competitor_groups.find((g) => g.type === "direct")?.matches[0] ??
    report.competitor_groups.flatMap((g) => g.matches)[0] ??
    null;
  const recommendedPlaybook = recommendPlaybookForReport(report);
  const foundation = diagnoseFoundationMode(report);
  const foundationActive = foundation.isActive && !currentReport.is_demo;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Cockpit"
          title={headerTitle}
          avatarUrl={report.identity?.avatar_url ?? null}
          avatarLogin={account?.platform_login ?? report.identity?.platform_login ?? null}
          badges={[
            ...(summary.broadcaster_type === "partner"
              ? [{ label: "Partenaire", variant: "accent" as const }]
              : summary.broadcaster_type === "affiliate"
                ? [{ label: "Affilié", variant: "secondary" as const }]
                : []),
            ...(summary.is_live ? [{ label: "Live", variant: "destructive" as const }] : []),
          ]}
          description="Voici comment avancer cette semaine."
          action={
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to={`/result?report_id=${currentReport.id}`}>
                <FileText className="h-3.5 w-3.5" /> Rapport complet
              </Link>
            </Button>
          }
        />

        {/* Top row: state strip — score / delta / sync.
            In foundation mode we keep only score + sync to reduce noise. */}
        <div
          className={
            foundationActive
              ? "mb-6 grid gap-3 sm:grid-cols-2"
              : "mb-6 grid gap-3 sm:grid-cols-3"
          }
        >
          <ScoreCard score={score.overall} />
          {!foundationActive && (
            <StatBlock
              label="Évolution"
              value={delta === null ? "—" : delta > 0 ? `+${delta}` : String(delta)}
              subtext={
                delta === null
                  ? "Première analyse"
                  : delta === 0
                    ? "Stable depuis la dernière analyse"
                    : "depuis la dernière analyse"
              }
              accent={delta !== null && delta > 0}
            />
          )}
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
        </div>

        {/* Followers warning if applicable */}
        {!followersAvailable && !currentReport.is_demo && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="flex flex-wrap items-center gap-3 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
              <p className="min-w-0 flex-1 text-xs text-foreground">
                {followersMissingScope
                  ? "La permission Twitch pour lire les followers est manquante. Reconnecte ton compte pour récupérer le vrai nombre."
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

        {/* Foundation mode: structuring coach takes over the top of the page.
            We surface the main blocker and a short ordered weekly sequence,
            and we demote optimization analytics until the channel produces
            enough signal to be worth optimizing. */}
        {foundationActive && (
          <>
            <FoundationModeBanner reasons={foundation.reasons} />
            <MainBlockerCard blocker={foundation.blocker} />
            <WeeklySequenceCard actions={foundation.sequence} />
          </>
        )}

        {/* Next milestone strip — optimization-mode only. */}
        {!foundationActive && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Prochain palier · {nextMilestone.label}
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
        )}

        {/* Main coaching: weekly plan + signals — optimization-mode only.
            In foundation mode the WeeklySequenceCard above replaces both. */}
        {!foundationActive && (
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WeeklyPlanCard report={report} compact />
            </div>
            <ProgressionSignalsCard signals={signals} />
          </div>
        )}

        {/* Action of the day from the report */}
        {report.next_best_action && (
          <Card className="mb-6 border-accent/30 bg-accent/5">
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
              {report.next_best_action.action && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.next_best_action.action}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Benchmark + Resource — optimization-mode only.
            In foundation mode we keep a single resource block (playbook)
            tied to the current blocker, no benchmark noise. */}
        {!foundationActive ? (
          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <div>
              <SectionHeader
                title="À observer cette semaine"
                description={
                  oneCompetitor
                    ? `Pourquoi ${oneCompetitor.display_name} compte pour toi : ${oneCompetitor.match_reasons[0]?.toLowerCase() ?? "profil proche du tien"}.`
                    : "Le match le plus actionnable cette semaine."
                }
                align="left"
              />
              {oneCompetitor ? (
                <StreamerBenchmarkCard
                  competitor={oneCompetitor}
                  groupLabel={
                    oneCompetitor.group === "direct"
                      ? "Direct"
                      : oneCompetitor.group === "catch-up"
                        ? "À rattraper"
                        : "Inspiration"
                  }
                  copyMechanic={
                    oneCompetitor.content_format === "ranked"
                      ? "Une session ranked dédiée par semaine, sans variety au milieu."
                      : oneCompetitor.content_format === "casting"
                        ? "Un format d'analyse court (10 min) en début ou fin de stream."
                        : oneCompetitor.content_format === "chill"
                          ? "Un créneau 'chill' identifiable dans le planning."
                          : undefined
                  }
                />
              ) : (
                <Card>
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    Pas de concurrent direct très proche pour le moment.
                    Explore les classements pour repérer une chaîne à observer.
                  </CardContent>
                </Card>
              )}
              <Button asChild variant="ghost" size="sm" className="mt-2">
                <Link to="/competitors">
                  Tous les concurrents <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div>
              <SectionHeader
                title="Ressource recommandée"
                description="Liée à ta faiblesse principale détectée."
                align="left"
              />
              <PlaybookCard playbook={recommendedPlaybook} />
              <Button asChild variant="ghost" size="sm" className="mt-2">
                <Link to="/playbooks">
                  Tous les playbooks <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <SectionHeader
              title="Ressource pour débloquer cette semaine"
              description="Un playbook court, lié à ton blocage principal."
              align="left"
            />
            <PlaybookCard playbook={recommendedPlaybook} />
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
