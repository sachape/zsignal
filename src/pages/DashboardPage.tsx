import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  AlertCircle,
  Sparkles,
  X,
  CalendarCheck,
  BarChart3,
  Users as UsersIcon,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import ScoreInsightCard from "@/components/ScoreInsightCard";
import EmptyReportState from "@/components/EmptyReportState";
import { ErrorState, LoadingState } from "@/components/StateView";
import SyncStatusCard, { formatSyncRelative, type SyncState } from "@/components/SyncStatusCard";
import FoundationModeBanner from "@/components/FoundationModeBanner";
import MainBlockerCard from "@/components/MainBlockerCard";
import WeeklySequenceCard from "@/components/WeeklySequenceCard";
import NextMilestoneCard from "@/components/NextMilestoneCard";
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
import {
  getLiveCockpitSnapshot,
  listLiveSessions,
  type LiveSession,
  type LiveCockpitSnapshot,
} from "@/services/liveSessions";
import LiveStatusCard from "@/components/LiveStatusCard";
import PreLiveChecklistCard from "@/components/PreLiveChecklistCard";
import SmartAlertsCard from "@/components/SmartAlertsCard";
import WeeklyMilestoneCard from "@/components/WeeklyMilestoneCard";
import InactivityRelanceCard from "@/components/InactivityRelanceCard";
import LastVsAverageCard from "@/components/LastVsAverageCard";
import { resolveCockpitFocusSlot, type CockpitFocusSlot } from "@/services/cockpitFocus";
import { onboardingFlags } from "@/services/onboardingFlags";
import { getScoreTier, getTierTheme, buildScoreNarrative } from "@/services/streamScoreTier";
import { isSessionRecent } from "@/services/postGenerator";
import LivePostGenerator from "@/components/LivePostGenerator";
import EventSubCockpitSection from "@/components/EventSubCockpitSection";
import ScopeDriftBanner from "@/components/ScopeDriftBanner";
import { computeStreak } from "@/services/streakEngine";
import { computeMaturityLevel } from "@/services/maturityLevel";
import { evaluateBadges, markBadgesSeen } from "@/services/badgeEngine";
import {
  generateWeeklyQuests,
  toggleManualQuest,
  type WeeklyQuests,
} from "@/services/questEngine";
import StreakBadge from "@/components/StreakBadge";
import BadgeGrid from "@/components/BadgeGrid";
import WeeklyQuestCard from "@/components/WeeklyQuestCard";
import ShareScoreButton from "@/components/ShareScoreButton";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const DashboardPage = () => {
  const { user } = useAuth();
  const { isConnected, account, loading: connectionLoading } = useTwitchConnection();
  const [searchParams] = useSearchParams();
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncSnapshot, setSyncSnapshot] = useState<SyncSnapshot | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveCockpitSnapshot | null>(null);
  const [focusSlot, setFocusSlot] = useState<CockpitFocusSlot>("none");
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [ringMounted, setRingMounted] = useState(false);
  const [showPostGen, setShowPostGen] = useState(false);
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuests | null>(null);

  const welcomeRequested = searchParams.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(
    () => welcomeRequested && !onboardingFlags.isCockpitWelcomeDismissed(),
  );
  const dismissWelcome = useCallback(() => {
    onboardingFlags.dismissCockpitWelcome();
    setShowWelcome(false);
  }, []);
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

    try {
      const live = await getLiveCockpitSnapshot(user.id);
      setLiveSnapshot(live);
      const sessions = await listLiveSessions(user.id, 60);
      setAllSessions(sessions);
      setFocusSlot(resolveCockpitFocusSlot(live.current, sessions.slice(0, 14)));
    } catch {
      setLiveSnapshot(null);
      setAllSessions([]);
      setFocusSlot("none");
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

  // Replay ring animation whenever a new report is loaded.
  useEffect(() => {
    setRingMounted(false);
    const id = requestAnimationFrame(() => setRingMounted(true));
    return () => cancelAnimationFrame(id);
  }, [currentReport?.id]);

  // Sync weekly quests whenever sessions or report changes
  useEffect(() => {
    if (!user || !currentReport) return;
    const quests = generateWeeklyQuests(
      allSessions,
      currentReport.report,
      user.id,
    );
    setWeeklyQuests(quests);
  }, [user, allSessions, currentReport]);

  const handleQuestToggle = useCallback(
    (questId: string) => {
      if (!user || !weeklyQuests) return;
      toggleManualQuest(user.id, weeklyQuests.weekKey, questId);
      setWeeklyQuests(
        generateWeeklyQuests(allSessions, currentReport?.report ?? null, user.id),
      );
    },
    [user, weeklyQuests, allSessions, currentReport],
  );

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
                  On lit ta chaîne
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Ton cockpit s'active dès la fin de la première synchronisation. Ça se passe tout seul, tu peux laisser la page ouverte.
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

  const foundation = diagnoseFoundationMode(report);
  const foundationActive = foundation.isActive && !currentReport.is_demo;

  // Sprint 1 — gamification derived state (already hoisted above early returns)

  // Premium design derived state
  const tier = getScoreTier(score.overall);
  const theme = getTierTheme(tier);
  const narrative = buildScoreNarrative(score);
  const ringRadius = 65;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = (score.overall / 100) * ringCircumference;
  const avatarUrl = report.identity?.avatar_url ?? null;
  const platformLogin = account?.platform_login ?? report.identity?.platform_login ?? null;
  const categoryFact = Array.isArray(report.facts)
    ? (report.facts.find((f) => f.key === "dominant_category")?.value as string | undefined)
    : undefined;
  const displayCategory = (categoryFact?.trim() && categoryFact.trim() !== "unknown") ? categoryFact.trim() : null;

  const strokeColor = `hsl(${theme.strokeVar})`;

  return (
    <AppShell>
      <PageContainer>
        {/* Welcome banner */}
        {showWelcome && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:items-center sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground sm:text-[0.95rem]">
                Ton premier diagnostic est prêt.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Cette page devient ta home hebdo : un blocage à lever, un objectif à viser, rien de plus.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={dismissWelcome}
              aria-label="Fermer le message de bienvenue"
              className="-mr-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Identity strip */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-64 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.06),transparent_60%)]" aria-hidden />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-muted ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={headerTitle}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">
                      {headerTitle.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {summary.is_live && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive ring-2 ring-background"
                    aria-hidden
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
                    {headerTitle}
                  </h1>
                  {summary.broadcaster_type === "partner" && (
                    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Partenaire
                    </span>
                  )}
                  {summary.broadcaster_type === "affiliate" && (
                    <span className="shrink-0 rounded-full border border-border/50 bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Affilié
                    </span>
                  )}
                  {summary.is_live && (
                    <span className="shrink-0 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                      En live
                    </span>
                  )}
                  <StreakBadge streak={streakData} variant="compact" />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <p className="truncate text-sm text-muted-foreground">
                    {platformLogin ? `@${platformLogin}` : "Twitch"}
                    {displayCategory ? ` · ${displayCategory}` : ""}
                  </p>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    title={maturityData.description}
                  >
                    <span aria-hidden>{maturityData.icon}</span>
                    {maturityData.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Analysé {formatSyncRelative(currentReport.created_at)}
                  {currentReport.is_demo && (
                    <span className="ml-1.5 rounded-sm bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                      démo
                    </span>
                  )}
                  {delta !== null && delta !== 0 && (
                    <span
                      className={`ml-2 font-semibold ${delta > 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {delta > 0 ? `+${delta}` : delta} pts
                    </span>
                  )}
                  {delta === 0 && (
                    <span className="ml-2 font-medium text-muted-foreground">Stable</span>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <ShareScoreButton
                score={score}
                displayName={headerTitle}
                login={platformLogin}
                date={formatDate(currentReport.created_at)}
                variant="icon"
              />
              <Button asChild size="sm">
                <Link to={`/result?report_id=${currentReport.id}`}>
                  <FileText className="h-3.5 w-3.5" />
                  Rapport complet
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Score bento: large ring left, focus content right */}
        <div className="mb-6 grid gap-4 md:grid-cols-[220px_1fr]">
          {/* Score ring column */}
          <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 10%, hsl(${theme.strokeVar} / 0.08), transparent 65%)`,
              }}
              aria-hidden
            />

            {/* Ring */}
            <div className="relative h-40 w-40">
              <svg
                viewBox="0 0 160 160"
                className="h-full w-full -rotate-90"
                aria-label={`StreamScore ${score.overall} sur 100`}
              >
                {/* Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={ringRadius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                />
                {/* Progress */}
                <circle
                  cx="80"
                  cy="80"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  style={{
                    stroke: strokeColor,
                    strokeDashoffset: ringMounted
                      ? ringCircumference - ringProgress
                      : ringCircumference,
                    transition: ringMounted
                      ? "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)"
                      : "none",
                    filter: `drop-shadow(0 0 8px ${strokeColor})`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold tracking-tight ${theme.textClass}`}>
                  {score.overall}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Tier badge */}
            <div
              className={`relative mt-3 rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider ${theme.surfaceClass}`}
            >
              {theme.label}
            </div>

            {/* Delta */}
            {delta !== null && (
              <p
                className={`relative mt-2 text-xs font-semibold ${
                  delta > 0
                    ? "text-primary"
                    : delta < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {delta > 0 ? `↑ +${delta} pts` : delta < 0 ? `↓ ${delta} pts` : "→ Stable"}
              </p>
            )}

            {/* Streak card */}
            <StreakBadge streak={streakData} variant="card" />

            {/* Mini dimension breakdown */}
            {narrative.miniBreakdown.length > 0 && (
              <div className="relative mt-5 w-full space-y-3">
                {narrative.miniBreakdown.map((dim) => {
                  const dimTheme = getTierTheme(dim.tier);
                  return (
                    <div key={dim.label}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{dim.label}</span>
                        <span className={`font-semibold ${dimTheme.textClass}`}>{dim.score}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${dimTheme.progressClass}`}
                          style={{ width: ringMounted ? `${dim.score}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: sync status + insight or foundation content */}
          <div className="space-y-3">
            <SyncStatusCard
              state={syncSnapshot?.state ?? ("synchronized" as SyncState)}
              lastUpdatedLabel={
                currentReport
                  ? `${formatDate(currentReport.created_at)} · ${formatSyncRelative(currentReport.created_at)}${currentReport.is_demo ? " · démo" : ""}${
                      delta === null
                        ? ""
                        : delta === 0
                          ? " · stable"
                          : delta > 0
                            ? ` · +${delta} pts`
                            : ` · ${delta} pts`
                    }`
                  : null
              }
              onManualRefresh={handleManualRefresh}
              manualBusy={manualRefreshing}
            />
            {foundationActive ? (
              <>
                <FoundationModeBanner reasons={foundation.reasons} />
                <MainBlockerCard blocker={foundation.blocker} reportId={currentReport.id} />
              </>
            ) : (
              score.breakdown.length > 0 && <ScoreInsightCard score={score} compact />
            )}
          </div>
        </div>

        {/* Foundation weekly sequence — full width if active */}
        {foundationActive && (
          <div className="mb-6">
            <WeeklySequenceCard actions={foundation.sequence} showPlanLink />
          </div>
        )}

        {/* Followers scope warning */}
        {!followersAvailable && !currentReport.is_demo && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="flex flex-wrap items-center gap-3 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
              <p className="min-w-0 flex-1 text-xs text-foreground">
                {followersMissingScope
                  ? "Ton total de followers n'est pas encore lisible. Reconnecte Twitch pour l'afficher avec précision."
                  : "Ton total de followers n'a pas pu être lu lors de cette analyse. Relance une analyse pour réessayer."}
              </p>
              {followersMissingScope && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/connect-twitch">Reconnecter Twitch</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Post generator sheet */}
        {liveSnapshot?.last && (
          <LivePostGenerator
            session={liveSnapshot.last}
            debrief={liveSnapshot.lastDebrief}
            open={showPostGen}
            onClose={() => setShowPostGen(false)}
          />
        )}

        {/* Weekly quests — only outside foundation mode */}
        {!foundationActive && weeklyQuests && (
          <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} />
        )}

        {/* Live stack */}
        <div className="mb-6 space-y-2.5">
          <LiveStatusCard
            current={liveSnapshot?.current ?? null}
            last={liveSnapshot?.last ?? null}
            lastDebrief={liveSnapshot?.lastDebrief ?? null}
          />
          <LastVsAverageCard current={liveSnapshot?.current ?? null} />
          {focusSlot === "milestone" && (
            <WeeklyMilestoneCard current={liveSnapshot?.current ?? null} />
          )}
          {focusSlot === "inactivity" && (
            <InactivityRelanceCard current={liveSnapshot?.current ?? null} />
          )}
          <PreLiveChecklistCard
            current={liveSnapshot?.current ?? null}
            last={liveSnapshot?.last ?? null}
            lastDebrief={liveSnapshot?.lastDebrief ?? null}
          />
          <SmartAlertsCard current={liveSnapshot?.current ?? null} />
        </div>

        {/* EventSub product signals */}
        <div className="mb-6 space-y-3">
          <ScopeDriftBanner
            broadcasterUserId={account?.platform_user_id ?? null}
          />
          <EventSubCockpitSection
            broadcasterUserId={account?.platform_user_id ?? null}
          />
        </div>

        {/* Post generator trigger — visible 72h after a live with debrief */}
        {liveSnapshot?.last &&
          liveSnapshot.lastDebrief &&
          !liveSnapshot.current &&
          isSessionRecent(liveSnapshot.last.ended_at) && (
            <div className="mb-6">
              <button
                onClick={() => setShowPostGen(true)}
                className="group relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card/40 p-4 text-left backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.04] hover:shadow-[0_0_32px_-8px_hsl(var(--primary)/0.3)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,hsl(var(--primary)/0.08),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">✍️</span>
                      <span className="text-sm font-semibold text-foreground">
                        Contenu à publier
                      </span>
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        Nouveau
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {liveSnapshot.last.category_name
                        ? `Posts prêts pour ton live ${liveSnapshot.last.category_name} — tweet, discord, caption, annonce`
                        : "Posts prêts à partir de ton dernier live — tweet, discord, caption, annonce"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </button>
            </div>
          )}

        {/* Next milestone */}
        <NextMilestoneCard
          milestone={nextMilestone}
          reportId={currentReport.id}
          foundationActive={foundationActive}
        />

        {/* Badges */}
        <BadgeGrid badges={badges} />

        {/* Premium shortcut cards */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                to: `/result?report_id=${currentReport.id}`,
                icon: BarChart3,
                label: "Diagnostic détaillé",
                desc: "Pourquoi ton score est ce qu'il est.",
              },
              {
                to: "/plan",
                icon: CalendarCheck,
                label: "Plan de la semaine",
                desc: "Ce que tu exécutes maintenant.",
              },
              {
                to: "/competitors",
                icon: UsersIcon,
                label: "Benchmark",
                desc: "Ce que tu observes chez les autres.",
              },
            ] as const
          ).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.04] hover:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,hsl(var(--primary)/0.10),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <item.icon className="h-4 w-4 shrink-0 text-primary" />
                    {item.label}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
