import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Sliders, TrendingUp, CheckCircle2, Circle, Lock, Sparkles, ArrowRight, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Affiliate targets ───────────────────────────────────────────────────────

const AFFILIATE_TARGETS = { avg_viewers: 3, stream_days: 7, stream_hours: 8, unique_chatters: 3, followers: 50 };

// Having weekly action items and knowing exactly what to fix accelerates growth
const STREAMNCO_BOOST = 2.2;

// ── Projection models ────────────────────────────────────────────────────────

interface ProjectionPoint {
  week: number;
  viewers: number;
  viewersBoosted: number;
}

function computeViewers(
  startViewers: number,
  sessionsPerWeek: number,
  durationHours: number,
  weeks: number,
  multiplier = 1,
): number[] {
  const result: number[] = [];
  let v = startViewers;
  for (let w = 0; w <= weeks; w++) {
    result.push(Math.round(v * 10) / 10);
    const base = v < 5 ? 0.08 : v < 15 ? 0.05 : 0.03;
    const weeklyGrowth = sessionsPerWeek * base * multiplier;
    const durationBonus = Math.min(durationHours / 3, 1) * 0.02 * v * multiplier;
    v = Math.max(v + weeklyGrowth + durationBonus, 0);
  }
  return result;
}

function buildPoints(
  startViewers: number,
  sessionsPerWeek: number,
  durationHours: number,
  weeks: number,
): ProjectionPoint[] {
  const base = computeViewers(startViewers, sessionsPerWeek, durationHours, weeks, 1);
  const boosted = computeViewers(startViewers, sessionsPerWeek, durationHours, weeks, STREAMNCO_BOOST);
  return base.map((v, i) => ({ week: i, viewers: v, viewersBoosted: boosted[i] }));
}

function weeksToTarget(
  start: number,
  target: number,
  sessionsPerWeek: number,
  durationHours: number,
  multiplier = 1,
): number | null {
  if (start >= target) return 0;
  const vals = computeViewers(start, sessionsPerWeek, durationHours, 156, multiplier);
  const idx = vals.findIndex((v) => v >= target);
  return idx === -1 ? null : idx;
}

function weeksToFollowers(
  currentFollowers: number,
  targetFollowers: number,
  sessionsPerWeek: number,
  startViewers: number,
  durationHours: number,
  multiplier = 1,
): number | null {
  if (currentFollowers >= targetFollowers) return 0;
  const viewersByWeek = computeViewers(startViewers, sessionsPerWeek, durationHours, 156, multiplier);
  let followers = currentFollowers;
  for (let w = 0; w < viewersByWeek.length; w++) {
    const followersPerSession = Math.max(0.3, viewersByWeek[w] * 0.15 + 0.3);
    followers += sessionsPerWeek * followersPerSession;
    if (followers >= targetFollowers) return w;
  }
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TooltipContent = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
}) => {
  if (!active || !payload?.length) return null;
  const week = (payload[0] as unknown as { payload: ProjectionPoint }).payload.week;
  return (
    <div className="rounded-md border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <p className="mb-1.5 font-semibold text-foreground">Semaine {week}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.color }} />
          {p.name === "viewersBoosted" ? "Avec Streamnco" : "Sans outil"} ·{" "}
          <span className="font-semibold">~{formatNumber(p.value)} vw</span>
        </p>
      ))}
    </div>
  );
};

interface CriterionRowProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  etaBase: number | null;
  etaBoosted: number | null;
  available?: boolean;
  note?: string;
}

