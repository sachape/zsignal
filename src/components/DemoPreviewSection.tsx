import { useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  Target,
  Calendar,
  Sparkles,
  Radio,
  ArrowUpRight,
} from "lucide-react";

const FINAL_SCORE = 62;
const SIMILAR_CHANNELS = [
  { name: "streamzilla_fr", followers: "2.4K", similarity: 87, live: true },
  { name: "nightowl_ttv", followers: "1.8K", similarity: 74, live: false },
];
const PROGRESS_ITEMS = [
  { label: "Viewers moyens", value: "2.8 / 3", pct: 93 },
  { label: "Jours de stream", value: "6 / 7", pct: 86 },
  { label: "Chatteurs uniques", value: "42 / 50", pct: 84 },
];
const SPARKLINE_POINTS = [12, 14, 13, 16, 15, 18, 17, 19, 22, 21, 24, 26];

/** Hook: trigger once when element reaches `threshold` visibility. */
const useInViewOnce = <T extends HTMLElement>(threshold = 0.3) => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [inView, threshold]);
  return { ref, inView };
};

/** Animated count-up from 0 to target. */
const useCountUp = (target: number, active: boolean, duration = 1600) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
};

const ScoreRing = ({ active }: { active: boolean }) => {
  const score = useCountUp(FINAL_SCORE, active, 1800);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const grade = score >= 80 ? "Excellent" : score >= 60 ? "Bon" : score >= 40 ? "Moyen" : "À travailler";

  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeOpacity="0.35"
          strokeWidth="10"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          filter={score === FINAL_SCORE ? "url(#scoreGlow)" : undefined}
          style={{ transition: "stroke-dashoffset 60ms linear" }}
        />
      </svg>
      <div className="flex flex-col items-center text-center">
        <span
          className="text-5xl font-bold tracking-tight text-foreground"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {score}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          / 100 · {grade}
        </span>
      </div>
    </div>
  );
};

const Sparkline = ({ active }: { active: boolean }) => {
  const w = 120;
  const h = 36;
  const max = Math.max(...SPARKLINE_POINTS);
  const min = Math.min(...SPARKLINE_POINTS);
  const range = max - min || 1;
  const step = w / (SPARKLINE_POINTS.length - 1);
  const points = SPARKLINE_POINTS.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-9 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill="url(#sparkArea)"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 800ms ease-out 400ms",
        }}
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: active ? 0 : 300,
          transition: "stroke-dashoffset 1200ms ease-out 200ms",
        }}
      />
    </svg>
  );
};

