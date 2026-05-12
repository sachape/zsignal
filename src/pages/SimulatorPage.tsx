import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  CheckCircle2, Circle, Lock, Sparkles, ArrowRight, Zap,
  ChevronDown, ChevronUp, Users, Clock, Calendar, MessageSquare, Star,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport, getLatestReportForPlatformUser, type SavedReport,
} from "@/services/reportRepository";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const STREAMNCO_BOOST = 2.2;

const PRESETS = [
  { label: "Débutant", sessions: 2, duration: 1 },
  { label: "Régulier", sessions: 3, duration: 2 },
  { label: "Sérieux", sessions: 5, duration: 2 },
] as const;

const CRITERIA_META = [
  {
    key: "avg_viewers",
    label: "Viewers moyens",
    description: "Spectateurs en direct en moyenne sur tes 30 derniers jours",
    icon: Users,
    unit: "vw",
    target: 3,
  },
  {
    key: "stream_days",
    label: "Jours de stream",
    description: "Jours où tu as streamé sur les 30 derniers jours",
    icon: Calendar,
    unit: "j",
    target: 7,
  },
  {
    key: "stream_hours",
    label: "Heures streamées",
    description: "Durée totale de tes lives sur les 30 derniers jours",
    icon: Clock,
    unit: "h",
    target: 8,
  },
  {
    key: "unique_chatters",
    label: "Chatters uniques",
    description: "Personnes différentes qui ont écrit dans ton chat",
    icon: MessageSquare,
    unit: "ch.",
    target: 3,
  },
  {
    key: "followers",
    label: "Followers",
    description: "Abonnés à ta chaîne Twitch",
    icon: Star,
    unit: "fs",
    target: 50,
  },
] as const;

/* ─── Projection models ──────────────────────────────────────────────────────── */

interface ProjectionPoint { week: number; viewers: number; viewersBoosted: number }

function computeViewers(start: number, spw: number, dh: number, weeks: number, mul = 1): number[] {
  const out: number[] = [];
  let v = start;
  for (let w = 0; w <= weeks; w++) {
    out.push(Math.round(v * 10) / 10);
    const base = v < 5 ? 0.08 : v < 15 ? 0.05 : 0.03;
    v = Math.max(v + spw * base * mul + Math.min(dh / 3, 1) * 0.02 * v * mul, 0);
  }
  return out;
}

function buildPoints(start: number, spw: number, dh: number, weeks: number): ProjectionPoint[] {
  const base = computeViewers(start, spw, dh, weeks, 1);
  const boost = computeViewers(start, spw, dh, weeks, STREAMNCO_BOOST);
  return base.map((v, i) => ({ week: i, viewers: v, viewersBoosted: boost[i] }));
}

function weeksToTarget(start: number, target: number, spw: number, dh: number, mul = 1): number | null {
  if (start >= target) return 0;
  const vals = computeViewers(start, spw, dh, 156, mul);
  const idx = vals.findIndex((v) => v >= target);
  return idx === -1 ? null : idx;
}

function weeksToFollowers(cur: number, target: number, spw: number, sv: number, dh: number, mul = 1): number | null {
  if (cur >= target) return 0;
  const vbw = computeViewers(sv, spw, dh, 156, mul);
  let f = cur;
  for (let w = 0; w < vbw.length; w++) {
    f += spw * Math.max(0.3, vbw[w] * 0.15 + 0.3);
    if (f >= target) return w;
  }
  return null;
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload: ProjectionPoint }> }) => {
  if (!active || !payload?.length) return null;
  const week = payload[0].payload.week;
  return (
    <div className="rounded-md border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <p className="mb-1.5 font-semibold text-foreground">Semaine {week}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
          {p.name === "viewersBoosted" ? "Avec Streamnco" : "Sans outil"} · <span className="font-semibold">~{formatNumber(p.value)} vw</span>
        </p>
      ))}
    </div>
  );
};

interface CriterionRowProps {
  label: string;
  description: string;
  icon: React.ElementType;
  current: number;
  target: number;
  unit: string;
  etaBase: number | null;
  etaBoosted: number | null;
  available?: boolean;
  note?: string;
}

