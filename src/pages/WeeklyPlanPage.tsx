import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { markOnboardingStepVisited } from "@/components/OnboardingGuide";
import { usePlan } from "@/hooks/usePlan";
import { FullPageLock } from "@/components/PaywallGate";
import {
  ListChecks,
  Target,
  Radio,
  CheckCircle2,
  Circle,
  Sparkles,
  XCircle,
  RotateCcw,
  Flame,
  TrendingUp,
  CalendarDays,
  MapPin,
  ChevronRight,
  Rocket,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/StateView";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDebriefsBySessionIds,
  getLiveCockpitSnapshot,
  listLiveSessions,
  type LiveDebrief,
  type LiveSession,
} from "@/services/liveSessions";
import { getOrCreateCurrentWeekMilestone } from "@/services/weeklyMilestone";
import {
  ensureWeeklyActionItems,
  setActionStatus,
  type WeeklyActionItem,
} from "@/services/weeklyActionItems";
import { getLatestReport, getRecentReports, type SavedReport } from "@/services/reportRepository";
import type { Recommendation } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";

/* ────────────────────────────────────────────────────────── */
/* Starter plan                                              */
/* ────────────────────────────────────────────────────────── */

const STARTER_STEPS = [
  {
    id: "bio" as const,
    title: "Rédige ta bio Twitch en 3 lignes",
    detail: "Qui tu es · ce que tu streams · quand tu es live",
    playbookSlug: "twitch-bio-clarity",
  },
  {
    id: "schedule" as const,
    title: "Fixe 3 créneaux de stream par semaine",
    detail: "Mêmes jours, mêmes heures — affiche-les dans ta bio",
    playbookSlug: "stable-schedule",
  },
  {
    id: "category" as const,
    title: "Choisis ta catégorie principale",
    detail: "70 % de tes lives dans une seule niche au départ",
    playbookSlug: "category-positioning",
  },
  {
    id: "panels" as const,
    title: "Configure tes 4 panels essentiels",
    detail: "À propos, Planning, Rejoindre, Règles — en 20 minutes",
    playbookSlug: "twitch-panels",
  },
  {
    id: "first-live" as const,
    title: "Lance ton premier live",
    detail: "Durée libre — l'objectif c'est de démarrer",
    playbookSlug: null,
  },
];

type StarterStepId = (typeof STARTER_STEPS)[number]["id"];

