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
import { Sliders, TrendingUp, CheckCircle2, Circle, Lock, Sparkles, ArrowRight } from "lucide-react";
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

const AFFILIATE_TARGETS = {
  avg_viewers: 3,
  stream_days: 7,
  stream_hours: 8,
  unique_chatters: 3,
  followers: 50,
};

// ── Projection model ────────────────────────────────────────────────────────

interface ProjectionPoint {
  week: number;
  viewers: number;
  stream_days: number;
  stream_hours: number;
}

function projectGrowth(
  currentViewers: number,
  sessionsPerWeek: number,
  durationHours: number,
  weeks: number,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let viewers = currentViewers;

  for (let w = 0; w <= weeks; w++) {
    const streamDays30 = Math.min(sessionsPerWeek * 4.3, 30);
    const streamHours30 = Math.min(sessionsPerWeek * durationHours * 4.3, 999);

    points.push({
      week: w,
      viewers: Math.round(viewers * 10) / 10,
      stream_days: Math.round(streamDays30 * 10) / 10,
      stream_hours: Math.round(streamHours30 * 10) / 10,
    });

    // Growth model: more sessions = more discovery, diminishing returns
    // Base growth per stream: ~0.05-0.15 viewers per session depending on audience size
    const baseGrowthPerStream = viewers < 5 ? 0.08 : viewers < 15 ? 0.05 : 0.03;
    const weeklyGrowth = sessionsPerWeek * baseGrowthPerStream;
    // Duration bonus: longer sessions retain more, small multiplier
    const durationBonus = Math.min(durationHours / 3, 1) * 0.02 * viewers;
    viewers = Math.max(viewers + weeklyGrowth + durationBonus, 0);
  }

  return points;
}

function weeksToReach(
  current: number,
  target: number,
  sessionsPerWeek: number,
  durationHours: number,
): number | null {
  if (current >= target) return 0;
  const points = projectGrowth(current, sessionsPerWeek, durationHours, 104);
  const reached = points.find((p) => p.viewers >= target);
  return reached ? reached.week : null;
}

function weeksForStreamDays(
  sessionsPerWeek: number,
  target: number,
): number | null {
  const monthly = sessionsPerWeek * 4.3;
  return monthly >= target ? 0 : null;
}

function weeksForStreamHours(
  sessionsPerWeek: number,
  durationHours: number,
  target: number,
): number | null {
  const monthly = sessionsPerWeek * durationHours * 4.3;
  return monthly >= target ? 0 : null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const TooltipContent = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProjectionPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <p className="font-semibold text-foreground">
        Semaine {p.week}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        ~{formatNumber(p.viewers)} viewer{p.viewers !== 1 ? "s" : ""} moy.
      </p>
    </div>
  );
};

interface CriterionRowProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  weeksEta: number | null;
  available?: boolean;
}

