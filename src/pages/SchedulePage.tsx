import { useEffect, useState } from "react";
import { CalendarDays, Clock, TrendingUp, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/StateView";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { listLiveSessions, type LiveSession } from "@/services/liveSessions";
import { usePageMeta } from "@/hooks/usePageMeta";

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface SlotData {
  sessions: number;
  totalViewers: number;
  avgViewers: number;
}

interface TopSlot {
  day: number;
  hour: number;
  sessions: number;
  avgViewers: number;
}

function buildHeatmap(sessions: LiveSession[]): Map<string, SlotData> {
  const map = new Map<string, SlotData>();
  for (const s of sessions) {
    if (!s.ended_at) continue;
    const d = new Date(s.started_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    const existing = map.get(key) ?? { sessions: 0, totalViewers: 0, avgViewers: 0 };
    const viewers = s.avg_viewers ?? s.peak_viewers ?? 0;
    map.set(key, {
      sessions: existing.sessions + 1,
      totalViewers: existing.totalViewers + viewers,
      avgViewers: 0,
    });
  }
  for (const [key, val] of map.entries()) {
    map.set(key, { ...val, avgViewers: val.sessions > 0 ? Math.round(val.totalViewers / val.sessions) : 0 });
  }
  return map;
}

function getTopSlots(heatmap: Map<string, SlotData>, n = 3): TopSlot[] {
  return Array.from(heatmap.entries())
    .filter(([, v]) => v.sessions >= 1)
    .map(([key, v]) => {
      const [day, hour] = key.split("-").map(Number);
      return { day, hour, sessions: v.sessions, avgViewers: v.avgViewers };
    })
    .sort((a, b) => b.avgViewers - a.avgViewers || b.sessions - a.sessions)
    .slice(0, n);
}

function formatHour(h: number): string {
  return `${h.toString().padStart(2, "0")}h`;
}

const SchedulePage = () => {
  usePageMeta({ title: "Planning — Streamnco" });
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listLiveSessions(user.id, 100).then((data) => {
      setSessions(data.filter((s) => s.ended_at));
      setLoading(false);
    });
  }, [user]);

  if (loading) return <AppShell><PageContainer><LoadingState /></PageContainer></AppShell>;

  const heatmap = buildHeatmap(sessions);
  const topSlots = getTopSlots(heatmap);
  const isEmpty = sessions.length === 0;

  // Compute max for heatmap normalization
  const maxSessions = Math.max(1, ...Array.from(heatmap.values()).map((v) => v.sessions));
  const maxViewers = Math.max(1, ...Array.from(heatmap.values()).map((v) => v.avgViewers));

  // Visible hours: only show 14h–02h range (prime streaming hours) + any with data
  const activeHours = HOURS.filter((h) => {
    if (h >= 14 || h <= 2) return true;
    return Array.from({ length: 7 }, (_, d) => heatmap.has(`${d}-${h}`)).some(Boolean);
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Cockpit"
          title="Planning optimal"
          description="Tes meilleurs créneaux de stream basés sur tes performances historiques."
        />

        {isEmpty ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/40">
            <div className="text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">Pas encore assez de données</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Streamez quelques sessions pour voir tes créneaux optimaux
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top 3 slots */}
            {topSlots.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {topSlots.map((slot, i) => (
                  <Card
                    key={`${slot.day}-${slot.hour}`}
                    className={cn(
                      "border transition-all",
                      i === 0 && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold",
                            i === 0 && "border-primary/40 text-primary-strong",
                          )}
                        >
                          #{i + 1} créneau
                        </Badge>
                        {i === 0 && (
                          <span className="text-[10px] font-semibold text-primary-strong">Recommandé</span>
                        )}
                      </div>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                        {DAYS_FR[slot.day]} {formatHour(slot.hour)}
                      </p>
                      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {slot.avgViewers > 0 ? `${slot.avgViewers} vw moy.` : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {slot.sessions} session{slot.sessions > 1 ? "s" : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Heatmap */}
            <Card>
              <CardContent className="p-5">
                <p className="mb-4 text-sm font-semibold text-foreground">
                  Heatmap par créneau
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="w-10 pr-2 text-right font-normal text-muted-foreground/60" />
                        {DAYS_FR.map((d) => (
                          <th
                            key={d}
                            className="pb-2 text-center font-semibold text-muted-foreground"
                          >
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeHours.map((hour) => (
                        <tr key={hour}>
                          <td className="pr-2 text-right font-mono text-[10px] text-muted-foreground/60">
                            {formatHour(hour)}
                          </td>
                          {Array.from({ length: 7 }, (_, day) => {
                            const data = heatmap.get(`${day}-${hour}`);
                            const intensity = data
                              ? Math.max(0.08, data.sessions / maxSessions)
                              : 0;
                            const isTop = topSlots.some(
                              (s) => s.day === day && s.hour === hour,
                            );
                            return (
                              <td key={day} className="p-0.5 text-center">
                                <div
                                  title={
                                    data
                                      ? `${DAYS_FR[day]} ${formatHour(hour)} — ${data.sessions} session${data.sessions > 1 ? "s" : ""}, ${data.avgViewers} vw moy.`
                                      : undefined
                                  }
                                  className={cn(
                                    "mx-auto h-5 w-full rounded-sm transition-all",
                                    data
                                      ? isTop
                                        ? "ring-1 ring-primary/60"
                                        : ""
                                      : "bg-muted/20",
                                  )}
                                  style={
                                    data
                                      ? {
                                          backgroundColor: `hsl(var(--primary) / ${intensity})`,
                                        }
                                      : undefined
                                  }
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0.08, 0.3, 0.6, 1].map((op) => (
                      <div
                        key={op}
                        className="h-3 w-4 rounded-sm"
                        style={{ backgroundColor: `hsl(var(--primary) / ${op})` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Peu → Souvent streamé</span>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-border/40 bg-muted/10">
              <CardContent className="flex items-start gap-3 p-4">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Basé sur {sessions.length} session{sessions.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Ce planning est calculé sur tes viewers moyens par créneau.
                    Plus tu auras de sessions, plus la recommandation sera précise.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

import { ProFeaturePreview } from "@/components/ProFeatureGate";
import { usePlan } from "@/hooks/usePlan";

const SchedulePageGated = () => {
  const { isPro, loading } = usePlan();
  if (loading) return <AppShell><PageContainer><LoadingState /></PageContainer></AppShell>;
  if (!isPro) {
    return (
      <AppShell>
        <ProFeaturePreview
          featureName="schedule"
          title="Calendrier optimal disponible avec Pro"
          description="Identifie les meilleurs moments pour streamer et construire une routine plus régulière."
          benefits={["Meilleurs créneaux", "Rythme recommandé", "Planning hebdomadaire"]}
        />
      </AppShell>
    );
  }
  return <SchedulePage />;
};

export default SchedulePageGated;