const ProgressBar = ({
  label,
  value,
  pct,
  active,
  delay,
}: {
  label: string;
  value: string;
  pct: number;
  active: boolean;
  delay: number;
}) => (
  <div>
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="font-medium text-foreground"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
    <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-emerald-400"
        style={{
          width: active ? `${pct}%` : "0%",
          transition: `width 1100ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        }}
      />
      {active && (
        <div
          className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          style={{
            animation: `bento-shimmer 1.4s ease-out ${delay + 1100}ms 1 forwards`,
          }}
        />
      )}
    </div>
  </div>
);

const ChannelRow = ({
  channel,
  active,
  delay,
}: {
  channel: (typeof SIMILAR_CHANNELS)[number];
  active: boolean;
  delay: number;
}) => (
  <div
    className="flex items-center gap-3 rounded-lg border border-white/5 bg-card/40 p-2.5 backdrop-blur-sm"
    style={{
      opacity: active ? 1 : 0,
      transform: active ? "translateX(0)" : "translateX(24px)",
      transition: `opacity 600ms ease-out ${delay}ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    }}
  >
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-emerald-500/20 text-xs font-semibold text-foreground">
      {channel.name[0].toUpperCase()}
      {channel.live && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-background bg-destructive" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-sm font-medium text-foreground">
          {channel.name}
        </span>
        {channel.live && (
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-destructive/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive">
            <Radio className="h-2 w-2" />
            Live
          </span>
        )}
      </div>
      <p
        className="text-[10px] text-muted-foreground"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {channel.followers} abonnés
      </p>
    </div>
    <span
      className="rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold tabular-nums text-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {channel.similarity}%
    </span>
  </div>
);

const BentoCell = ({
  className = "",
  label,
  children,
  hero = false,
}: {
  className?: string;
  label?: string;
  children: React.ReactNode;
  hero?: boolean;
}) => (
  <div
    className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-card/40 p-5 backdrop-blur-xl ${className}`}
  >
    {hero && <div className="bento-hero-border" aria-hidden />}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_55%)]" />
    <div className="relative flex h-full flex-col">
      {label && (
        <span className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
          {label}
        </span>
      )}
      {children}
    </div>
  </div>
);

const DemoPreviewSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);

  return (
    <section className="relative overflow-hidden py-20">
      {/* Background spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-30" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
            <Sparkles className="h-3 w-3" />
            Aperçu
          </span>
          <h2 className="mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Ton dashboard en un coup d'œil
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Découvre ce que StreamPulse voit dès la première analyse.
          </p>
        </div>

        {/* Bento grid */}
        <div
          ref={ref}
          className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[148px]"
        >
          {/* StreamScore — hero cell */}
          <BentoCell
            hero
            label="Score global"
            className="md:col-span-3 md:row-span-2"
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <ScoreRing active={inView} />
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                En progression · +4 pts cette semaine
              </div>
            </div>
          </BentoCell>

          {/* Tendance viewers (sparkline micro-widget) */}
          <BentoCell label="Tendance viewers" className="md:col-span-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p
                  className="text-2xl font-bold tracking-tight text-foreground"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  +12%
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                  <TrendingUp className="h-3 w-3" />
                  cette semaine
                </p>
              </div>
              <div className="flex-1 max-w-[140px]">
                <Sparkline active={inView} />
              </div>
            </div>
          </BentoCell>

          {/* Similar channels */}
          <BentoCell label="Chaînes similaires" className="md:col-span-3 md:row-span-2">
            <div className="flex flex-1 flex-col gap-2">
              {SIMILAR_CHANNELS.map((c, i) => (
                <ChannelRow
                  key={c.name}
                  channel={c}
                  active={inView}
                  delay={300 + i * 150}
                />
              ))}
              <div
                className="mt-auto flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground"
                style={{
                  opacity: inView ? 1 : 0,
                  transition: "opacity 700ms ease-out 700ms",
                }}
              >
                <span>+ 8 autres chaînes pertinentes</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </BentoCell>

          {/* Affiliation progress */}
          <BentoCell label="Progression affiliation" className="md:col-span-3 md:row-span-2">
            <div className="flex flex-1 flex-col justify-between gap-3">
              <div className="space-y-3">
                {PROGRESS_ITEMS.map((item, i) => (
                  <ProgressBar
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    pct={item.pct}
                    active={inView}
                    delay={i * 200}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-[11px]">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">
                  Affiliation dans <span className="font-semibold text-foreground">~9 jours</span>
                </span>
              </div>
            </div>
          </BentoCell>

          {/* Best slot micro-widget */}
          <BentoCell label="Meilleur créneau" className="md:col-span-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Mardi · 21h00
                </p>
                <p className="text-[11px] text-muted-foreground">
                  +38% de viewers vs ta moyenne
                </p>
              </div>
            </div>
          </BentoCell>
        </div>
      </div>

      {/* Section-scoped styles */}
      <style>{`
        @keyframes bento-shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(450%); }
        }
        @property --bento-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes bento-rotate {
          to { --bento-angle: 360deg; }
        }
        .bento-hero-border {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(
            from var(--bento-angle),
            transparent 0deg,
            hsl(var(--primary) / 0.7) 60deg,
            #34d39988 90deg,
            transparent 180deg,
            transparent 360deg
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: bento-rotate 6s linear infinite;
          pointer-events: none;
        }
      `}</style>
    </section>
  );
};

export default DemoPreviewSection;