const CriterionRow = ({ label, current, target, unit, weeksEta, available = true }: CriterionRowProps) => {
  const met = current >= target;
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="shrink-0">
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
          {!available ? (
            <span className="text-[10px] text-muted-foreground">Données non disponibles</span>
          ) : (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatNumber(current)} / {formatNumber(target)} {unit}
            </span>
          )}
        </div>
        {available && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                met ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <div className="w-20 shrink-0 text-right">
        {!available ? null : met ? (
          <Badge variant="outline" className="border-success/30 bg-success/5 text-[10px] text-success">
            Rempli ✓
          </Badge>
        ) : weeksEta !== null ? (
          <span className="text-[11px] font-semibold tabular-nums text-foreground">
            ~{weeksEta} sem.
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">+2 ans</span>
        )}
      </div>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

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
    followers: {
      current: ap.followers.current ?? 0,
      target: ap.followers.target,
      available: ap.followers.available !== false,
    },
  } : null;

  const isDemo = !stats;
  const effectiveStats = stats ?? {
    avg_viewers: DEMO_STATS.avg_viewers,
    stream_days: DEMO_STATS.stream_days,
    stream_hours: DEMO_STATS.stream_hours,
    unique_chatters: DEMO_STATS.unique_chatters,
    followers: { ...DEMO_STATS.followers, available: true },
  };

  const projectionWeeks = 52;
  const points = useMemo(
    () => projectGrowth(effectiveStats.avg_viewers.current, sessionsPerWeek, durationHours, projectionWeeks),
    [effectiveStats.avg_viewers.current, sessionsPerWeek, durationHours],
  );

  const etaViewers = useMemo(
    () => weeksToReach(effectiveStats.avg_viewers.current, AFFILIATE_TARGETS.avg_viewers, sessionsPerWeek, durationHours),
    [effectiveStats.avg_viewers.current, sessionsPerWeek, durationHours],
  );
  const etaStreamDays = useMemo(
    () => weeksForStreamDays(sessionsPerWeek, AFFILIATE_TARGETS.stream_days),
    [sessionsPerWeek],
  );
  const etaStreamHours = useMemo(
    () => weeksForStreamHours(sessionsPerWeek, durationHours, AFFILIATE_TARGETS.stream_hours),
    [sessionsPerWeek, durationHours],
  );

  // Overall ETA: max of all criteria ETAs
  const allEtas = [
    etaViewers,
    etaStreamDays,
    etaStreamHours,
    effectiveStats.stream_days.current >= AFFILIATE_TARGETS.stream_days ? 0 : null,
  ].filter((e): e is number => e !== null);

  const overallEta = allEtas.length > 0 ? Math.max(...allEtas) : null;
  const affiliateAlreadyMet =
    effectiveStats.avg_viewers.current >= AFFILIATE_TARGETS.avg_viewers &&
    effectiveStats.stream_days.current >= AFFILIATE_TARGETS.stream_days &&
    effectiveStats.stream_hours.current >= AFFILIATE_TARGETS.stream_hours;

  const targetLine = AFFILIATE_TARGETS.avg_viewers;
  const chartMax = Math.max(...points.map((p) => p.viewers), targetLine * 1.5);

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
            Ajuste ton rythme et visualise le chemin vers tes paliers.
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
          {/* Left: chart + sliders */}
          <div className="space-y-5">
            {/* Sliders */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-5">
              <div className="mb-5 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Ton rythme</h2>
              </div>

              <div className="space-y-6">
                {/* Sessions per week */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      Sessions par semaine
                    </label>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {sessionsPerWeek}×
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={7}
                    step={1}
                    value={[sessionsPerWeek]}
                    onValueChange={([v]) => setSessionsPerWeek(v)}
                    className="cursor-pointer"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>1×</span>
                    <span>7×</span>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      Durée par session
                    </label>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {durationHours}h
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={0.5}
                    value={[durationHours]}
                    onValueChange={([v]) => setDurationHours(v)}
                    className="cursor-pointer"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>1h</span>
                    <span>5h</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { label: "Sessions / semaine", value: `${sessionsPerWeek}×` },
                  { label: "Heures / mois", value: `~${Math.round(sessionsPerWeek * durationHours * 4.3)}h` },
                  { label: "Jours de stream / 30j", value: `~${Math.round(sessionsPerWeek * 4.3)}j` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Projection chart */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-5">
              <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Projection viewers (52 semaines)
                  </h2>
                </div>
                {overallEta !== null && (
                  affiliateAlreadyMet ? (
                    <Badge variant="outline" className="border-success/30 bg-success/5 text-success text-[10px]">
                      Critères viewers remplis ✓
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px]">
                      ~{overallEta} sem. à l'affiliation
                    </Badge>
                  )
                )}
              </div>
              <p className="mb-4 text-[11px] text-muted-foreground">
                Modèle simplifié · basé sur la croissance organique typique à ce niveau.
              </p>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sim-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
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
                        if (v % 13 === 0) return `S${v}`;
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
                      y={targetLine}
                      stroke="hsl(var(--success))"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      label={{
                        value: "Cible affilié (3 vw)",
                        position: "insideTopLeft",
                        fontSize: 9,
                        fill: "hsl(var(--success))",
                        dy: -4,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="viewers"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#sim-grad)"
                      dot={false}
                      activeDot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: criteria breakdown */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Critères d'affiliation</h2>
            <p className="mb-4 text-[11px] text-muted-foreground">
              Basé sur ton rythme actuel de {sessionsPerWeek} session{sessionsPerWeek > 1 ? "s" : ""}/sem.
            </p>

            <div className="divide-y divide-border/40">
              <CriterionRow
                label="Viewers moyens (30j)"
                current={effectiveStats.avg_viewers.current}
                target={AFFILIATE_TARGETS.avg_viewers}
                unit="vw"
                weeksEta={etaViewers}
              />
              <CriterionRow
                label="Jours de stream (30j)"
                current={Math.round(sessionsPerWeek * 4.3)}
                target={AFFILIATE_TARGETS.stream_days}
                unit="j"
                weeksEta={etaStreamDays}
              />
              <CriterionRow
                label="Heures streamées (30j)"
                current={Math.round(sessionsPerWeek * durationHours * 4.3)}
                target={AFFILIATE_TARGETS.stream_hours}
                unit="h"
                weeksEta={etaStreamHours}
              />
              <CriterionRow
                label="Chatters uniques (30j)"
                current={effectiveStats.unique_chatters.current}
                target={AFFILIATE_TARGETS.unique_chatters}
                unit="ch."
                weeksEta={null}
              />
              <CriterionRow
                label="Followers"
                current={effectiveStats.followers.current}
                target={AFFILIATE_TARGETS.followers}
                unit="fs"
                weeksEta={null}
                available={effectiveStats.followers.available}
              />
            </div>

            <div className="mt-5 space-y-2">
              {!report && !loading && (
                <Button asChild className="w-full" size="sm">
                  <Link to="/connect-twitch">
                    <Sparkles className="h-3.5 w-3.5" />
                    Connecte Twitch pour une vue réelle
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full" size="sm">
                <Link to="/affiliation">
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
