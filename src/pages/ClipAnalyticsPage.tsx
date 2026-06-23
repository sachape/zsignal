import { useEffect, useState } from "react";
import { BarChart2, Clapperboard, Eye, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/StateView";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

interface ClipRow {
  id: string;
  twitch_clip_id: string;
  title: string | null;
  view_count: number | null;
  clip_created_at: string;
  duration: number | null;
  thumbnail_url: string | null;
  url: string | null;
  game_id: string | null;
}

interface WeekBucket {
  week: string;
  count: number;
  views: number;
}

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function toWeekLabel(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function buildWeekBuckets(clips: ClipRow[]): WeekBucket[] {
  const map = new Map<string, { count: number; views: number }>();
  for (const c of clips) {
    const key = toWeekLabel(c.clip_created_at);
    const existing = map.get(key) ?? { count: 0, views: 0 };
    map.set(key, {
      count: existing.count + 1,
      views: existing.views + (c.view_count ?? 0),
    });
  }
  return Array.from(map.entries())
    .map(([week, v]) => ({ week, ...v }))
    .slice(-10);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0]?.value} clips · {formatViews(payload[1]?.value ?? 0)} vues</p>
    </div>
  );
};

const ClipAnalyticsPage = () => {
  usePageMeta({ title: "Clips — Streamnco" });
  const { user } = useAuth();
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("twitch_clip_snapshots")
      .select("id, twitch_clip_id, title, view_count, clip_created_at, duration, thumbnail_url, url, game_id")
      .eq("user_id", user.id)
      .order("clip_created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setClips((data as ClipRow[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <AppShell><PageContainer><LoadingState /></PageContainer></AppShell>;

  const totalViews = clips.reduce((s, c) => s + (c.view_count ?? 0), 0);
  const avgViews = clips.length > 0 ? Math.round(totalViews / clips.length) : 0;
  const bestClip = [...clips].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))[0];
  const weekBuckets = buildWeekBuckets(clips);
  const top10 = [...clips].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 10);

  const isEmpty = clips.length === 0;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Cockpit"
          title="Clips"
          description="Tes moments forts — performance et tendances sur les 30 derniers jours."
        />

        {isEmpty ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/40">
            <div className="text-center">
              <Clapperboard className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">Aucun clip trouvé</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Les clips apparaissent automatiquement après tes prochains lives
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Clips total", value: clips.length, icon: Clapperboard },
                { label: "Vues totales", value: formatViews(totalViews), icon: Eye },
                { label: "Vues / clip", value: formatViews(avgViews), icon: TrendingUp },
                { label: "Meilleur clip", value: formatViews(bestClip?.view_count ?? 0), icon: BarChart2 },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary-strong" />
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            {weekBuckets.length > 1 && (
              <Card>
                <CardContent className="p-5">
                  <p className="mb-4 text-sm font-semibold text-foreground">Clips par semaine</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weekBuckets} barGap={4}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border)/0.3)" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="views" fill="hsl(var(--primary)/0.25)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top clips */}
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Top 10 clips</p>
              <div className="space-y-2">
                {top10.map((clip, i) => (
                  <Card key={clip.id} className="group">
                    <CardContent className="flex items-center gap-4 p-3.5">
                      <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground/50">
                        {i + 1}
                      </span>
                      {clip.thumbnail_url && (
                        <img
                          src={clip.thumbnail_url}
                          alt={clip.title ?? "Clip"}
                          className="h-10 w-16 shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {clip.title ?? "Sans titre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(clip.clip_created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {clip.duration != null && ` · ${clip.duration}s`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          (clip.view_count ?? 0) >= 100 ? "text-primary-strong" : "text-foreground",
                        )}>
                          {formatViews(clip.view_count ?? 0)}
                        </span>
                      </div>
                      {clip.url && (
                        <a
                          href={clip.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[11px] text-primary-strong opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                        >
                          Voir
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default ClipAnalyticsPage;
