import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Lock, Minus, Sparkles } from "lucide-react";

import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import {
  computeStreamScoreMovement,
  type StreamScoreMovement,
  type DimKey,
} from "@/services/streamScoreMovement";
import type { StreamScoreSnapshot } from "@/services/streamScoreHistory";
import { usePageMeta } from "@/hooks/usePageMeta";

type RangeDays = 30 | 60 | 90;

const DIM_LABEL_FR: Record<DimKey, string> = {
  regularity: "Régularité",
  structure: "Structure",
  content: "Contenu",
  positioning: "Positionnement",
  momentum: "Momentum",
  monetization: "Monétisation",
};

const DIM_KEYS: DimKey[] = [
  "regularity",
  "structure",
  "content",
  "positioning",
  "momentum",
  "monetization",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function deltaBadge(delta: number | null) {
  if (delta === null || delta === undefined) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </Badge>
    );
  }
  if (delta > 0) {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30">
        <ArrowUpRight className="h-3 w-3" /> +{delta} pts
      </Badge>
    );
  }
  if (delta < 0) {
    return (
      <Badge className="gap-1 bg-rose-500/15 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30">
        <ArrowDownRight className="h-3 w-3" /> {delta} pts
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Minus className="h-3 w-3" /> stable
    </Badge>
  );
}

function MovementBadge({ movement }: { movement: StreamScoreMovement }) {
  switch (movement.movement_status) {
    case "improved":
      return deltaBadge(movement.overall_delta);
    case "declined":
      return deltaBadge(movement.overall_delta);
    case "stable":
      return (
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3" /> stable
        </Badge>
      );
    case "stale":
      return (
        <Badge className="gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Données anciennes
        </Badge>
      );
    case "not_enough_history":
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          Pas assez d'historique
        </Badge>
      );
  }
}

