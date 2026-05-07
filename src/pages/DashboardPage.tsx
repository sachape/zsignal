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
  Star,
  Radio,
  BookOpen,
  Trophy,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import EmptyReportState from "@/components/EmptyReportState";
import { ErrorState, LoadingState } from "@/components/StateView";
import SyncStatusCard, { formatSyncRelative, type SyncState } from "@/components/SyncStatusCard";
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
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";
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
import BadgeStrip from "@/components/BadgeStrip";
import WeeklyQuestCard from "@/components/WeeklyQuestCard";
import ShareScoreButton from "@/components/ShareScoreButton";
import WeeklyDigestCard from "@/components/WeeklyDigestCard";

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

  // Sprint 1 — gamification derived state. Hooks must run unconditionally,
  // so we compute them before any early return. Values are safe defaults
  // when currentReport / user is missing and aren't read in those branches.
  const streakData = useMemo(() => computeStreak(allSessions), [allSessions]);
  const maturityData = useMemo(
    () =>
      computeMaturityLevel(
        currentReport?.report.score.overall ?? 0,
        allSessions.filter((s) => s.status === "ended").length,
      ),
    [currentReport, allSessions],
  );
  const badges = useMemo(() => {
    if (!user || !currentReport) return [];
    const b = evaluateBadges({ sessions: allSessions, report: currentReport.report, userId: user.id });
    const newIds = b.filter((badge) => badge.isNew).map((badge) => badge.id);
    if (newIds.length > 0) markBadgesSeen(user.id, newIds);
    return b;
  }, [allSessions, currentReport, user]);

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

  const tier = getScoreTier(score.overall);
  const theme = getTierTheme(tier);
  const avatarUrl = report.identity?.avatar_url ?? null;
  const platformLogin = account?.platform_login ?? report.identity?.platform_login ?? null;
  const categoryFact = Array.isArray(report.facts)
    ? (report.facts.find((f) => f.key === "dominant_category")?.value as string | undefined)
    : undefined;
  const displayCategory = (categoryFact?.trim() && categoryFact.trim() !== "unknown") ? categoryFact.trim() : null;

  const endedSessions = allSessions.filter((s) => s.status === "ended").length;
  const navHub = [
    {
      to: "/analyse",
      icon: BarChart3,
      label: "Analyse",
      desc: "Diagnostic complet et évolution du score.",
      stat: `${score.overall} pts`,
    },
    {
      to: "/plan",
      icon: CalendarCheck,
      label: "Plan de la semaine",
      desc: "Tes actions prioritaires.",
      stat: foundationActive && foundation.sequence.length > 0
        ? `${foundation.sequence.length} actions`
        : null,
    },
    {
      to: "/progression",
      icon: Star,
      label: "Progression",
      desc: "Tes paliers et objectifs.",
      stat: `${nextMilestone.current} / ${nextMilestone.target} ${nextMilestone.label.toLowerCase()}`,
    },
    {
      to: "/lives",
      icon: Radio,
      label: "Lives",
      desc: "Tes sessions et performances.",
      stat: endedSessions > 0 ? `${endedSessions} session${endedSessions > 1 ? "s" : ""}` : null,
    },
    {
      to: "/classements",
      icon: Trophy,
      label: "Classements",
      desc: "Ta position parmi les streamers.",
      stat: null,
    },
    {
      to: "/playbooks",
      icon: BookOpen,
      label: "Playbooks",
      desc: "Des guides d'exécution pratiques.",
      stat: "16 guides",
    },
  ];

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
        <div className="animate-fade-up mb-6">
          <p className="mb-5 sm:mb-7 text-[32px] font-medium text-foreground">
            {new Date().getHours() >= 19 ? "Bonsoir," : "Bonjour,"}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                {currentReport.is_demo && (
                  <span className="mt-1 inline-flex rounded-sm bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                    démo
                  </span>
                )}
                {/* Badge strip */}
                <div className="mt-2">
                  <BadgeStrip badges={badges} />
                </div>
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
              <Button asChild size="sm" variant="outline">
                <Link to="/analyse">
                  <FileText className="h-3.5 w-3.5" />
                  Voir l'analyse
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* StreamScore compact status */}
        <Link
          to="/analyse"
          className="group animate-fade-up mb-6 flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-white/[0.07] bg-card/40 px-4 py-3 backdrop-blur-xl transition-all hover:border-primary/25 hover:shadow-[0_0_30px_hsl(var(--primary)/0.08)]"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${theme.surfaceClass}`}>
              <span className={`text-base font-bold tabular-nums ${theme.textClass}`}>{score.overall}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">StreamScore</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${theme.textClass}`}>{theme.label}</span>
                {delta !== null && (delta !== 0 || score.overall >= 40) && (
                  <span className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground/50"}`}>
                    {delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : "stable"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground transition-colors group-hover:bg-muted/60">
            Voir l'analyse
            <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        {/* Weekly digest — after score context, before actions */}
        <WeeklyDigestCard
          report={currentReport}
          userId={user.id}
          previousScore={previous?.report?.score?.overall ?? null}
        />

        {/* Foundation weekly sequence — full width if active */}
        {foundationActive && (
          <div className="mb-6">
            <WeeklySequenceCard actions={foundation.sequence} showPlanLink={endedSessions > 0} />
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

        {/* Navigation hub — all cockpit surfaces at a glance */}
        <div className="animate-fade-up mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" style={{ animationDelay: "120ms" }}>
          {navHub.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-card/40 p-4 backdrop-blur-xl transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_40px_hsl(var(--primary)/0.12)] sm:p-5"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.08),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 transition-colors group-hover:bg-primary/25">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                {item.stat && (
                  <p className="mt-2 text-[11px] font-semibold tabular-nums text-primary/70">{item.stat}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

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
          <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
            <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} />
          </div>
        )}

        {/* Live stack */}
        <div className="animate-fade-up mb-6 space-y-2.5" style={{ animationDelay: '220ms' }}>
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
        <div className="mb-4">
          <NextMilestoneCard
            milestone={nextMilestone}
            reportId={currentReport.id}
            foundationActive={foundationActive}
          />
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