const CriterionRow = ({
  label, current, target, unit, etaBase, etaBoosted, available = true, note,
}: CriterionRowProps) => {
  const met = current >= target;
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="shrink-0 pt-0.5">
        {!available ? (
          <Lock className="h-4 w-4 text-muted-foreground/40" />
        ) : met ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">{label}</span>
          {available && (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatNumber(current)} / {formatNumber(target)} {unit}
            </span>
          )}
        </div>
        {available && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn("h-full rounded-full transition-all duration-700", met ? "bg-success" : "bg-primary/60")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <div className="w-24 shrink-0 text-right">
        {!available ? null : met ? (
          <Badge variant="outline" className="border-success/30 bg-success/5 text-[10px] text-success">
            Rempli ✓
          </Badge>
        ) : note ? (
          <span className="text-[10px] italic text-muted-foreground">{note}</span>
        ) : (
          <div className="space-y-1">
            {etaBoosted !== null ? (
              <div className="flex items-center justify-end gap-1">
                <Zap className="h-2.5 w-2.5 text-primary" />
                <span className="text-[11px] font-bold tabular-nums text-primary">~{etaBoosted} sem.</span>
              </div>
            ) : null}
            {etaBase !== null && etaBase !== etaBoosted ? (
              <div className="text-[10px] tabular-nums text-muted-foreground/60 line-through">
                ~{etaBase} sem.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const DEMO_STATS = {
  avg_viewers: { current: 1.5, target: 3 },
  stream_days: { current: 4, target: 7 },
  stream_hours: { current: 6, target: 8 },
  unique_chatters: { current: 1, target: 3 },
  followers: { current: 18, target: 50 },
};

const SimulatorPage = () => {
  const { user } = useAuth();
  const { account } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [durationHours, setDurationHours] = useState(2);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const uid = user.id;
    const platformUid = account?.platform_user_id ?? null;
    (async () => {
      const r = platformUid
        ? await getLatestReportForPlatformUser(uid, platformUid)
        : await getLatestReport(uid);
      setReport(r);
      setLoading(false);
    })();
  }, [user, account]);

  const ap = report?.report?.affiliate_progress ?? null;
  const stats = ap ? {
    avg_viewers: { current: ap.avg_viewers.current, target: ap.avg_viewers.target },
    stream_days: { current: ap.stream_days.current, target: ap.stream_days.target },
    stream_hours: { current: ap.stream_hours.current, target: ap.stream_hours.target },
    unique_chatters: { current: ap.unique_chatters.current, target: ap.unique_chatters.target },
    followers: { current: ap.followers.current ?? 0, target: ap.followers.target, available: ap.followers.available !== false },
  } : null;

  const isDemo = !stats;
  const s = stats ?? {
    avg_viewers: DEMO_STATS.avg_viewers,
    stream_days: DEMO_STATS.stream_days,
    stream_hours: DEMO_STATS.stream_hours,
    unique_chatters: DEMO_STATS.unique_chatters,
    followers: { ...DEMO_STATS.followers, available: true },
  };

  const cv = s.avg_viewers.current;

  // ETAs — base (sans outil) vs boosted (avec Streamnco)
  const etaViewersBase = useMemo(() => weeksToTarget(cv, 3, sessionsPerWeek, durationHours, 1), [cv, sessionsPerWeek, durationHours]);
  const etaViewersBoosted = useMemo(() => weeksToTarget(cv, 3, sessionsPerWeek, durationHours, STREAMNCO_BOOST), [cv, sessionsPerWeek, durationHours]);

  const etaStreamDaysBase = useMemo(() => sessionsPerWeek * 4.3 >= 7 ? 0 : null, [sessionsPerWeek]);
  const etaStreamHoursBase = useMemo(() => sessionsPerWeek * durationHours * 4.3 >= 8 ? 0 : null, [sessionsPerWeek, durationHours]);

  const etaFollowersBase = useMemo(() => weeksToFollowers(s.followers.current, 50, sessionsPerWeek, cv, durationHours, 1), [s.followers.current, sessionsPerWeek, cv, durationHours]);
  const etaFollowersBoosted = useMemo(() => weeksToFollowers(s.followers.current, 50, sessionsPerWeek, cv, durationHours, STREAMNCO_BOOST), [s.followers.current, sessionsPerWeek, cv, durationHours]);

  // Overall boosted ETA (most bottlenecked criterion)
  const allBoostedEtas = [etaViewersBoosted, etaStreamDaysBase, etaStreamHoursBase, etaFollowersBoosted]
    .filter((e): e is number => e !== null);
  const overallBoostedEta = allBoostedEtas.length > 0 ? Math.max(...allBoostedEtas) : null;

  const allBaseEtas = [etaViewersBase, etaStreamDaysBase, etaStreamHoursBase, etaFollowersBase]
    .filter((e): e is number => e !== null);
  const overallBaseEta = allBaseEtas.length > 0 ? Math.max(...allBaseEtas) : null;

  // Dynamic chart window: cover the base ETA + 30% buffer, min 8 weeks, cap 104
  const projectionWeeks = Math.min(Math.max(Math.ceil((overallBaseEta ?? 52) * 1.3), 8), 104);
  // Tick interval adapts so XAxis stays readable at any window size
  const tickInterval = projectionWeeks <= 8 ? 2 : projectionWeeks <= 20 ? 4 : projectionWeeks <= 40 ? 8 : projectionWeeks <= 60 ? 13 : 20;

  const points = useMemo(
    () => buildPoints(cv, sessionsPerWeek, durationHours, projectionWeeks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cv, sessionsPerWeek, durationHours, projectionWeeks],
  );

  const chartMax = Math.max(...points.map((p) => p.viewersBoosted), 3 * 1.5);
  const projectedStreamDays = Math.round(sessionsPerWeek * 4.3);
  const projectedStreamHours = Math.round(sessionsPerWeek * durationHours * 4.3);

  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Progression
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Simulateur d'affiliation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vois combien de temps tu gagnes en optimisant avec Streamnco.
          </p>
        </div>

        {isDemo && !loading && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1 text-sm text-muted-foreground">
              Données de démonstration.{" "}
              <Link to="/connect-twitch" className="font-semibold text-primary hover:underline">
                Connecte Twitch
              </Link>{" "}
              pour une projection personnalisée.
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Left: sliders + chart */}
          <div className="space-y-5">
            {/* Sliders */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-5">
              <div className="mb-5 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Ton rythme</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Sessions par semaine</label>
                    <span className="text-sm font-bold tabular-nums text-primary">{sessionsPerWeek}×</span>
                  </div>
                  <Slider min={1} max={7} step={1} value={[sessionsPerWeek]} onValueChange={([v]) => setSessionsPerWeek(v)} className="cursor-pointer" />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>1×</span><span>7×</span></div>
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Durée par session</label>
                    <span className="text-sm font-bold tabular-nums text-primary">{durationHours}h</span>
                  </div>
                  <Slider min={1} max={5} step={0.5} value={[durationHours]} onValueChange={([v]) => setDurationHours(v)} className="cursor-pointer" />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>1h</span><span>5h</span></div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { label: "Sessions / semaine", value: `${sessionsPerWeek}×` },
                  { label: "Heures / mois", value: `~${Math.round(sessionsPerWeek * durationHours * 4.3)}h` },
                  { label: "Jours de stream / 30j", value: `~${projectedStreamDays}j` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-5">
              <div className="mb-1 flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Projection viewers ({projectionWeeks} sem.)</h2>
                </div>
                {overallBoostedEta !== null && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px]">
                    <Zap className="mr-1 h-2.5 w-2.5" />
                    Avec Streamnco : ~{overallBoostedEta} sem.
                  </Badge>
                )}
              </div>

              {/* Legend */}
              <div className="mb-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-primary/40" />
                  Sans outil
                  {overallBaseEta !== null && <span className="text-muted-foreground/60">(~{overallBaseEta} sem.)</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-primary" />
                  <span className="font-semibold text-primary">Avec Streamnco</span>
                </span>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-base" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.06} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grad-boost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => {
                        if (v === 0) return "Départ";
                        if (v % tickInterval === 0) return `S${v}`;
                        return "";
                      }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatNumber(v)}
                      domain={[0, Math.ceil(chartMax)]}
                      width={36}
                    />
                    <Tooltip content={<TooltipContent />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                    <ReferenceLine
                      y={3}
                      stroke="hsl(var(--success))"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      label={{ value: "Cible affilié (3 vw)", position: "insideTopLeft", fontSize: 9, fill: "hsl(var(--success))", dy: -4 }}
                    />
                    {/* Base curve (sans outil) — dimmed */}
                    <Area
                      type="monotone"
                      dataKey="viewers"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                      strokeOpacity={0.35}
                      fill="url(#grad-base)"
                      dot={false}
                      activeDot={false}
                    />
                    {/* Boosted curve (avec Streamnco) — prominent */}
                    <Area
                      type="monotone"
                      dataKey="viewersBoosted"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#grad-boost)"
                      dot={false}
                      activeDot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: criteria */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-0.5 text-sm font-semibold text-foreground">Critères d'affiliation</h2>
            <p className="mb-1 text-[11px] text-muted-foreground">
              {sessionsPerWeek} session{sessionsPerWeek > 1 ? "s" : ""}/sem. · ETA avec Streamnco
            </p>

            {/* ETA comparison callout */}
            {overallBaseEta !== null && overallBoostedEta !== null && overallBaseEta > overallBoostedEta && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-[11px] text-foreground">
                  Tu arrives <span className="font-bold text-primary">{overallBaseEta - overallBoostedEta} semaines plus tôt</span> avec Streamnco.
                </p>
              </div>
            )}

            <div className="divide-y divide-border/40">
              <CriterionRow
                label="Viewers moyens (30j)"
                current={cv}
                target={3}
                unit="vw"
                etaBase={etaViewersBase}
                etaBoosted={etaViewersBoosted}
              />
              <CriterionRow
                label="Jours de stream (30j)"
                current={projectedStreamDays}
                target={7}
                unit="j"
                etaBase={etaStreamDaysBase}
                etaBoosted={etaStreamDaysBase}
              />
              <CriterionRow
                label="Heures streamées (30j)"
                current={projectedStreamHours}
                target={8}
                unit="h"
                etaBase={etaStreamHoursBase}
                etaBoosted={etaStreamHoursBase}
              />
              <CriterionRow
                label="Chatters uniques (30j)"
                current={s.unique_chatters.current}
                target={3}
                unit="ch."
                etaBase={etaViewersBase}
                etaBoosted={etaViewersBoosted}
                note={s.unique_chatters.current < 3 && cv < 1 ? "Suit tes viewers" : undefined}
              />
              <CriterionRow
                label="Followers"
                current={s.followers.current}
                target={50}
                unit="fs"
                etaBase={etaFollowersBase}
                etaBoosted={etaFollowersBoosted}
                available={s.followers.available}
              />
            </div>

            <div className="mt-5 space-y-2">
              {!report && !loading && (
                <Button asChild className="w-full" size="sm">
                  <Link to="/connect-twitch">
                    <Sparkles className="h-3.5 w-3.5" />
                    Connecte Twitch pour ta vraie projection
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full" size="sm">
                <Link to="/progression">
                  Voir ma progression complète
                  <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default SimulatorPage;
