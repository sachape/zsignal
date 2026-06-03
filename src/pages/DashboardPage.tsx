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
  Target,
  Radio,
  Orbit,
  ShieldCheck,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import DashboardQuickActions from "@/components/DashboardQuickActions";
import EmptyReportState from "@/components/EmptyReportState";
import { ErrorState, LoadingState } from "@/components/StateView";
import { formatSyncRelative } from "@/components/SyncStatusCard";
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
  const nextAction = report.next_best_action;
  const syncLabel =
    syncSnapshot?.state === "synchronized"
      ? "Données à jour"
      : syncSnapshot?.state === "update_in_progress" ||
          syncSnapshot?.state === "first_analysis_in_progress"
        ? "Sync en cours"
        : syncSnapshot?.state === "no_analysis"
          ? "Première analyse en attente"
          : "Dernière sync à vérifier";
  const syncDetail = syncSnapshot
    ? formatSyncRelative(
        syncSnapshot.lastJobCompletedAt ??
          syncSnapshot.reportCreatedAt ??
          currentReport.created_at,
      )
    : `Rapport généré le ${formatDate(currentReport.created_at)}`;
  const liveHeadline = liveSnapshot?.current
    ? `${liveSnapshot.current.peak_viewers ?? 0} viewers en direct`
    : liveSnapshot?.last
      ? "Dernier live disponible"
      : "Aucun live récent";


  const endedSessions = allSessions.filter((s) => s.status === "ended").length;

  const sessions30d = allSessions.filter((s) => {
    const d = new Date(s.started_at ?? "");
    return !isNaN(d.getTime()) && Date.now() - d.getTime() < 30 * 86_400_000;
  });
  const lives30d = sessions30d.length;
  const viewersMoy =
    sessions30d.length > 0
      ? Math.round(
          sessions30d.reduce((sum, s) => sum + (s.avg_viewers ?? 0), 0) /
            sessions30d.length,
        )
      : null;

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
              <p className="text-sm font-semibold text-foreground">
                Ton diagnostic est prêt.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cette page devient ta home hebdo : un blocage à lever, un objectif à viser, rien de plus.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={dismissWelcome} aria-label="Fermer" className="-mr-1 shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {/* ── Profile header ─────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="h-11 w-11 overflow-hidden rounded-xl bg-muted ring-1 ring-white/10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={headerTitle} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
                    {headerTitle.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {summary.is_live && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive ring-2 ring-background">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold text-foreground">{headerTitle}</h1>
                {summary.broadcaster_type === "partner" && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Partenaire</span>
                )}
                {summary.broadcaster_type === "affiliate" && (
                  <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Affilié</span>
                )}
                {summary.is_live && (
                  <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">● En live</span>
                )}
                <StreakBadge streak={streakData} variant="compact" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {platformLogin ? `@${platformLogin}` : "Twitch"}
                {displayCategory ? ` · ${displayCategory}` : ""}
                {" · "}
                <span title={maturityData.description}>{maturityData.icon} {maturityData.label}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShareScoreButton score={score} displayName={headerTitle} login={platformLogin} date={formatDate(currentReport.created_at)} variant="icon" />
            <Button asChild size="sm" variant="outline" className="border-white/10">
              <Link to="/analyse"><FileText className="h-3.5 w-3.5" />Voir l'analyse</Link>
            </Button>
          </div>
        </div>

        {/* ── KPI Stats row ───────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* StreamScore */}
          <Link
            to="/analyse"
            className={`group rounded-2xl border border-white/[0.08] bg-card/60 p-4 transition-all hover:border-primary/30 hover:bg-card/80 ${score.overall < 40 ? "border-l-2 border-l-destructive/50" : score.overall < 65 ? "border-l-2 border-l-amber-500/50" : "border-l-2 border-l-primary/50"}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">StreamScore</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold tabular-nums ${theme.textClass}`}>{score.overall}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.textClass}`}>{theme.label}</p>
            {delta !== null && delta !== 0 && (
              <p className={`mt-1 text-[11px] font-medium ${delta > 0 ? "text-primary" : "text-destructive"}`}>
                {delta > 0 ? `+${delta}` : delta} pts
              </p>
            )}
            {delta === 0 && <p className="mt-1 text-[11px] text-muted-foreground">Stable</p>}
          </Link>

          {/* Lives 30j */}
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Lives (30j)</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{lives30d}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {lives30d === 0 ? "Aucun stream récent" : lives30d === 1 ? "session" : "sessions"}
            </p>
          </div>

          {/* Viewers moy */}
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Viewers moy.</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
              {liveSnapshot?.current ? (liveSnapshot.current.peak_viewers ?? "—") : (viewersMoy ?? "—")}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {liveSnapshot?.current ? "en direct" : sessions30d.length > 0 ? "moy. 30j" : "pas de données"}
            </p>
          </div>

          {/* Followers */}
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Followers</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
              {followersAvailable ? (summary.follower_count != null ? summary.follower_count.toLocaleString("fr-FR") : "—") : "—"}
            </p>
            {!followersAvailable && (
              <p className="mt-0.5 text-[10px] text-amber-400">Scope manquant</p>
            )}
            {followersAvailable && ap.followers.target && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/60">
                <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${Math.min(100, Math.round(((ap.followers.current ?? 0) / ap.followers.target) * 100))}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Main intelligence (2-col) ──────────────────────────────── */}
        <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_340px]">
          {/* LEFT: Blocker + Next action + Milestone */}
          <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_45%)] bg-card/50 p-5">
            <div className="space-y-5">
              {/* Blocker */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
                  Point de blocage principal
                </p>
                <div className="rounded-xl border border-primary/15 bg-primary/[0.05] p-4">
                  <p className="text-base font-bold text-foreground leading-tight">{report.weak_point.label}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{report.weak_point.description}</p>
                </div>
              </div>

              {/* Next action */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
                  Prochaine action
                </p>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.06]">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">{nextAction.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{nextAction.action || nextAction.reason}</p>
                    <Button asChild variant="ghost" size="sm" className="mt-2 -ml-1.5 h-auto gap-1 px-1.5 text-xs text-primary hover:bg-primary/10">
                      <Link to="/plan">Voir le plan complet <ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Milestone */}
              <div className="border-t border-border/40 pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
                  Prochain palier
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{nextMilestone.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{nextMilestone.current}/{nextMilestone.target} · {nextMilestone.pct}%</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${nextMilestone.pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Status + Priorities */}
          <div className="flex flex-col gap-3">
            {/* Live status */}
            <div className={`rounded-xl border px-4 py-3 ${summary.is_live ? "border-destructive/25 bg-destructive/[0.04]" : "border-border/50 bg-card/40"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className={`h-3.5 w-3.5 ${summary.is_live ? "text-destructive" : "text-muted-foreground/60"}`} />
                  <p className="text-sm font-medium text-foreground">
                    {summary.is_live ? "Live en cours" : "Prochain live"}
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="h-auto px-0 text-xs text-primary hover:bg-transparent">
                  <Link to={summary.is_live ? "/lives" : "/live-setup"}>
                    {summary.is_live ? "Cockpit →" : "Préparer →"}
                  </Link>
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.is_live
                  ? `${liveSnapshot?.current?.peak_viewers ?? "—"} viewers · ${liveSnapshot?.current?.start_title ?? "Live en cours"}`
                  : liveSnapshot?.last
                    ? `Dernier : ${liveSnapshot.last.start_title || liveSnapshot.last.category_name || "sans titre"}`
                    : "Prépare le prochain live en 60 secondes."}
              </p>
            </div>

            {/* This week */}
            <div className="flex-1 rounded-xl border border-border/50 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Cette semaine</p>
                <Button asChild size="sm" variant="ghost" className="h-auto px-0 text-xs text-primary hover:bg-transparent">
                  <Link to="/plan">Plan →</Link>
                </Button>
              </div>
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{nextAction.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">{nextAction.action || nextAction.reason}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Orbit className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">Benchmark</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                      {displayCategory ? `Catégorie active : ${displayCategory}` : "Analyse tes concurrents directs."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions rapides (inchangé) ──────────────────────────────── */}
        <div className="mb-6">
          <DashboardQuickActions />
        </div>

        {/* ── Réseaux teaser ─────────────────────────────────────────── */}
        <div className="mb-6">
          <NetworksTeaser />
        </div>

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
          <LivePostGenerator session={liveSnapshot.last} debrief={liveSnapshot.lastDebrief} open={showPostGen} onClose={() => setShowPostGen(false)} />
        )}

        {/* Weekly digest */}
        <WeeklyDigestCard report={currentReport} userId={user.id} previousScore={previous?.report?.score?.overall ?? null} />

        {/* Foundation weekly sequence */}
        {foundationActive && (
          <div className="mb-6">
            <WeeklySequenceCard actions={foundation.sequence} showPlanLink={endedSessions > 0} />
          </div>
        )}

        {/* ── LIVE ───────────────────────────────────────────────────── */}
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Live</p>
        {isPro ? (
          <div className="mb-6 space-y-2.5">
            <LiveStatusCard current={liveSnapshot?.current ?? null} last={liveSnapshot?.last ?? null} lastDebrief={liveSnapshot?.lastDebrief ?? null} />
            <LastVsAverageCard current={liveSnapshot?.current ?? null} />
            {focusSlot === "milestone" && <WeeklyMilestoneCard current={liveSnapshot?.current ?? null} />}
            {focusSlot === "inactivity" && <InactivityRelanceCard current={liveSnapshot?.current ?? null} />}
            <PreLiveChecklistCard current={liveSnapshot?.current ?? null} last={liveSnapshot?.last ?? null} lastDebrief={liveSnapshot?.lastDebrief ?? null} />
            <SmartAlertsCard current={liveSnapshot?.current ?? null} />
          </div>
        ) : (
          <div className="mb-6">
            <InlineLock feature="Cockpit Live — Pro" description="Suivi en direct, debrief automatique, alertes intelligentes et checklist pré-live." blurHeight="140px">
              <div className="space-y-2.5">
                <LiveStatusCard current={liveSnapshot?.current ?? null} last={liveSnapshot?.last ?? null} lastDebrief={liveSnapshot?.lastDebrief ?? null} />
                <LastVsAverageCard current={liveSnapshot?.current ?? null} />
              </div>
            </InlineLock>
          </div>
        )}

        {/* Quests */}
        {!foundationActive && weeklyQuests && (
          <div className="mb-6">
            {isPro ? (
              <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} linkToQuests />
            ) : (
              <InlineLock feature="Quêtes hebdomadaires — Pro" description="Suis tes quêtes de la semaine et accumule de l'XP." blurHeight="120px">
                <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} linkToQuests />
              </InlineLock>
            )}
          </div>
        )}

        {/* EventSub */}
        <div className="mb-6 space-y-3">
          <ScopeDriftBanner broadcasterUserId={account?.platform_user_id ?? null} />
          <EventSubCockpitSection broadcasterUserId={account?.platform_user_id ?? null} />
        </div>

        {/* Post generator trigger — 72h après un live */}
        {liveSnapshot?.last && liveSnapshot.lastDebrief && !liveSnapshot.current && isSessionRecent(liveSnapshot.last.ended_at) && (
          <div className="mb-6">
            <button
              onClick={() => setShowPostGen(true)}
              className="group relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card/40 p-4 text-left backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,hsl(var(--primary)/0.08),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">✍️</span>
                    <span className="text-sm font-semibold text-foreground">Contenu à publier</span>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">Nouveau</span>
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
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
