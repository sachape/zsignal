import { useEffect, useState, useRef, useCallback } from "react";
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
import ScoreCard from "@/components/ScoreCard";
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
import ConnectTwitchPromptModal from "@/components/ConnectTwitchPromptModal";
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

  // Welcome banner: show only on first visit after Twitch connection.
  // Robust to refreshes: relies on the durable cockpit_welcome_dismissed flag.
  const welcomeRequested = searchParams.get("welcome") === "1";
  const welcomeSignup = searchParams.get("welcome_signup") === "1";
  const [showWelcome, setShowWelcome] = useState(
    () => welcomeRequested && !onboardingFlags.isCockpitWelcomeDismissed(),
  );
  const dismissWelcome = useCallback(() => {
    onboardingFlags.dismissCockpitWelcome();
    setShowWelcome(false);
  }, []);

  // Twitch connect prompt: shown after Streamnco signup (or any cockpit
  // visit where the SaaS account exists but Twitch is not yet connected).
  // Honors the `connect_twitch_prompt_dismissed` durable flag.
  const [showConnectTwitch, setShowConnectTwitch] = useState(false);

  // Mismatch banner: teaser channel A vs Twitch account B finally connected.
  // Read once at mount; cleared by the user via the banner CTA.
  const [teaserMismatch, setTeaserMismatch] = useState<string | null>(null);

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

    // Live sessions snapshot is independent from analysis reports — it is
    // populated by the live-detect cron and only depends on the connected
    // Twitch account, so we always try to refresh it on dashboard loads.
    try {
      const live = await getLiveCockpitSnapshot(user.id);
      setLiveSnapshot(live);
      // Resolve which block owns the "focus" slot. Exclusive by design:
      // the milestone and the inactivity card never render together.
      const ended = await listLiveSessions(user.id, 14);
      setFocusSlot(resolveCockpitFocusSlot(live.current, ended));
    } catch {
      setLiveSnapshot(null);
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

  // Auto-open the Twitch connect prompt when the Streamnco user lands on
  // the cockpit without a Twitch connection. We honor the durable
  // `connect_twitch_prompt_dismissed` flag so it never re-opens after
  // explicit "Plus tard". Forced open when ?welcome_signup=1 (immediately
  // after Streamnco signup, regardless of the dismissed flag).
  useEffect(() => {
    if (!user || connectionLoading) return;
    if (isConnected) return;
    const dismissed = onboardingFlags.isConnectTwitchPromptDismissed();
    if (welcomeSignup) {
      onboardingFlags.resetConnectTwitchPrompt();
      setShowConnectTwitch(true);
      return;
    }
    if (!dismissed) setShowConnectTwitch(true);
  }, [user, connectionLoading, isConnected, welcomeSignup]);

  // Detect mismatch: teaser channel persisted before signup vs the Twitch
  // login finally connected to the Streamnco account.
  useEffect(() => {
    if (!isConnected || !account?.platform_login) return;
    const teaserLogin = onboardingFlags.getPendingTeaserChannel();
    if (!teaserLogin) return;
    const a = teaserLogin.trim().toLowerCase();
    const b = account.platform_login.trim().toLowerCase();
    if (a && a !== b) {
      setTeaserMismatch(teaserLogin);
    }
    onboardingFlags.clearPendingTeaserChannel();
  }, [isConnected, account]);

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    await enqueueRefreshForSelf("manual");
    await loadDashboardState();
    setManualRefreshing(false);
  }, [manualRefreshing, loadDashboardState]);

  const handleDismissConnectTwitch = () => {
    onboardingFlags.dismissConnectTwitchPrompt();
    setShowConnectTwitch(false);
  };

  const connectPromptModal = (
    <ConnectTwitchPromptModal
      open={showConnectTwitch}
      onOpenChange={(o) => {
        if (!o) handleDismissConnectTwitch();
        else setShowConnectTwitch(true);
      }}
      onLater={handleDismissConnectTwitch}
    />
  );

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

        {/* Slim welcome banner — first cockpit visit only. Dismissable.
            Kept minimal on purpose: no walkthrough, no checklist, no hotspots.
            The three shortcuts at the bottom of the cockpit already cover
            navigation, so the welcome stays purely orientational. */}
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

        {/* Top state strip — kept minimal: score + sync only.
            Évolution is demoted into the Sync card subtext to reduce
            analytical noise on the dashboard. */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <ScoreCard score={score.overall} />
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
        </div>

        {/* "Pourquoi ce score" — compact reading on the cockpit so the
            score never reads as a bare number. Hidden if no breakdown. */}
        {score.breakdown.length > 0 && (
          <div className="mb-6">
            <ScoreInsightCard score={score} compact />
          </div>
        )}

        {/* Live stack — single continuous reading, top → bottom:
            1. État actuel        (LiveStatusCard, primary)
            2. Mise en contexte   (LastVsAverageCard, secondary, hidden if low signal)
            3. Direction          (Milestone OR Inactivity, exclusive slot)
            4. Exécution          (Pre-live checklist, hidden in live)
            5. Vigilance          (Smart alerts, hidden in live / no recent live)
            Cards self-suppress when their state is owned by a card above,
            so the stack collapses to whatever is actually relevant. */}
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

        {/* Followers warning if applicable */}
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

        {/* Foundation mode: structuring coach takes over the top of the page.
            We surface the main blocker and a short ordered weekly sequence,
            and we demote optimization analytics until the channel produces
            enough signal to be worth optimizing. */}
        {foundationActive && (
          <>
            <FoundationModeBanner reasons={foundation.reasons} />
            <MainBlockerCard blocker={foundation.blocker} reportId={currentReport.id} />
            <WeeklySequenceCard actions={foundation.sequence} showPlanLink />
          </>
        )}

        {/* Next milestone — reframed as a near-term objective with rationale.
            In foundation mode the copy explicitly says stability comes first. */}
        <NextMilestoneCard
          milestone={nextMilestone}
          reportId={currentReport.id}
          foundationActive={foundationActive}
        />

        {/* Three shortcuts to the rest of the product. The cockpit itself
            stays decisional — detailed analytics, the full weekly plan and
            the benchmark grid live on their own pages. */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Link
            to={`/result?report_id=${currentReport.id}`}
            className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Diagnostic détaillé
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pourquoi ton score est ce qu'il est.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
          <Link
            to="/plan"
            className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Plan de la semaine
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ce que tu exécutes maintenant.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
          <Link
            to="/competitors"
            className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UsersIcon className="h-4 w-4 text-primary" />
                Benchmark
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ce que tu observes chez les autres.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