const StarterPlanCard = ({ userId }: { userId: string }) => {
  const checklistKey = "starter";
  const [checked, setChecked] = useState<Set<StarterStepId>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_checklist_progress")
        .select("item_key")
        .eq("user_id", userId)
        .eq("checklist_key", checklistKey);
      if (cancelled) return;
      setChecked(new Set((data ?? []).map((r) => r.item_key as StarterStepId)));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const toggle = async (id: StarterStepId) => {
    const has = checked.has(id);
    const next = new Set(checked);
    if (has) next.delete(id);
    else next.add(id);
    setChecked(next); // optimistic
    if (has) {
      await supabase
        .from("user_checklist_progress")
        .delete()
        .eq("user_id", userId)
        .eq("checklist_key", checklistKey)
        .eq("item_key", id);
    } else {
      await supabase.from("user_checklist_progress").upsert(
        { user_id: userId, checklist_key: checklistKey, item_key: id },
        { onConflict: "user_id,checklist_key,item_key", ignoreDuplicates: true },
      );
    }
  };

  const completedCount = checked.size;
  const total = STARTER_STEPS.length;
  const pct = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Plan d'amorce</p>
                <p className="text-xs text-muted-foreground">Commence ici, même sans live</p>
              </div>
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {completedCount}/{total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          {allDone ? (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4 text-center">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Chaîne prête !</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Lance ton premier live — ton plan complet s'activera automatiquement.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {STARTER_STEPS.map((step) => {
                const done = checked.has(step.id);
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-all",
                      done
                        ? "border-primary/20 bg-primary/[0.04]"
                        : "border-border/30 hover:border-border/60",
                    )}
                  >
                    <button
                      onClick={() => toggle(step.id)}
                      aria-pressed={done}
                      className="mt-0.5 shrink-0 transition-opacity hover:opacity-80"
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          done
                            ? "text-muted-foreground line-through"
                            : "font-medium text-foreground",
                        )}
                      >
                        {step.title}
                      </p>
                      {!done && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                      )}
                      {step.playbookSlug && !done && (
                        <Link
                          to={`/playbooks/${step.playbookSlug}`}
                          className="mt-1 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                        >
                          Voir le playbook <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/* Helpers                                                   */
/* ────────────────────────────────────────────────────────── */

type Tab = "today" | "week" | "month";

const DAY_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTH_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function todayLabel(): string {
  const d = new Date();
  return `${DAY_FR[d.getDay()]} ${d.getDate()} ${MONTH_FR[d.getMonth()]}`;
}

function isLikelyStreamDay(sessions: LiveSession[]): boolean {
  const today = new Date().getDay();
  const ended = sessions.filter((s) => s.status === "ended");
  if (ended.length < 4) return false;
  const counts: Record<number, number> = {};
  for (const s of ended) {
    const d = new Date(s.started_at).getDay();
    counts[d] = (counts[d] || 0) + 1;
  }
  return (counts[today] ?? 0) / ended.length >= 0.2;
}

function getMonthlyStats(sessions: LiveSession[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const done = sessions.filter(
    (s) => s.status === "ended" && new Date(s.started_at) >= monthStart,
  ).length;

  // Target: avg of last 3 months + 10% stretch, min 4
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const historical = sessions.filter(
    (s) => s.status === "ended" && new Date(s.started_at) >= threeMonthsAgo,
  ).length;
  const target = Math.max(4, Math.ceil((historical / 3) * 1.1));

  return { done, target, pct: Math.min(100, Math.round((done / target) * 100)) };
}

function getScoreTarget(current: number): number {
  if (current >= 80) return 90;
  if (current >= 70) return 80;
  return Math.ceil((current + 10) / 10) * 10;
}

/* ────────────────────────────────────────────────────────── */
/* Sub-components                                            */
/* ────────────────────────────────────────────────────────── */

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 rounded-md py-1.5 text-sm font-medium transition-all duration-200",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

interface ActionCardProps {
  action: Recommendation;
  label?: string;
}
const ActionCard = ({ action, label = "Action prioritaire" }: ActionCardProps) => (
  <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
      <Target className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary/60">
        {label}
      </p>
      <p className="text-sm font-semibold leading-snug text-foreground">{action.title}</p>
      {action.action && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.action}</p>
      )}
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────── */
/* Today tab                                                 */
/* ────────────────────────────────────────────────────────── */

const TodayTab = ({
  inLive,
  sessions,
  nextAction,
  milestoneTitle,
  hasAnySessions,
  onSwitchToWeek,
}: {
  inLive: boolean;
  sessions: LiveSession[];
  nextAction: Recommendation | null;
  milestoneTitle: string;
  hasAnySessions: boolean;
  onSwitchToWeek: () => void;
}) => {
  const streamToday = isLikelyStreamDay(sessions);
  const hasEnoughData = sessions.filter((s) => s.status === "ended").length >= 4;

  return (
    <div className="space-y-4">
      {/* Date */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-sm font-medium text-muted-foreground">{todayLabel()}</span>
      </div>

      {/* Live status */}
      {inLive ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Radio className="h-4 w-4 text-primary" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Live en cours 🔴</p>
            <p className="text-xs text-muted-foreground">Ton cockpit live est actif sur le tableau de bord.</p>
          </div>
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  streamToday ? "bg-primary/10" : "bg-muted/60",
                )}>
                  <Radio className={cn("h-4 w-4", streamToday ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {!hasEnoughData
                      ? "Lance un live aujourd'hui"
                      : streamToday
                      ? "Aujourd'hui est un jour de stream"
                      : "Pas de live prévu aujourd'hui"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!hasEnoughData
                      ? "Pas encore assez de données pour détecter tes habitudes."
                      : streamToday
                      ? "Basé sur tes habitudes des dernières semaines."
                      : "Tu streams habituellement d'autres jours."}
                  </p>
                </div>
              </div>
              {streamToday && (
                <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Prévu
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action du jour */}
      {nextAction ? (
        <ActionCard action={nextAction} label="À faire aujourd'hui" />
      ) : !hasAnySessions ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Avant ton premier live</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure ta bio, ton planning et ta catégorie — ça prend moins d'une heure.
            </p>
            <button
              onClick={onSwitchToWeek}
              className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              Voir le plan d'amorce <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
          <p className="text-sm text-muted-foreground">Lance un live pour générer ton action du jour.</p>
        </div>
      )}

      {/* Cap de la semaine — compact reminder */}
      {milestoneTitle && (
        <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Cap de la semaine
            </p>
            <p className="text-xs font-medium text-foreground/80 leading-snug">{milestoneTitle}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/* Week tab                                                  */
/* ────────────────────────────────────────────────────────── */

const WeekTab = ({
  inLive,
  noPlan,
  hasAnySessions,
  userId,
  reportFallbackAction,
  milestoneTitle,
  milestoneDiagnosis,
  items,
  completedCount,
  totalActions,
  progressPct,
  allDone,
  onStatus,
}: {
  inLive: boolean;
  noPlan: boolean;
  hasAnySessions: boolean;
  userId: string;
  reportFallbackAction: Recommendation | null;
  milestoneTitle: string;
  milestoneDiagnosis: string | null;
  items: WeeklyActionItem[];
  completedCount: number;
  totalActions: number;
  progressPct: number;
  allDone: boolean;
  onStatus: (id: string, status: "todo" | "done" | "skipped") => void;
}) => {
  if (inLive) {
    return (
      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-medium text-foreground">Ton live est en cours.</h2>
            <p className="text-sm text-muted-foreground">
              Le plan sera mis à jour à la fin de cette session.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (noPlan) {
    if (!hasAnySessions) {
      return <StarterPlanCard userId={userId} />;
    }
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Ton plan complet sera disponible après ton premier live.{" "}
            {!reportFallbackAction && "Lance une session pour le générer."}
          </p>
          {reportFallbackAction && <ActionCard action={reportFallbackAction} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Goal */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">Cap de la semaine</Badge>
          </div>
          <h2 className="text-base font-semibold leading-snug text-foreground">{milestoneTitle}</h2>
          {milestoneDiagnosis && (
            <p className="text-sm leading-relaxed text-muted-foreground">{milestoneDiagnosis}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {totalActions > 0 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                </div>
                <Badge variant="secondary" className="text-xs">À faire cette semaine</Badge>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {completedCount}/{totalActions}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {allDone ? (
              <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4 text-center">
                <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Semaine complète !</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Toutes les actions cochées — reviens lundi pour la suite.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((action) => {
                  const done = action.status === "done";
                  const skipped = action.status === "skipped";
                  return (
                    <li
                      key={action.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 transition-all",
                        done
                          ? "border-primary/20 bg-primary/[0.04]"
                          : skipped
                          ? "border-border/30 bg-muted/20 opacity-60"
                          : "border-border/30 hover:border-border/60",
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : skipped ? (
                          <XCircle className="h-4 w-4 text-muted-foreground/60" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-relaxed",
                            done ? "text-muted-foreground line-through" : "text-foreground",
                          )}
                        >
                          {action.title}
                          {done &&
                            (action.evidence as { verified_by?: string } | null)?.verified_by ===
                              "auto" && (
                              <Badge
                                variant="outline"
                                className="ml-2 h-5 px-1.5 text-[10px] align-middle"
                              >
                                Vérifié auto
                              </Badge>
                            )}
                        </p>
                        {action.description && !skipped && !done && (
                          <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                        )}
                        {action.reason && !skipped && (
                          <p className="mt-1 text-xs text-muted-foreground">{action.reason}</p>
                        )}
                        {action.expected_impact && !skipped && (
                          <p className="mt-0.5 text-xs text-muted-foreground/80">
                            Impact attendu : {action.expected_impact}
                          </p>
                        )}
                        {action.difficulty && !skipped && !done && (
                          <Badge variant="outline" className="mt-1.5 h-5 px-1.5 text-[10px]">
                            {action.difficulty === "easy"
                              ? "Facile"
                              : action.difficulty === "medium"
                              ? "Moyen"
                              : "Avancé"}
                          </Badge>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {action.status === "todo" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => onStatus(action.id, "done")}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Fait
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => onStatus(action.id, "skipped")}
                              >
                                <XCircle className="h-3 w-3" /> Passer
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => onStatus(action.id, "todo")}
                            >
                              <RotateCcw className="h-3 w-3" /> Annuler
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/* Month tab                                                 */
/* ────────────────────────────────────────────────────────── */

const MonthTab = ({
  sessions,
  currentReport,
  oldestReport,
}: {
  sessions: LiveSession[];
  currentReport: SavedReport | null;
  oldestReport: SavedReport | null;
}) => {
  const monthly = useMemo(() => getMonthlyStats(sessions), [sessions]);
  const score = currentReport?.report.score;
  const scoreTarget = score ? getScoreTarget(score.overall) : null;
  const scoreDelta =
    score && oldestReport
      ? score.overall - oldestReport.report.score.overall
      : null;

  const weakDims = score
    ? [...score.breakdown]
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
    : [];

  const now = new Date();
  const monthName = MONTH_FR[now.getMonth()];

  if (!currentReport) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Lance un live pour générer ton plan du mois.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month objective */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs capitalize">
              Objectif {monthName}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Sessions target */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Lives ce mois
              </p>
              <div className="mt-1 flex items-end gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {monthly.done}
                </span>
                <span className="mb-0.5 text-sm text-muted-foreground">/ {monthly.target}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${monthly.pct}%` }}
                />
              </div>
            </div>

            {/* Score target */}
            {score && scoreTarget && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  StreamScore visé
                </p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {score.overall}
                  </span>
                  <span className="mb-0.5 text-sm text-muted-foreground">→ {scoreTarget}</span>
                </div>
                {scoreDelta !== null && (
                  <p
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      scoreDelta > 0 ? "text-primary" : scoreDelta < 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts ce mois
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dimensions to work on */}
      {weakDims.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="secondary" className="text-xs">
                Axes à travailler ce mois
              </Badge>
            </div>
            <div className="space-y-3">
              {weakDims.map((dim, i) => {
                const tier = getScoreTier(dim.score);
                const theme = getTierTheme(tier);
                return (
                  <div key={dim.dimension} className="flex items-center gap-3">
                    <span className="w-4 text-xs font-semibold text-muted-foreground/60 tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{dim.dimension}</p>
                        <span className={cn("text-xs font-bold tabular-nums", theme.textClass)}>
                          {dim.score}
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", theme.progressClass)}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!scoreDelta && (
        <p className="text-center text-xs text-muted-foreground/60">
          La progression du score sera visible après plusieurs analyses.
        </p>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/* Main page                                                 */
/* ────────────────────────────────────────────────────────── */

const WeeklyPlanPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPro } = usePlan();
  const [tab, setTab] = useState<Tab>("today");
  const [milestoneTitle, setMilestoneTitle] = useState<string>("");
  const [milestoneDiagnosis, setMilestoneDiagnosis] = useState<string | null>(null);
  const [items, setItems] = useState<WeeklyActionItem[]>([]);
  const [inLive, setInLive] = useState(false);
  const [noPlan, setNoPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportFallbackAction, setReportFallbackAction] = useState<Recommendation | null>(null);
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [oldestReport, setOldestReport] = useState<SavedReport | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;

    const [snap, sessions, reports] = await Promise.all([
      getLiveCockpitSnapshot(user.id),
      listLiveSessions(user.id, 60),
      getRecentReports(user.id, 10),
    ]);

    setAllSessions(sessions);
    setInLive(Boolean(snap.current));
    setCurrentReport(reports[0] ?? null);
    setOldestReport(reports.length > 1 ? reports[reports.length - 1] : null);

    const ended = sessions.filter((s) => s.status === "ended");
    const debriefs: Map<string, LiveDebrief> = await getDebriefsBySessionIds(
      ended.map((s) => s.id),
    );
    const milestoneView = await getOrCreateCurrentWeekMilestone(
      user.id,
      snap.current,
      ended,
      debriefs,
    );

    if (!milestoneView) {
      setNoPlan(true);
      setItems([]);
      setMilestoneTitle("");
      setMilestoneDiagnosis(null);
      const saved = await getLatestReport(user.id);
      setReportFallbackAction(saved?.report?.next_best_action ?? null);
      return;
    }

    setNoPlan(false);
    const { milestone, items: persisted } = await ensureWeeklyActionItems(
      user.id,
      milestoneView,
      snap.current,
      ended,
      debriefs,
    );
    setMilestoneTitle(milestone.title);
    setMilestoneDiagnosis(milestone.diagnosis);
    setItems(persisted);
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    markOnboardingStepVisited(user.id, "plan");
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, refresh]);

  const handleStatus = useCallback(
    async (id: string, status: "todo" | "done" | "skipped") => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status,
                completed_at: status === "done" ? new Date().toISOString() : null,
                skipped_at: status === "skipped" ? new Date().toISOString() : null,
              }
            : it,
        ),
      );
      await setActionStatus(id, status);
    },
    [],
  );

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!isPro) {
    return (
      <AppShell>
        <FullPageLock
          feature="Feuille de route"
          description="Visualise tes actions prioritaires jour par jour — aujourd'hui, cette semaine et ce mois."
          bullets={[
            "Actions du jour basées sur ton dernier live",
            "Plan hebdo avec objectifs concrets",
            "Progression mensuelle et axes à travailler",
          ]}
        />
      </AppShell>
    );
  }

  const totalActions = items.length;
  const completedCount = items.filter((a) => a.status === "done").length;
  const allDone = totalActions > 0 && completedCount === totalActions;
  const progressPct = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;
  const nextAction = currentReport?.report.next_best_action ?? reportFallbackAction ?? null;
  const hasAnySessions = allSessions.some((s) => s.status === "ended");

  return (
    <AppShell>
      <PageContainer size="sm">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
            Feuille de route
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tes actions prioritaires, jour par jour.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1">
          <TabButton active={tab === "today"} onClick={() => setTab("today")}>
            Aujourd'hui
          </TabButton>
          <TabButton active={tab === "week"} onClick={() => setTab("week")}>
            Cette semaine
          </TabButton>
          <TabButton active={tab === "month"} onClick={() => setTab("month")}>
            Ce mois
          </TabButton>
        </div>

        {/* Content */}
        {tab === "today" && (
          <TodayTab
            inLive={inLive}
            sessions={allSessions}
            nextAction={nextAction}
            milestoneTitle={milestoneTitle}
            hasAnySessions={hasAnySessions}
            onSwitchToWeek={() => setTab("week")}
          />
        )}
        {tab === "week" && (
          <WeekTab
            inLive={inLive}
            noPlan={noPlan}
            hasAnySessions={hasAnySessions}
            userId={user?.id ?? ""}
            reportFallbackAction={reportFallbackAction}
            milestoneTitle={milestoneTitle}
            milestoneDiagnosis={milestoneDiagnosis}
            items={items}
            completedCount={completedCount}
            totalActions={totalActions}
            progressPct={progressPct}
            allDone={allDone}
            onStatus={handleStatus}
          />
        )}
        {tab === "month" && (
          <MonthTab
            sessions={allSessions}
            currentReport={currentReport}
            oldestReport={oldestReport}
          />
        )}
      </PageContainer>
    </AppShell>
  );
};

export default WeeklyPlanPage;
