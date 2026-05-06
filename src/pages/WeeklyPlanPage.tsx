import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ListChecks,
  Target,
  Eye,
  Radio,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
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
import { buildWeeklyPlan, type WeeklyPlanView } from "@/services/weeklyPlan";
import { getWeekKey } from "@/services/questEngine";

// ── Checkbox persistence ───────────────────────────────────────────────────

function getPlanChecksKey(userId: string, weekKey: string) {
  return `plan_checks_${userId}_${weekKey}`;
}

function loadChecked(userId: string, weekKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(getPlanChecksKey(userId, weekKey));
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(userId: string, weekKey: string, checked: Set<string>): void {
  try {
    localStorage.setItem(
      getPlanChecksKey(userId, weekKey),
      JSON.stringify([...checked]),
    );
  } catch {}
}

// Stable action ID — first 32 chars of text (actions shouldn't change mid-week)
function actionId(text: string) {
  return text.slice(0, 32);
}

// ── Component ──────────────────────────────────────────────────────────────

const WeeklyPlanPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<WeeklyPlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const weekKey = getWeekKey();

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const snap = await getLiveCockpitSnapshot(user.id);
      const sessions: LiveSession[] = await listLiveSessions(user.id, 14);
      const ended = sessions.filter((s) => s.status === "ended");
      const debriefs: Map<string, LiveDebrief> = await getDebriefsBySessionIds(
        ended.map((s) => s.id),
      );
      const milestone = await getOrCreateCurrentWeekMilestone(
        user.id,
        snap.current,
        ended,
        debriefs,
      );
      const built = buildWeeklyPlan({
        current: snap.current,
        recentSessions: ended,
        recentDebriefs: debriefs,
        milestone,
      });
      if (!cancelled) {
        setView(built);
        setChecked(loadChecked(user.id, weekKey));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, weekKey]);

  const toggle = useCallback(
    (id: string) => {
      if (!user) return;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        saveChecked(user.id, weekKey, next);
        return next;
      });
    },
    [user, weekKey],
  );

  if (loading || !view) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  const totalActions = view.actions.length;
  const completedCount = view.actions.filter((a) => checked.has(actionId(a))).length;
  const allDone = totalActions > 0 && completedCount === totalActions;
  const progressPct = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

  return (
    <AppShell>
      <PageContainer size="sm">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" /> Tableau de bord
          </Link>
        </Button>

        <PageHeader
          eyebrow={view.contextLabel}
          title="Plan de la semaine"
          description="Une feuille de route simple basée sur tes derniers lives."
        />

        {view.state === "in_live" ? (
          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Radio className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-medium text-foreground">
                  Ton live est en cours.
                </h2>
                <p className="text-sm text-muted-foreground">
                  {view.watch?.text}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Block 1 — Priority */}
            {view.priority && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Priorité de la semaine
                    </Badge>
                  </div>
                  <h2 className="text-lg font-medium leading-snug text-foreground">
                    {view.priority.title}
                  </h2>
                  {view.priority.detail && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {view.priority.detail}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Block 2 — Checklist */}
            {totalActions > 0 && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  {/* Header + progress */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        À faire cette semaine
                      </Badge>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {completedCount}/{totalActions}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {totalActions > 0 && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}

                  {/* All done state */}
                  {allDone ? (
                    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4 text-center">
                      <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        Semaine complète !
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Toutes les actions cochées — reviens lundi pour la suite.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {view.actions.map((action, idx) => {
                        const id = actionId(action);
                        const done = checked.has(id);
                        return (
                          <li key={`${idx}-${id}`}>
                            <button
                              onClick={() => toggle(id)}
                              aria-pressed={done}
                              className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all duration-150 ${
                                done
                                  ? "border-primary/20 bg-primary/[0.04]"
                                  : "border-border/30 hover:border-border/60 hover:bg-muted/20"
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {done ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                                )}
                              </div>
                              <span
                                className={`text-sm leading-relaxed transition-colors ${
                                  done
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {action}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Block 3 — Watch point */}
            {view.watch && (
              <Card>
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Point à surveiller
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {view.watch.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default WeeklyPlanPage;
