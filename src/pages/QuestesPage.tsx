import { useState, useEffect, useCallback } from "react";
import { Zap, Trophy, Clock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { FullPageLock } from "@/components/PaywallGate";
import { toast } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import PageContainer from "@/components/PageContainer";
import WeeklyQuestCard from "@/components/WeeklyQuestCard";
import { useAuth } from "@/contexts/AuthContext";
import { listLiveSessions } from "@/services/liveSessions";
import { getRecentReports } from "@/services/reportRepository";
import {
  generateWeeklyQuests,
  getWeekKey,
  loadQuestChecks,
  toggleManualQuest,
  type WeeklyQuests,
} from "@/services/questEngine";
import {
  evaluateTieredBadges,
  markTierBadgesSeen,
  type TieredBadge,
  type BadgeTier,
} from "@/services/badgeEngine";
import { loadTotalXp, getXpLevel, getCurrentSeason, cacheXpData, QUEST_XP_MAP, type XpLevelData, type SeasonData } from "@/services/xpEngine";
import type { LiveSession } from "@/services/liveSessions";
import type { AnalysisReport } from "@/types/analysis";

// ─── Tiered badge UI ─────────────────────────────────────────────────────────

const TIER_STYLES: Record<BadgeTier["tier"], { chip: string; bar: string; dot: string }> = {
  bronze: {
    chip: "border-amber-600/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500/60",
    dot: "bg-amber-500",
  },
  silver: {
    chip: "border-slate-400/40 bg-slate-400/10 text-slate-500 dark:text-slate-300",
    bar: "bg-slate-400/60",
    dot: "bg-slate-400",
  },
  gold: {
    chip: "border-yellow-400/40 bg-yellow-400/10 text-yellow-600 dark:text-yellow-300",
    bar: "bg-yellow-400/60",
    dot: "bg-yellow-400",
  },
};

const TieredBadgeCard = ({ badge }: { badge: TieredBadge }) => {
  const hasAny = badge.currentTier !== null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        hasAny
          ? "border-primary/15 bg-primary/[0.03] hover:border-primary/25"
          : "border-border/40 bg-card/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 text-2xl leading-none ${hasAny ? "" : "grayscale opacity-40"}`}>
          {badge.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${hasAny ? "text-foreground" : "text-foreground/60"}`}>
            {badge.label}
          </p>

          {/* Tier chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badge.tiers.map((tier) => {
              const styles = TIER_STYLES[tier.tier];
              return (
                <div
                  key={tier.tier}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    tier.unlocked
                      ? styles.chip
                      : "border-border/30 bg-muted/20 text-muted-foreground/40"
                  }`}
                >
                  {tier.unlocked && (
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  )}
                  {tier.label}
                  {tier.isNew && (
                    <span className="ml-0.5 rounded-full bg-primary px-1 text-[8px] font-bold uppercase text-background">
                      new
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress toward next tier */}
          {badge.nextTier && (
            <div className="mt-2.5">
              <p className="mb-1 text-[10px] text-muted-foreground">
                {badge.nextTier.label} — {badge.nextTier.description}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${TIER_STYLES[badge.nextTier.tier].bar}`}
                    style={{ width: `${badge.nextTier.progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {badge.nextTier.progressLabel}
                </span>
              </div>
            </div>
          )}

          {/* All tiers unlocked */}
          {!badge.nextTier && badge.currentTier && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
              ✓ Tous les tiers débloqués
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── XP Level card ───────────────────────────────────────────────────────────

const XpCard = ({ xpLevel, season }: { xpLevel: XpLevelData; season: SeasonData }) => (
  <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl">
    <div
      className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
      style={{ background: "hsl(var(--primary) / 0.08)" }}
      aria-hidden
    />

    <div className="relative flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-2xl">
          {xpLevel.icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Niveau {xpLevel.level}
          </p>
          <p className="text-base font-semibold text-foreground">{xpLevel.label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold tabular-nums text-foreground">{xpLevel.totalXp}</p>
        <p className="text-[10px] text-muted-foreground">XP total</p>
      </div>
    </div>

    {xpLevel.progressToNext !== null && (
      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{xpLevel.label}</span>
          <span>
            {xpLevel.xpToNext} XP → {xpLevel.nextLabel}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${xpLevel.progressToNext}%` }}
          />
        </div>
      </div>
    )}

    {xpLevel.level === 5 && (
      <div className="relative mt-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center">
        <p className="text-[11px] font-semibold text-primary">Niveau maximum atteint · Legend</p>
      </div>
    )}

    <div className="relative mt-3.5 flex items-center gap-2 border-t border-border/30 pt-3">
      <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
      <p className="text-[11px] text-muted-foreground">
        Saison {season.number} · {season.name} {season.icon} · {season.daysLeft} jours restants
      </p>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const QuestesPage = () => {
  const { user } = useAuth();
  const { isPro } = usePlan();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [manualChecks, setManualChecks] = useState<Set<string>>(new Set());
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuests | null>(null);
  const [badges, setBadges] = useState<TieredBadge[]>([]);
  const [xpLevel, setXpLevel] = useState<XpLevelData | null>(null);
  const [season] = useState<SeasonData>(getCurrentSeason);
  const [loading, setLoading] = useState(true);

  // Clear sidebar notification dot as soon as the user lands on this page
  useEffect(() => {
    if (!user) return;
    try { localStorage.removeItem(`quetes_new_${user.id}`); } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent("quetes-notif-update"));
  }, [user]);

  // Load all data on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [sess, reports, checks, totalXp] = await Promise.all([
        listLiveSessions(user.id, 60),
        getRecentReports(user.id, 5),
        loadQuestChecks(getWeekKey()),
        loadTotalXp(),
      ]);
      if (cancelled) return;

      const latestSaved = reports?.[0] ?? null;
      const latestReport = latestSaved?.report ?? null;
      setSessions(sess);
      setReport(latestReport);
      setManualChecks(checks);
      setXpLevel(getXpLevel(totalXp));
      cacheXpData(user.id, totalXp);

      const quests = generateWeeklyQuests(sess, latestReport, checks);
      setWeeklyQuests(quests);

      const tiered = evaluateTieredBadges({ sessions: sess, report: latestReport, userId: user.id });
      setBadges(tiered);

      // Toast each newly unlocked badge tier, then mark as seen
      const newTiers = tiered.flatMap((b) =>
        b.tiers.filter((t) => t.isNew).map((t) => ({ badge: b, tier: t })),
      );
      newTiers.forEach(({ badge, tier }, i) => {
        setTimeout(() => {
          toast(`${badge.icon} Badge débloqué — ${tier.label} !`, {
            description: `${badge.label} · ${tier.description}`,
            duration: 4000,
          });
        }, i * 600);
      });
      const newIds = newTiers.map(({ badge, tier }) => `${badge.id}_${tier.tier}`);
      if (newIds.length > 0) {
        markTierBadgesSeen(user.id, newIds);
        // Clear sidebar notification dot
        try { localStorage.removeItem(`quetes_new_${user.id}`); } catch { /* noop */ }
        window.dispatchEvent(new CustomEvent("quetes-notif-update"));
      }

      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  // Refresh quests when checks change
  useEffect(() => {
    if (!sessions.length && !report) return;
    setWeeklyQuests(generateWeeklyQuests(sessions, report, manualChecks));
  }, [manualChecks, sessions, report]);

  const handleQuestToggle = useCallback(
    async (questId: string) => {
      if (!user) return;
      const weekKey = getWeekKey();
      const currentlyChecked = manualChecks.has(questId);
      const xpDelta = QUEST_XP_MAP[questId] ?? 0;

      // Optimistic update — checks
      setManualChecks((prev) => {
        const next = new Set(prev);
        if (currentlyChecked) next.delete(questId);
        else next.add(questId);
        return next;
      });

      // Optimistic update — XP level + sidebar cache
      if (xpDelta > 0) {
        setXpLevel((prev) => {
          if (!prev) return prev;
          const newTotal = Math.max(0, prev.totalXp + (currentlyChecked ? -xpDelta : xpDelta));
          cacheXpData(user.id, newTotal);
          return getXpLevel(newTotal);
        });
      }

      const confirmed = await toggleManualQuest(user.id, weekKey, questId, currentlyChecked);

      if (confirmed !== !currentlyChecked) {
        // Reconcile checks with server
        setManualChecks((prev) => {
          const next = new Set(prev);
          if (confirmed) next.add(questId);
          else next.delete(questId);
          return next;
        });
        // Revert XP optimistic update
        if (xpDelta > 0) {
          setXpLevel((prev) => {
            if (!prev) return prev;
            // Undo the optimistic delta, apply the confirmed state instead
            const revertDelta = currentlyChecked ? xpDelta : -xpDelta;
            const newTotal = Math.max(0, prev.totalXp + revertDelta);
            cacheXpData(user.id, newTotal);
            return getXpLevel(newTotal);
          });
        }
      }
    },
    [user, manualChecks],
  );

  if (!user) return null;

  if (!isPro) {
    return (
      <AppShell>
        <FullPageLock
          feature="Quêtes & badges"
          description="Suis ta progression hebdomadaire, débloque des badges et accumule de l'XP."
          bullets={[
            "Quêtes de la semaine basées sur tes sessions",
            "Badges à tiers (Bronze, Silver, Gold)",
            "Niveau XP et saisons de progression",
          ]}
        />
      </AppShell>
    );
  }

  const unlockedBadges = badges.filter((b) => b.currentTier !== null);
  const lockedBadges = badges.filter((b) => b.currentTier === null);

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageHeader
          title="Quêtes"
          description="Progression hebdomadaire, badges et XP — ton historique de croissance."
        />

        {/* XP Level card */}
        {loading ? (
          <div className="mb-6 h-32 animate-pulse rounded-2xl bg-muted/30" />
        ) : xpLevel ? (
          <XpCard xpLevel={xpLevel} season={season} />
        ) : null}

        {/* Weekly quests */}
        <div className="mb-6">
          {loading ? (
            <div className="rounded-2xl border border-border/40 bg-card/30 p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Quêtes de la semaine</p>
              </div>
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/30" />
                ))}
              </div>
            </div>
          ) : weeklyQuests ? (
            <WeeklyQuestCard weeklyQuests={weeklyQuests} onToggle={handleQuestToggle} />
          ) : null}
        </div>

        {/* Badges */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Badges</h2>
            {unlockedBadges.length > 0 && (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {unlockedBadges.length}/{badges.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {unlockedBadges.map((badge) => (
                <TieredBadgeCard key={badge.id} badge={badge} />
              ))}
              {lockedBadges.length > 0 && (
                <>
                  <div className="my-3 flex items-center gap-3">
                    {unlockedBadges.length > 0 && <div className="h-px flex-1 bg-border/40" />}
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      À débloquer
                    </p>
                    {unlockedBadges.length > 0 && <div className="h-px flex-1 bg-border/40" />}
                  </div>
                  {lockedBadges.map((badge) => (
                    <TieredBadgeCard key={badge.id} badge={badge} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default QuestesPage;
