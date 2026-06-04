// Simple V1 live timeline: viewers over time from collected snapshots.
// Sober single-line area, a few markers (start, peak, end) and a one-line read.

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { LiveSession } from "@/services/liveSessions";

interface LiveSnapshotRow {
  id: string;
  live_session_id: string;
  viewer_count: number;
  captured_at: string;
}

interface Point {
  t: number; // ms since session start
  v: number; // viewers
  iso: string;
}

const MIN_SNAPSHOTS_FOR_CHART = 4;

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function buildShortRead(points: Point[], session: LiveSession): string {
  if (points.length < MIN_SNAPSHOTS_FOR_CHART) return "";
  const values = points.map((p) => p.v);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const peakIdx = values.indexOf(max);
  const peakRatio = peakIdx / (values.length - 1);

  const half = Math.floor(values.length / 2);
  const firstHalfAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half);
  const secondHalfAvg = values.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, values.length - half);

  const isLive = session.status === "live";
  const lowSignal = max < 3;

  if (lowSignal) return "La courbe est restée faible pendant toute la session.";

  const variation = (Math.max(...values) - Math.min(...values)) / Math.max(1, avg);
  if (variation < 0.25) return "La courbe est restée globalement stable.";

  if (firstHalfAvg > secondHalfAvg * 1.2) {
    return isLive
      ? "Le live tient mieux sur le début que sur la suite."
      : "Le live a mieux tenu au début qu'à la fin.";
  }
  if (secondHalfAvg > firstHalfAvg * 1.2) {
    return "Le live a monté en puissance dans la seconde partie.";
  }

  if (peakRatio < 0.33) return "Le pic principal est arrivé tôt dans la session.";
  if (peakRatio > 0.66) return "Le pic principal est arrivé en fin de session.";
  return "Le pic principal est arrivé au milieu du live.";
}

const TooltipContent = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border/60 bg-popover/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur">
      <p className="font-semibold tabular-nums text-foreground">{p.v} viewers</p>
      <p className="text-muted-foreground">{formatClock(p.iso)}</p>
    </div>
  );
};

interface Props {
  session: LiveSession;
}

const LiveTimeline = ({ session }: Props) => {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<LiveSnapshotRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("live_snapshots")
        .select("id, live_session_id, viewer_count, captured_at")
        .eq("live_session_id", session.id)
        .order("captured_at", { ascending: true });
      if (cancelled) return;
      setSnapshots((data as LiveSnapshotRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  const points = useMemo<Point[]>(() => {
    if (snapshots.length === 0) return [];
    const startMs = new Date(session.started_at).getTime();
    return snapshots.map((s) => ({
      t: new Date(s.captured_at).getTime() - startMs,
      v: s.viewer_count,
      iso: s.captured_at,
    }));
  }, [snapshots, session.started_at]);

  const peakIdx = useMemo(() => {
    if (points.length === 0) return -1;
    let idx = 0;
    for (let i = 1; i < points.length; i += 1) if (points[i].v > points[idx].v) idx = i;
    return idx;
  }, [points]);

  const shortRead = useMemo(() => buildShortRead(points, session), [points, session]);
  const isLive = session.status === "live";

  if (loading) {
    return (
      <Card className="mb-4 border-border/60 bg-card/60">
        <CardContent className="p-4">
          <div className="h-32 animate-pulse rounded-md bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  // Not enough signal — sober empty state
  if (points.length < MIN_SNAPSHOTS_FOR_CHART) {
    return (
      <Card className="mb-4 border-border/60 bg-card/60">
        <CardContent className="p-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Évolution du live
          </p>
          <p className="mt-2 text-sm text-foreground">
            {isLive
              ? "La timeline se construit pendant le live."
              : "On n'a pas pu reconstituer une courbe viewers pour ce live."}
          </p>
          {!isLive && (
            <p className="mt-1 text-xs text-muted-foreground">
              La collecte de snapshots a manqué de données — tu peux quand même préparer tes contenus depuis le débrief assisté.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const peakPoint = points[peakIdx];

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Évolution du live
          </p>
          {isLive && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              En cours
            </Badge>
          )}
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="liveTimelineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={[0, "dataMax + 1"]} />
              <Tooltip content={<TooltipContent />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#liveTimelineFill)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 3 }}
              />
              {peakIdx > 0 && peakIdx < points.length - 1 && (
                <ReferenceDot
                  x={peakPoint.t}
                  y={peakPoint.v}
                  r={3.5}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>Début · {formatClock(startPoint.iso)}</span>
          <span>
            Pic · {peakPoint.v} viewers
          </span>
          <span>
            {isLive ? "Maintenant" : "Fin"} · {formatClock(endPoint.iso)}
          </span>
        </div>

        {shortRead && (
          <p className="mt-3 border-t border-border/40 pt-3 text-sm text-foreground">{shortRead}</p>
        )}
        {isLive && (
          <p className="mt-1 text-xs text-muted-foreground">
            Le live est encore en cours. La lecture finale sera disponible une fois la session terminée.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTimeline;
