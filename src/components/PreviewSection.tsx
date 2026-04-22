/**
 * PreviewSection — Bento-grid product showcase with scroll-triggered animations.
 * Self-contained: uses React hooks + CSS keyframes injected via <style>.
 * No external animation library required.
 */
import { useRef, useState, useEffect, type CSSProperties } from "react";
import { Clock, TrendingUp, Users } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────
const SCORE = 62;
const RING_SIZE = 148;
const RING_R = 58;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;

const COMPETITORS = [
  { name: "streamzilla_fr", followers: "2.4K", similarity: 87, initials: "SZ" },
  { name: "nightowl_ttv",   followers: "1.8K", similarity: 74, initials: "NO" },
] as const;

const AFFILIATES = [
  { label: "Viewers moyens",    value: "2.8 / 3", pct: 93 },
  { label: "Jours de stream",   value: "6 / 7",   pct: 86 },
  { label: "Chatteurs uniques", value: "42 / 50",  pct: 84 },
] as const;

const SPARKLINE_PTS = "0,26 10,22 22,19 33,15 44,11 55,7 60,4";

// ── Keyframes (scoped names prevent collisions) ──────────────────────
const INJECTED_CSS = `
  @keyframes pv-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pv-pulse {
    0%,100% { opacity:1; }
    50%      { opacity:.3; }
  }
  @keyframes pv-fade-up {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pv-slide-in {
    from { opacity:0; transform:translateX(22px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes pv-scale-in {
    from { opacity:0; transform:scale(0.93) translateY(14px); }
    to   { opacity:1; transform:scale(1)    translateY(0); }
  }
  @keyframes pv-bar-shimmer {
    0%   { transform:translateX(-200%); }
    100% { transform:translateX(400%); }
  }
  @keyframes pv-ring-glow {
    0%,100% { box-shadow: 0 0 18px hsl(95,98%,61%,.25); }
    50%      { box-shadow: 0 0 40px hsl(95,98%,61%,.55); }
  }
`;

// ── Helper ───────────────────────────────────────────────────────────
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function visAnim(
  visible: boolean,
  name: string,
  delay = 0,
  duration = 650,
): CSSProperties {
  return visible
    ? {
        animation: `${name} ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
      }
    : { opacity: 0 };
}

// ── Sub-components ───────────────────────────────────────────────────

/** Rotating-border StreamScore hero cell */
function ScoreCell({
  display,
  ringOffset,
  pulsed,
  visible,
}: {
  display: number;
  ringOffset: number;
  pulsed: boolean;
  visible: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl sm:col-start-1 sm:row-start-1 sm:row-span-2"
      style={visAnim(visible, "pv-scale-in", 60)}
    >
      {/* ── Rotating border beam ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(95,98%,61%,.65) 38deg, hsl(172,66%,50%,.45) 58deg, transparent 85deg, transparent 270deg, hsl(95,98%,61%,.25) 318deg, transparent 360deg)",
          animation: "pv-spin 7s linear infinite",
        }}
      />
      {/* ── Inner mask (covers center, leaving 1 px ring) ── */}
      <div className="absolute inset-[1px] rounded-[11px] bg-card" />

      {/* ── Content ── */}
      <div className="relative z-10 flex min-h-[310px] flex-col items-center justify-center gap-5 p-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Score global
        </p>

        {/* Ring */}
        <div className="relative">
          {/* Ambient pulse glow when score is revealed */}
          {pulsed && (
            <div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(95,98%,61%,.18) 0%, transparent 70%)",
                animation: "pv-ring-glow 2.5s ease-in-out infinite",
              }}
            />
          )}

          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            className="-rotate-90"
            aria-hidden
          >
            <defs>
              <linearGradient id="pv-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="hsl(95,98%,61%)" />
                <stop offset="100%" stopColor="hsl(172,66%,50%)" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx={RING_CX} cy={RING_CY} r={RING_R}
              fill="none"
              stroke="hsl(220,14%,15%)"
              strokeWidth="9"
            />
            {/* Progress arc */}
            <circle
              cx={RING_CX} cy={RING_CY} r={RING_R}
              fill="none"
              stroke="url(#pv-ring-grad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={ringOffset}
              style={{
                transition: "stroke-dashoffset 1.65s cubic-bezier(0.22,1,0.36,1)",
                filter: "drop-shadow(0 0 7px hsl(95,98%,61%,.5))",
              }}
            />
          </svg>

          {/* Center number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[2.6rem] font-bold tabular-nums leading-none text-foreground">
              {display}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">sur 100</span>
          </div>
        </div>

        {/* Label + status */}
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">StreamScore</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{ animation: "pv-pulse 2s ease-in-out infinite" }}
            />
            Bon — En progression
          </span>
        </div>

        {/* Mini metric pills */}
        <div className="flex w-full gap-2.5">
          {[
            { label: "Engagement", val: "78%" },
            { label: "Régularité", val: "85%" },
          ].map((m) => (
            <div
              key={m.label}
              className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-center"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                {m.val}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Similar-channel card */
function CompetitorCell({
  name,
  followers,
  similarity,
  initials,
  visible,
  delay,
  gridClass,
}: {
  name: string;
  followers: string;
  similarity: number;
  initials: string;
  visible: boolean;
  delay: number;
  gridClass: string;
}) {
  return (
    <div
      className={`group rounded-xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-[0_0_28px_hsl(var(--primary)/0.07)] ${gridClass}`}
      style={visAnim(visible, "pv-slide-in", delay)}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Chaînes similaires
      </p>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-bold text-primary ring-1 ring-primary/15">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Users className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{followers} abonnés</p>
          </div>
        </div>
        {/* Similarity badge with glow */}
        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]">
          {similarity}%
        </span>
      </div>
    </div>
  );
}

/** Best streaming time micro-widget */
function BestTimeCell({
  visible,
  delay,
}: {
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-accent/20 sm:col-start-3 sm:row-start-1"
      style={visAnim(visible, "pv-slide-in", delay)}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Meilleur horaire
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
          <Clock className="h-4.5 w-4.5 text-accent" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <p className="font-mono text-xl font-bold tabular-nums leading-none text-foreground">
            21h00
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Mardi · Mercredi</p>
        </div>
      </div>
    </div>
  );
}

/** Viewer trend micro-widget with sparkline */
function TrendCell({
  visible,
  delay,
}: {
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 sm:col-start-3 sm:row-start-2"
      style={visAnim(visible, "pv-slide-in", delay)}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Viewers en hausse
      </p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-mono text-2xl font-bold tabular-nums leading-none text-primary">
            +12%
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            cette semaine
          </p>
        </div>
        {/* Sparkline */}
        <svg
          viewBox="0 0 62 32"
          className="h-9 w-[4.5rem]"
          aria-hidden
        >
          <defs>
            <linearGradient id="pv-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="hsl(95,98%,61%)" stopOpacity=".3" />
              <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Fill under line */}
          <polygon
            points={`${SPARKLINE_PTS} 60,32 0,32`}
            fill="url(#pv-spark-fill)"
          />
          {/* Line */}
          <polyline
            points={SPARKLINE_PTS}
            fill="none"
            stroke="hsl(95,98%,61%)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={180}
            strokeDashoffset={visible ? 0 : 180}
            style={{ transition: "stroke-dashoffset 1.2s ease 0.6s" }}
          />
        </svg>
      </div>
    </div>
  );
}

/** Affiliation progress — full-width bottom cell */
function AffiliationCell({
  barsVisible,
  visible,
}: {
  barsVisible: boolean[];
  visible: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 sm:col-span-3 sm:col-start-1 sm:row-start-3"
      style={visAnim(visible, "pv-fade-up", 480)}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Progression affiliation
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
          <span
            className="h-1 w-1 rounded-full bg-primary"
            style={{ animation: "pv-pulse 2s ease-in-out infinite" }}
          />
          En cours
        </span>
      </div>

      {/* Bars */}
      <div className="grid gap-5 sm:grid-cols-3">
        {AFFILIATES.map((item, i) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono tabular-nums text-foreground">{item.value}</span>
            </div>
            {/* Track */}
            <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
              {/* Fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{
                  width: barsVisible[i] ? `${item.pct}%` : "0%",
                  transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 0.2}s`,
                  boxShadow: barsVisible[i]
                    ? "0 0 10px hsl(95,98%,61%,.45)"
                    : "none",
                }}
              />
              {/* Shimmer sweep after bar fills */}
              {barsVisible[i] && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)",
                    width: "35%",
                    animation: `pv-bar-shimmer 0.65s ease ${0.9 + i * 0.22}s both`,
                  }}
                />
              )}
            </div>
            <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
              {item.pct}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────
