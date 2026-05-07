import { useEffect, useState, useCallback } from "react";
import {
  ListChecks,
  Target,
  Eye,
  Radio,
  CheckCircle2,
  Circle,
  Sparkles,
  XCircle,
  RotateCcw,
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
import {
  ensureWeeklyActionItems,
  setActionStatus,
  type WeeklyActionItem,
} from "@/services/weeklyActionItems";
import { getLatestReport } from "@/services/reportRepository";
import type { Recommendation } from "@/types/analysis";

const WeeklyPlanPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [milestoneTitle, setMilestoneTitle] = useState<string>("");
  const [milestoneDiagnosis, setMilestoneDiagnosis] = useState<string | null>(null);
  const [items, setItems] = useState<WeeklyActionItem[]>([]);
  const [inLive, setInLive] = useState(false);
  const [noPlan, setNoPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportFallbackAction, setReportFallbackAction] = useState<Recommendation | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const snap = await getLiveCockpitSnapshot(user.id);
    setInLive(Boolean(snap.current));
    const sessions: LiveSession[] = await listLiveSessions(user.id, 14);
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
      // Fallback: show the priority action from the latest analysis report
      // so the page is never empty for users who have analysed but not streamed yet.
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
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, refresh]);

  const handleStatus = useCallback(
    async (id: string, status: "todo" | "done" | "skipped") => {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status,
                completed_at:
                  status === "done" ? new Date().toISOString() : null,
                skipped_at:
                  status === "skipped" ? new Date().toISOString() : null,
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

  const totalActions = items.length;
  const completedCount = items.filter((a) => a.status === "done").length;
  const allDone = totalActions > 0 && completedCount === totalActions;
  const progressPct =
    totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageHeader
          eyebrow={inLive ? "Live en cours" : "Plan de la semaine"}
          title="Plan de la semaine"
          description="Une feuille de route simple basée sur tes derniers lives."
        />

        {inLive ? (
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
                  Le plan de la semaine sera mis à jour à la fin de cette session.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : noPlan ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">
                Ton plan complet sera disponible après ton premier live.{" "}
                {!reportFallbackAction && "Lance une session pour le générer."}
              </p>
              {reportFallbackAction && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/[0.04] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
                      Action prioritaire maintenant
                    </p>
                    <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                      {reportFallbackAction.title}
                    </p>
                    {reportFallbackAction.action && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {reportFallbackAction.action}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Goal + diagnosis */}
            <Card>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Cap de la semaine
                  </Badge>
                </div>
                <h2 className="text-lg font-medium leading-snug text-foreground">
                  {milestoneTitle}
                </h2>
                {milestoneDiagnosis && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {milestoneDiagnosis}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action items */}
            {totalActions > 0 && (
              <Card>
                <CardContent className="space-y-4 p-6">
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

                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

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
                      {items.map((action) => {
                        const done = action.status === "done";
                        const skipped = action.status === "skipped";
                        return (
                          <li
                            key={action.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${
                              done
                                ? "border-primary/20 bg-primary/[0.04]"
                                : skipped
                                ? "border-border/30 bg-muted/20 opacity-60"
                                : "border-border/30 hover:border-border/60"
                            }`}
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
                                className={`text-sm leading-relaxed ${
                                  done
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {action.title}
                                {done &&
                                  (action.evidence as { verified_by?: string } | null)
                                    ?.verified_by === "auto" && (
                                    <Badge
                                      variant="outline"
                                      className="ml-2 h-5 px-1.5 text-[10px] align-middle"
                                    >
                                      Vérifié automatiquement
                                    </Badge>
                                  )}
                              </p>
                              {action.description && !skipped && !done && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {action.description}
                                </p>
                              )}
                              {action.reason && !skipped && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {action.reason}
                                </p>
                              )}
                              {action.expected_impact && !skipped && (
                                <p className="mt-0.5 text-xs text-muted-foreground/80">
                                  Impact attendu : {action.expected_impact}
                                </p>
                              )}
                              {action.difficulty && !skipped && !done && (
                                <div className="mt-1.5">
                                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                    {action.difficulty === "easy"
                                      ? "Facile"
                                      : action.difficulty === "medium"
                                      ? "Moyen"
                                      : "Avancé"}
                                  </Badge>
                                </div>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {action.status === "todo" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleStatus(action.id, "done")}
                                    >
                                      <CheckCircle2 className="h-3 w-3" /> Fait
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => handleStatus(action.id, "skipped")}
                                    >
                                      <XCircle className="h-3 w-3" /> Passer
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => handleStatus(action.id, "todo")}
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

            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce plan reste stable toute la semaine. Tes statuts sont
                  enregistrés et synchronisés sur tous tes appareils.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default WeeklyPlanPage;