const CriterionRow = ({ label, description, icon: Icon, current, target, unit, etaBase, etaBoosted, available = true, note }: CriterionRowProps) => {
  const met = current >= target;
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="flex items-start gap-3 py-3.5">
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {!available ? <Lock className="h-4 w-4 text-muted-foreground/30" />
          : met ? <CheckCircle2 className="h-4 w-4 text-success" />
          : <Circle className="h-4 w-4 text-muted-foreground/30" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", met ? "text-success" : "text-muted-foreground/50")} />
          <span className="text-sm font-medium text-foreground">{label}</span>
          {available && (
            <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
              {formatNumber(current)} / {formatNumber(target)} {unit}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{description}</p>
        {available && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn("h-full rounded-full transition-all duration-700", met ? "bg-success" : "bg-primary/60")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* ETA */}
      <div className="w-20 shrink-0 text-right">
        {!available ? null : met ? (
          <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Rempli ✓</span>
        ) : note ? (
          <span className="text-[10px] italic text-muted-foreground/60">{note}</span>
        ) : (
          <div className="space-y-0.5">
            {etaBoosted !== null && (
              <div className="flex items-center justify-end gap-1">
                <Zap className="h-2.5 w-2.5 text-primary" />
                <span className="text-[11px] font-bold tabular-nums text-primary">~{etaBoosted} sem.</span>
              </div>
            )}
            {etaBase !== null && etaBase !== etaBoosted && (
              <div className="text-[10px] tabular-nums text-muted-foreground/40 line-through">~{etaBase} sem.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Demo data ─────────────────────────────────────────────────────────────── */

const DEMO = {
  avg_viewers: { current: 1.5, target: 3 },
  stream_days: { current: 4, target: 7 },
  stream_hours: { current: 6, target: 8 },
  unique_chatters: { current: 1, target: 3 },
  followers: { current: 18, target: 50, available: true },
};

/* ─── Page ───────────────────────────────────────────────────────────────────── */

const SimulatorPage = () => {
  const { user } = useAuth();
  const { account } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [durationHours, setDurationHours] = useState(2);
  const [activePreset, setActivePreset] = useState<number | null>(1); // index in PRESETS, null = custom
  const [showChart, setShowChart] = useState(false);
  const [showAffiliationInfo, setShowAffiliationInfo] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const r = account?.platform_user_id
        ? await getLatestReportForPlatformUser(user.id, account.platform_user_id)
        : await getLatestReport(user.id);
      setReport(r);
      setLoading(false);
    })();
  }, [user, account]);

  const ap = report?.report?.affiliate_progress ?? null;
  const s = ap ? {
    avg_viewers: { current: ap.avg_viewers.current, target: ap.avg_viewers.target },
    stream_days: { current: ap.stream_days.current, target: ap.stream_days.target },
    stream_hours: { current: ap.stream_hours.current, target: ap.stream_hours.target },
    unique_chatters: { current: ap.unique_chatters.current, target: ap.unique_chatters.target },
    followers: { current: ap.followers.current ?? 0, target: ap.followers.target, available: ap.followers.available !== false },
  } : {
    avg_viewers: DEMO.avg_viewers,
    stream_days: DEMO.stream_days,
    stream_hours: DEMO.stream_hours,
    unique_chatters: DEMO.unique_chatters,
    followers: DEMO.followers,
  };

  const isDemo = !ap;
  const cv = s.avg_viewers.current;

  const handlePreset = (idx: number) => {
    setActivePreset(idx);
    setSessionsPerWeek(PRESETS[idx].sessions);
    setDurationHours(PRESETS[idx].duration);
  };

  const handleSlider = (setter: (v: number) => void) => (val: number[]) => {
    setter(val[0]);
    setActivePreset(null);
  };

  // ETAs
  const etaViewersBase = useMemo(() => weeksToTarget(cv, 3, sessionsPerWeek, durationHours, 1), [cv, sessionsPerWeek, durationHours]);
  const etaViewersBoosted = useMemo(() => weeksToTarget(cv, 3, sessionsPerWeek, durationHours, STREAMNCO_BOOST), [cv, sessionsPerWeek, durationHours]);
  const etaStreamDays = useMemo(() => sessionsPerWeek * 4.3 >= 7 ? 0 : null, [sessionsPerWeek]);
  const etaStreamHours = useMemo(() => sessionsPerWeek * durationHours * 4.3 >= 8 ? 0 : null, [sessionsPerWeek, durationHours]);
  const etaFollowersBase = useMemo(() => weeksToFollowers(s.followers.current, 50, sessionsPerWeek, cv, durationHours, 1), [s.followers.current, sessionsPerWeek, cv, durationHours]);
  const etaFollowersBoosted = useMemo(() => weeksToFollowers(s.followers.current, 50, sessionsPerWeek, cv, durationHours, STREAMNCO_BOOST), [s.followers.current, sessionsPerWeek, cv, durationHours]);

  // null = impossible at current pace — propagate as Infinity so the max captures it
  const toW = (v: number | null) => (v === null ? Infinity : v);
  const maxBoosted = Math.max(toW(etaViewersBoosted), toW(etaStreamDays), toW(etaStreamHours), toW(etaFollowersBoosted));
  const overallBoostedEta = isFinite(maxBoosted) ? maxBoosted : null;
  const maxBase = Math.max(toW(etaViewersBase), toW(etaStreamDays), toW(etaStreamHours), toW(etaFollowersBase));
  const overallBaseEta = isFinite(maxBase) ? maxBase : null;

  const savings = overallBaseEta !== null && overallBoostedEta !== null
    ? Math.max(0, overallBaseEta - overallBoostedEta)
    : 0;

  const projectionWeeks = Math.min(Math.max(Math.ceil((overallBaseEta ?? 52) * 1.3), 8), 104);
  const tickInterval = projectionWeeks <= 8 ? 2 : projectionWeeks <= 20 ? 4 : projectionWeeks <= 40 ? 8 : 13;
  const points = useMemo(() => buildPoints(cv, sessionsPerWeek, durationHours, projectionWeeks), [cv, sessionsPerWeek, durationHours, projectionWeeks]);
  const chartMax = Math.max(...points.map((p) => p.viewersBoosted), 4.5);

  const projectedStreamDays = Math.round(sessionsPerWeek * 4.3);
  const projectedStreamHours = Math.round(sessionsPerWeek * durationHours * 4.3);

  const alreadyAffiliate = overallBoostedEta === 0 && overallBaseEta === 0;

  return (
    <AppShell>
      <PageContainer size="sm">

        <PageHeader
          title="Simulateur d'affiliation"
          description="Configure ton rythme et vois combien de temps il te reste — avec et sans Streamnco."
        />

        {/* ── Demo banner ── */}
        {isDemo && !loading && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Simulation avec des données types.{" "}
              <Link to="/connect-twitch" className="font-semibold text-primary hover:underline">
                Connecte Twitch
              </Link>{" "}
              pour une projection sur ta vraie chaîne.
            </p>
          </div>
        )}

        {/* ── HERO — L'insight en premier ── */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-card/50 p-6 backdrop-blur-xl">
          {/* Glows */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_60%)]" />

          <div className="relative">
            {alreadyAffiliate ? (
              <div className="text-center">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-success/25 bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <p className="text-xl font-bold text-foreground">Critères remplis ✓</p>
                <p className="mt-1 text-sm text-muted-foreground">À ce rythme, tu as tous les critères d'affiliation.</p>
              </div>
            ) : overallBoostedEta === null ? (
              <div className="text-center">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
                  <Lock className="h-5 w-5 text-destructive/70" />
                </div>
                <p className="text-xl font-bold text-foreground">Rythme insuffisant</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Certains critères ne peuvent pas être atteints à ce rythme — augmente le nombre de sessions ou la durée.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Ta trajectoire vers l'affiliation
                </p>

                <div className="flex items-center justify-center gap-6 sm:gap-10">
                  {/* Sans Streamnco */}
                  <div className="text-center">
                    <p className="mb-1 text-[11px] text-muted-foreground/60">Sans Streamnco</p>
                    <p className="text-3xl font-bold tabular-nums text-muted-foreground/40 line-through">
                      {overallBaseEta !== null ? `~${overallBaseEta}` : "?"}
                      <span className="text-lg"> sem.</span>
                    </p>
                  </div>

                  {/* Flèche + gain */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    {savings > 0 && (
                      <span className="whitespace-nowrap rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        -{savings} sem.
                      </span>
                    )}
                  </div>

                  {/* Avec Streamnco */}
                  <div className="text-center">
                    <p className="mb-1 text-[11px] font-semibold text-primary/70">Avec Streamnco</p>
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {overallBoostedEta !== null ? `~${overallBoostedEta}` : "?"}
                      <span className="text-lg text-muted-foreground"> sem.</span>
                    </p>
                  </div>
                </div>

                {savings > 0 && (
                  <p className="mt-4 text-center text-sm font-semibold text-primary">
                    Tu arrives {savings} semaine{savings > 1 ? "s" : ""} plus tôt avec Streamnco.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Presets ── */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Ton profil de streamer</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => handlePreset(i)}
                className={cn(
                  "rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150",
                  activePreset === i
                    ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                )}
              >
                <span className="block text-base leading-none mb-1">
                  {i === 0 ? "🌱" : i === 1 ? "🎮" : "🔥"}
                </span>
                {p.label}
                <span className="block text-[9px] font-normal opacity-60 mt-0.5">
                  {p.sessions}×/sem · {p.duration}h
                </span>
              </button>
            ))}
            <button
              onClick={() => setActivePreset(null)}
              className={cn(
                "rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150",
                activePreset === null
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/20 hover:text-foreground",
              )}
            >
              <span className="block text-base leading-none mb-1">⚙️</span>
              Perso.
              <span className="block text-[9px] font-normal opacity-60 mt-0.5">
                {sessionsPerWeek}×/sem · {durationHours}h
              </span>
            </button>
          </div>
        </div>

        {/* ── Sliders ── */}
        <div className="mb-5 rounded-2xl border border-border/50 bg-card/40 p-5">
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Sessions par semaine</label>
                <span className="text-sm font-bold tabular-nums text-primary">{sessionsPerWeek}×</span>
              </div>
              <Slider
                min={1} max={7} step={1}
                value={[sessionsPerWeek]}
                onValueChange={handleSlider(setSessionsPerWeek)}
                className="cursor-pointer"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
                <span>1× (occasionnel)</span><span>7× (quotidien)</span>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Durée par session</label>
                <span className="text-sm font-bold tabular-nums text-primary">{durationHours}h</span>
              </div>
              <Slider
                min={1} max={5} step={0.5}
                value={[durationHours]}
                onValueChange={handleSlider(setDurationHours)}
                className="cursor-pointer"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
                <span>1h</span><span>5h</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── What is affiliation ── */}
        <button
          onClick={() => setShowAffiliationInfo((v) => !v)}
          className="mb-5 flex w-full items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
        >
          <span className="text-xs font-semibold text-muted-foreground">C'est quoi l'affiliation Twitch ?</span>
          {showAffiliationInfo
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </button>
        {showAffiliationInfo && (
          <div className="mb-5 rounded-xl border border-border/40 bg-muted/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            L'affiliation Twitch, c'est le <strong className="text-foreground">premier palier de monétisation</strong> — bits, abonnements et revenus publicitaires. Twitch te l'accorde automatiquement quand tu remplis ces 5 critères <strong className="text-foreground">sur 30 jours consécutifs</strong>.
          </div>
        )}

        {/* ── Criteria ── */}
        <div className="mb-5 rounded-2xl border border-border/50 bg-card/40 p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Les 5 critères</h2>
            {overallBoostedEta !== null && overallBoostedEta > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-bold text-primary">~{overallBoostedEta} sem. avec Streamnco</span>
              </div>
            )}
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground/60">
            {sessionsPerWeek} session{sessionsPerWeek > 1 ? "s" : ""}/sem. · {durationHours}h · ETA calculé avec et sans Streamnco
          </p>

          <div className="divide-y divide-border/30">
            <CriterionRow
              label={CRITERIA_META[0].label}
              description={CRITERIA_META[0].description}
              icon={CRITERIA_META[0].icon}
              current={cv} target={3} unit="vw"
              etaBase={etaViewersBase} etaBoosted={etaViewersBoosted}
            />
            <CriterionRow
              label={CRITERIA_META[1].label}
              description={CRITERIA_META[1].description}
              icon={CRITERIA_META[1].icon}
              current={projectedStreamDays} target={7} unit="j"
              etaBase={etaStreamDays} etaBoosted={etaStreamDays}
              note={etaStreamDays === null ? "Augmente le rythme" : undefined}
            />
            <CriterionRow
              label={CRITERIA_META[2].label}
              description={CRITERIA_META[2].description}
              icon={CRITERIA_META[2].icon}
              current={projectedStreamHours} target={8} unit="h"
              etaBase={etaStreamHours} etaBoosted={etaStreamHours}
              note={etaStreamHours === null ? "Durée insuffisante" : undefined}
            />
            <CriterionRow
              label={CRITERIA_META[3].label}
              description={CRITERIA_META[3].description}
              icon={CRITERIA_META[3].icon}
              current={s.unique_chatters.current} target={3} unit="ch."
              etaBase={etaViewersBase} etaBoosted={etaViewersBoosted}
              note={s.unique_chatters.current < 3 && cv < 1 ? "Suit tes viewers" : undefined}
            />
            <CriterionRow
              label={CRITERIA_META[4].label}
              description={CRITERIA_META[4].description}
              icon={CRITERIA_META[4].icon}
              current={s.followers.current} target={50} unit="fs"
              etaBase={etaFollowersBase} etaBoosted={etaFollowersBoosted}
              available={s.followers.available}
            />
          </div>
        </div>

        {/* ── Chart (collapsible) ── */}
        <div className="mb-6">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/30 px-5 py-3 text-left transition-colors hover:bg-card/50"
          >
            <span className="text-sm font-medium text-foreground">Voir la projection détaillée</span>
            {showChart
              ? <ChevronUp className="h-4 w-4 text-muted-foreground/60" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground/60" />}
          </button>

          {showChart && (
            <div className="mt-2 rounded-xl border border-border/50 bg-card/40 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full bg-primary/35" />
                    Sans outil {overallBaseEta !== null && <span className="opacity-60">(~{overallBaseEta} sem.)</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full bg-primary" />
                    <span className="font-semibold text-primary">Avec Streamnco</span>
                  </span>
                </div>
              </div>
              <div className="h-[180px] w-full">
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
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => v === 0 ? "Départ" : v % tickInterval === 0 ? `S${v}` : ""} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => formatNumber(v)} domain={[0, Math.ceil(chartMax)]} width={32} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                    <ReferenceLine y={3} stroke="hsl(var(--success))" strokeWidth={1.5} strokeDasharray="4 3"
                      label={{ value: "Cible affilié (3 vw)", position: "insideTopLeft", fontSize: 9, fill: "hsl(var(--success))", dy: -4 }} />
                    <Area type="monotone" dataKey="viewers" stroke="hsl(var(--primary))" strokeWidth={1} strokeOpacity={0.3} fill="url(#grad-base)" dot={false} activeDot={false} />
                    <Area type="monotone" dataKey="viewersBoosted" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad-boost)" dot={false} activeDot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="space-y-2.5">
          {!report && !loading ? (
            <Button asChild className="w-full" size="lg">
              <Link to="/connect-twitch">
                <Sparkles className="h-4 w-4" />
                Analyser ma vraie chaîne
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild className="w-full" size="lg">
              <Link to="/progression">
                Voir ma progression complète
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {report && (
            <Button asChild variant="outline" className="w-full" size="sm">
              <Link to="/analyse">
                Consulter mon analyse détaillée
              </Link>
            </Button>
          )}
        </div>

      </PageContainer>
    </AppShell>
  );
};

export default SimulatorPage;