export default function PreviewSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible]     = useState(false);
  const [display, setDisplay]     = useState(0);
  const [pulsed, setPulsed]       = useState(false);
  const [barsVisible, setBarsVisible] = useState([false, false, false]);

  // ── Trigger on scroll ──────────────────────────────────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── Count-up score ─────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const duration = 1650;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(easeOutCubic(t) * SCORE));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPulsed(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // ── Stagger affiliation bars ────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    AFFILIATES.forEach((_, i) =>
      setTimeout(
        () =>
          setBarsVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          }),
        420 + i * 220,
      ),
    );
  }, [visible]);

  const ringOffset = visible ? RING_CIRC * (1 - SCORE / 100) : RING_CIRC;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INJECTED_CSS }} />

      <section
        ref={sectionRef}
        className="relative overflow-hidden border-t border-border/50 py-28"
      >
        {/* Background atmosphere */}
        <div className="absolute inset-0 bg-dot-grid opacity-[0.14]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_70%,hsl(var(--primary)/0.07),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-accent/5 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"
        />

        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          {/* ── Section header ── */}
          <div
            className="mb-14 text-center"
            style={visAnim(visible, "pv-fade-up", 0)}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "pv-pulse 2s ease-in-out infinite" }}
              />
              Aperçu
            </span>

            <h2 className="mx-auto mt-4 max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Ton dashboard en{" "}
              <span className="bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent">
                un coup d'œil
              </span>
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-base text-muted-foreground">
              Voici ce que StreamPulse génère après avoir analysé ta chaîne.
            </p>
          </div>

          {/* ── Bento grid ── */}
          <div className="grid auto-rows-auto grid-cols-1 gap-3 sm:grid-cols-3">
            {/* StreamScore — col 1, spans rows 1-2 */}
            <ScoreCell
              display={display}
              ringOffset={ringOffset}
              pulsed={pulsed}
              visible={visible}
            />

            {/* Competitor 1 — col 2, row 1 */}
            <CompetitorCell
              {...COMPETITORS[0]}
              visible={visible}
              delay={160}
              gridClass="sm:col-start-2 sm:row-start-1"
            />

            {/* Best Time — col 3, row 1 */}
            <BestTimeCell visible={visible} delay={220} />

            {/* Competitor 2 — col 2, row 2 */}
            <CompetitorCell
              {...COMPETITORS[1]}
              visible={visible}
              delay={310}
              gridClass="sm:col-start-2 sm:row-start-2"
            />

            {/* Trend — col 3, row 2 */}
            <TrendCell visible={visible} delay={370} />

            {/* Affiliation — full width, row 3 */}
            <AffiliationCell barsVisible={barsVisible} visible={visible} />
          </div>
        </div>
      </section>
    </>
  );
}