const StreamScoreHistoryPage = () => {
  usePageMeta({
    title: "StreamScore — Historique",
    description: "Suis l'évolution de ton StreamScore et comprends ce qui le fait progresser.",
  });

  const { user } = useAuth();
  const { account, loading: connLoading } = useTwitchConnection();
  const { isPro, loading: planLoading } = usePlan();

  const [snapshots, setSnapshots] = useState<StreamScoreSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeDays>(30);

  const platformUserId = account?.platform_user_id ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !platformUserId) {
        setSnapshots([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: jobs } = await supabase
        .from("analysis_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", "twitch")
        .eq("platform_user_id", platformUserId);
      const jobIds = (jobs ?? []).map((j) => j.id as string);
      if (jobIds.length === 0) {
        if (!cancelled) {
          setSnapshots([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("stream_score_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .in("analysis_job_id", jobIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setSnapshots((data as StreamScoreSnapshot[] | null) ?? []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, platformUserId]);

  const movement = useMemo(
    () => computeStreamScoreMovement(snapshots ?? []),
    [snapshots],
  );

  const filteredSnapshots = useMemo(() => {
    if (!snapshots) return [];
    const cutoff = Date.now() - range * 86400_000;
    // limit snapshots to the active plan's allowed window for free users
    const allowedRange = isPro ? range : Math.min(range, 30) as RangeDays;
    const cap = Date.now() - allowedRange * 86400_000;
    return snapshots
      .filter((s) => new Date(s.created_at).getTime() >= Math.max(cutoff, cap))
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [snapshots, range, isPro]);

  const chartData = useMemo(
    () => filteredSnapshots.map((s) => ({
      date: formatDate(s.created_at),
      overall: s.overall,
    })),
    [filteredSnapshots],
  );

  const isLoading = loading || connLoading || planLoading;

  if (isLoading) {
    return (
      <AppShell>
        <PageContainer size="lg">
          <LoadingState message="Chargement de ton historique StreamScore…" />
        </PageContainer>
      </AppShell>
    );
  }

  // No connected Twitch account
  if (!account) {
    return (
      <AppShell>
        <PageContainer size="lg">
          <PageHeader
            eyebrow="StreamScore"
            title="Historique de ton StreamScore"
            description="Connecte ta chaîne Twitch pour suivre ton évolution dans le temps."
          />
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Aucune chaîne Twitch connectée.
              </p>
              <Button asChild>
                <Link to="/connect-twitch">Connecter Twitch</Link>
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  const total = snapshots?.length ?? 0;
  const latest = movement.latest_snapshot;
  const previous = movement.previous_snapshot;

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="StreamScore"
          title="Historique de ton StreamScore"
          description={`Évolution pour ${account.platform_display_name || account.platform_login || "ta chaîne"}.`}
          avatarLogin={account.platform_login}
        />

        {/* A. Header card */}
        <Card className="mb-6">
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">StreamScore actuel</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold tracking-tight">
                  {latest?.overall ?? "—"}
                </span>
                <span className="text-muted-foreground text-sm">/ 100</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <MovementBadge movement={movement} />
              {latest && (
                <span className="text-xs text-muted-foreground">
                  Dernière mesure le {new Date(latest.created_at).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Empty states */}
        {total === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Sparkles className="h-8 w-8 mx-auto text-primary" />
              <p className="text-muted-foreground">
                Ton historique StreamScore n'est pas encore disponible. Lance une analyse Twitch pour créer ton premier point de suivi.
              </p>
              <Button asChild>
                <Link to="/analyse">Lancer une analyse <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {total === 1 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Premier point enregistré. Ton évolution apparaîtra après une prochaine analyse.
            </CardContent>
          </Card>
        )}

        {total >= 2 && (
          <>
            {/* Low confidence note */}
            {latest?.confidence === "low" && (
              <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 text-sm text-amber-200">
                  Lecture prudente : il manque encore certains signaux pour interpréter cette évolution avec précision.
                </CardContent>
              </Card>
            )}

            {/* B. Chart */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">Évolution du score</h2>
                    <p className="text-xs text-muted-foreground">Sur les {range} derniers jours</p>
                  </div>
                  <div className="flex gap-1">
                    {([30, 60, 90] as RangeDays[]).map((d) => {
                      const locked = !isPro && d > 30;
                      return (
                        <Button
                          key={d}
                          size="sm"
                          variant={range === d ? "default" : "outline"}
                          onClick={() => !locked && setRange(d)}
                          disabled={locked}
                          className="gap-1"
                        >
                          {locked && <Lock className="h-3 w-3" />}
                          {d}j
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="overall"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#scoreFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {!isPro && (
                  <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex items-center justify-between gap-3">
                    <span>Passe à Pro pour débloquer 60 et 90 jours d'historique.</span>
                    <Button size="sm" asChild>
                      <Link to="/pricing">Voir Pro</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* C. Dimensions */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Évolution par dimension</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DIM_KEYS.map((k) => {
                    const value = latest?.[k] ?? null;
                    const delta = movement.dimension_deltas[k];
                    return (
                      <div key={k} className="rounded-lg border border-border/60 bg-card/50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{DIM_LABEL_FR[k]}</span>
                          {deltaBadge(delta)}
                        </div>
                        <div className="text-2xl font-semibold">
                          {value ?? "—"}
                          <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* D. Why */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-lg font-semibold">Pourquoi le score a changé</h2>
                <p className="text-sm text-muted-foreground">{movement.explanation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {movement.top_positive_dimension && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <p className="text-xs text-emerald-300/80">Principale progression</p>
                      <p className="font-medium">{DIM_LABEL_FR[movement.top_positive_dimension]}</p>
                    </div>
                  )}
                  {movement.top_negative_dimension && (
                    <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                      <p className="text-xs text-rose-300/80">Principal frein</p>
                      <p className="font-medium">{DIM_LABEL_FR[movement.top_negative_dimension]}</p>
                    </div>
                  )}
                  {movement.priority_dimension && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs text-primary/80">Priorité</p>
                      <p className="font-medium">
                        {DIM_LABEL_FR[movement.priority_dimension as DimKey] ?? movement.priority_dimension}
                      </p>
                    </div>
                  )}
                </div>
                {previous && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Comparaison vs analyse du {new Date(previous.created_at).toLocaleDateString("fr-FR")}.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default StreamScoreHistoryPage;
