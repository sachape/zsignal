import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ListChecks, Target, Eye, Radio } from "lucide-react";
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

const WeeklyPlanPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<WeeklyPlanView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1. Live snapshot (current + last + last debrief).
      const snap = await getLiveCockpitSnapshot(user.id);
      // 2. Recent sessions + their debriefs (same window the cockpit uses).
      const sessions: LiveSession[] = await listLiveSessions(user.id, 14);
      const ended = sessions.filter((s) => s.status === "ended");
      const debriefs: Map<string, LiveDebrief> = await getDebriefsBySessionIds(
        ended.map((s) => s.id),
      );
      // 3. Current-week milestone (read-or-create, stable for the week).
      const milestone = await getOrCreateCurrentWeekMilestone(
        user.id,
        snap.current,
        ended,
        debriefs,
      );
      // 4. Aggregate.
      const built = buildWeeklyPlan({
        current: snap.current,
        recentSessions: ended,
        recentDebriefs: debriefs,
        milestone,
      });
      if (!cancelled) {
        setView(built);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (loading || !view) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

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
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
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
            {/* Block 1 — Priority of the week */}
            {view.priority && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Priorité de la semaine
                    </Badge>
                  </div>
                  <h2 className="text-lg font-medium text-foreground leading-snug">
                    {view.priority.title}
                  </h2>
                  {view.priority.detail && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {view.priority.detail}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Block 2 — Sequence of actions */}
            {view.actions.length > 0 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      À faire cette semaine
                    </Badge>
                  </div>
                  <ol className="space-y-3">
                    {view.actions.map((action, idx) => (
                      <li
                        key={`${idx}-${action.slice(0, 24)}`}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-muted text-[11px] font-medium text-muted-foreground flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-foreground leading-relaxed">
                          {action}
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Block 3 — Point to watch */}
            {view.watch && (
              <Card>
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Point à surveiller
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
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
