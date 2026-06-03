import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePlan, invalidatePlanCache, triggerPlanRefresh } from "@/hooks/usePlan";
import { toast } from "sonner";
import { analytics } from "@/services/analytics";
import { InlineLock } from "@/components/PaywallGate";
import {
  ArrowRight,
  FileText,
  AlertCircle,
  Sparkles,
  X,
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
import { evaluateTieredBadges } from "@/services/badgeEngine";
import { loadTotalXp, cacheXpData } from "@/services/xpEngine";
import {
  generateWeeklyQuests,
  toggleManualQuest,
  loadQuestChecks,
  getWeekKey,
  type WeeklyQuests,
} from "@/services/questEngine";
import StreakBadge from "@/components/StreakBadge";
import WeeklyQuestCard from "@/components/WeeklyQuestCard";
import ShareScoreButton from "@/components/ShareScoreButton";
import WeeklyDigestCard from "@/components/WeeklyDigestCard";
import OnboardingGuide from "@/components/OnboardingGuide";
import { getOnboardingState } from "@/services/onboardingState";
import NetworksTeaser from "@/components/NetworksTeaser";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const DashboardPage = () => {
  const { user } = useAuth();
  const { isPro, plan, loading: planLoading } = usePlan();
  const { isConnected, account, loading: connectionLoading } = useTwitchConnection();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [greeting, setGreeting] = useState(() =>
    new Date().getHours() >= 19 ? "Bonsoir," : "Bonjour,"
  );

  const welcomeRequested = searchParams.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(
    () => welcomeRequested && !onboardingFlags.isCockpitWelcomeDismissed(),
  );
  // Auto-dismiss on first view so the banner never re-appears on future Twitch re-links.
  useEffect(() => {
    if (showWelcome) onboardingFlags.dismissCockpitWelcome();
  }, [showWelcome]);
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);


  // Checkout success: toast, clean URL, then poll until plan is confirmed Pro
  const checkoutPending = useRef(searchParams.get("checkout") === "success");
  useEffect(() => {
    if (searchParams.get("checkout") !== "success" || !user) return;
    invalidatePlanCache(user.id);
    toast.success("Abonnement activé ! Bienvenue sur ton nouveau plan.", {
      description: "Toutes les fonctionnalités Pro sont maintenant débloquées.",
      duration: 6000,
    });
    setSearchParams((p) => { p.delete("checkout"); return p; }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fire checkout_completed once plan confirmed from DB.
  // Polls via triggerPlanRefresh if the Stripe webhook is slow (new-tab flow).
  useEffect(() => {
    if (!checkoutPending.current || !user) return;
    if (isPro && !planLoading) {
      analytics.checkoutCompleted(plan);
      checkoutPending.current = false;
      return;
    }
    if (planLoading) return;
    // Plan loaded but still "free" — webhook hasn't fired yet, poll every 3s (max 1 min)
    let attempts = 0;
    const interval = setInterval(() => {
      if (attempts++ >= 20 || !checkoutPending.current) { clearInterval(interval); return; }
      triggerPlanRefresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, isPro, planLoading, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  // null = still loading from DB; true/false = resolved. Avoids flicker for completed users.
  const [showGuide, setShowGuide] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setShowGuide(false);
      return;
    }
    let active = true;
    getOnboardingState().then((state) => {
      if (!active) return;
      setShowGuide(!state.is_completed);
    });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    const t = setInterval(() => {
      setGreeting(new Date().getHours() >= 19 ? "Bonsoir," : "Bonjour,");
    }, 60_000);
    return () => clearInterval(t);
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
      const [live, totalXp] = await Promise.all([
        getLiveCockpitSnapshot(user.id),
        loadTotalXp(),
      ]);
      setLiveSnapshot(live);
      cacheXpData(user.id, totalXp);
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


  // Manual quest checks loaded from Lovable Cloud (source of truth)
  const [manualChecks, setManualChecks] = useState<Set<string>>(new Set());

  // Load persisted quest checks for the current week
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadQuestChecks(getWeekKey()).then((checks) => {
      if (!cancelled) setManualChecks(checks);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Sync weekly quests whenever sessions, report or checks change
  useEffect(() => {
    if (!user || !currentReport) return;
    const quests = generateWeeklyQuests(
      allSessions,
      currentReport.report,
      manualChecks,
    );
    setWeeklyQuests(quests);
  }, [user, allSessions, currentReport, manualChecks]);

  const handleQuestToggle = useCallback(
    async (questId: string) => {
      if (!user || !weeklyQuests) return;
      const wasChecked = manualChecks.has(questId);
      // Optimistic update
      const next = new Set(manualChecks);
      if (wasChecked) next.delete(questId);
      else next.add(questId);
      setManualChecks(next);
      const newState = await toggleManualQuest(
        user.id,
        weeklyQuests.weekKey,
        questId,
        wasChecked,
      );
      // Reconcile with server result
      setManualChecks((prev) => {
        const reconciled = new Set(prev);
        if (newState) reconciled.add(questId);
        else reconciled.delete(questId);
        return reconciled;
      });
    },
    [user, weeklyQuests, manualChecks],
  );

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    if (
      user &&
      account?.platform_user_id &&
      account.platform_login &&
      syncSnapshot?.lastJobStatus === "queued"
    ) {
      await processPendingForAccount(
        user.id,
        account.platform_user_id,
        account.platform_login,
        account.platform_display_name ?? null,
      );
    } else {
      await enqueueRefreshForSelf("manual");
    }
    await loadDashboardState();
    setManualRefreshing(false);
  }, [manualRefreshing, loadDashboardState, user, account, syncSnapshot]);

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
  useMemo(() => {
    if (!user || !currentReport) return;
    const tiered = evaluateTieredBadges({ sessions: allSessions, report: currentReport.report, userId: user.id });
    if (tiered.some((tb) => tb.tiers.some((t) => t.isNew))) {
      try { localStorage.setItem(`quetes_new_${user.id}`, "1"); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent("quetes-notif-update"));
    }
  }, [allSessions, currentReport, user]);

  if (loading || showGuide === null) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (showGuide === true) {
    const guideDisplayName =
      account?.platform_display_name ||
      account?.platform_login ||
      currentReport?.report?.channel_summary?.display_name ||
      "toi";
    return (
      <AppShell>
        <PageContainer size="sm">
          <OnboardingGuide
            userId={user!.id}
            displayName={guideDisplayName}
            isConnected={isConnected}
            hasReport={!!currentReport}
            onComplete={() => setShowGuide(false)}
          />
        </PageContainer>
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
          <EmptyReportState
            ctaLabel="Connecter Twitch"
            ctaHref="/connect-twitch"
          />
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
                Ton diagnostic est prêt.
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
        <div className="mb-6">
          <DashboardQuickActions />
        </div>

        {/* Identity strip */}
        <div className="animate-fade-up mb-6">
          <p className="mb-5 sm:mb-7 text-[32px] font-medium text-foreground">
            {greeting}
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

        {/* Post generator sheet */}
        {liveSnapshot?.last && (
          <LivePostGenerator
            session={liveSnapshot.last}
            debrief={liveSnapshot.lastDebrief}
            open={showPostGen}
            onClose={() => setShowPostGen(false)}
          />
        )}

        {/* Live stack — action principale, en priorité */}
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">Live</p>
        {isPro ? (
          <div className="animate-fade-up mb-6 space-y-2.5" style={{ animationDelay: '120ms' }}>
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
        ) : (
          <div className="animate-fade-up mb-6" style={{ animationDelay: '120ms' }}>
            <InlineLock
              feature="Cockpit Live — Pro"
              description="Suivi en direct, debrief automatique, alertes intelligentes et checklist pré-live."
              blurHeight="140px"
            >
              <div className="space-y-2.5">
                <LiveStatusCard
                  current={liveSnapshot?.current ?? null}
                  last={liveSnapshot?.last ?? null}
                  lastDebrief={liveSnapshot?.lastDebrief ?? null}
                />
                <LastVsAverageCard current={liveSnapshot?.current ?? null} />
              </div>
            </InlineLock>
          </div>
        )}

        {/* Weekly quests — only outside foundation mode */}
        {!foundationActive && weeklyQuests && (
          <div className="animate-fade-up mb-6" style={{ animationDelay: '160ms' }}>
            {isPro ? (
              <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} linkToQuests />
            ) : (
              <InlineLock
                feature="Quêtes hebdomadaires — Pro"
                description="Suis tes quêtes de la semaine et accumule de l'XP."
                blurHeight="120px"
              >
                <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} linkToQuests />
              </InlineLock>
            )}
          </div>
        )}

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

        {/* Réseaux connectés teaser */}
        <div className="mb-6">
          <NetworksTeaser />
        </div>

        {/* Next milestone */}
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">Progression</p>
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
