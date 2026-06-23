import { Link } from "react-router-dom";
import { ArrowRight, Gauge, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading, SectionShell } from "./primitives";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import scoreAvatar from "@/assets/avatar-gamer-1.jpg";

// Faithful reproduction of the real StreamScore analysis surface.
// Aspirational sample data (it's a product preview, not a live account).
const KPIS = [
  { label: "Viewers moy.", value: "42", sub: "30 derniers jours" },
  { label: "Sessions", value: "12", sub: "lives sur 30j" },
  { label: "Followers", value: "1 240", sub: "total Twitch" },
];

const DIMENSIONS = [
  { label: "Régularité", value: 82 },
  { label: "Contenu", value: 74 },
  { label: "Catégorie", value: 58 },
  { label: "Momentum", value: 71 },
  { label: "Affiliation", value: 90 },
  { label: "Structure", value: 64 },
];

// Real product colour coding: strong = lime, moyen = amber, faible = red.
const barColor = (v: number) =>
  v >= 70 ? "bg-primary" : v >= 50 ? "bg-warning" : "bg-destructive";
const valColor = (v: number) =>
  v >= 70 ? "text-primary-strong" : v >= 50 ? "text-warning" : "text-destructive";

// Upward evolution sparkline (normalised 0–100 → SVG path).
const TREND = [40, 44, 42, 50, 58, 56, 63, 68, 72];
const sparkPath = (() => {
  const w = 280;
  const h = 56;
  const max = 100;
  return TREND.map((v, i) => {
    const x = (i / (TREND.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
})();

const StreamScoreShowcaseSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const score = 74;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <SectionShell id="streamscore-showcase" tone="deep">
      <SectionHeading
        badge="Progression · Après chaque live"
        title="Vois exactement comment tu progresses, live après live"
        subtitle="Un récap après chaque live, six dimensions de progression et une reco prioritaire : tu sais ce qui marche et quoi faire au prochain stream."
      />

      <div
        ref={ref}
        className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.1fr]"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Analysis summary (profile + KPIs + score) ─────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/60 p-6 backdrop-blur-xl md:p-8">
          {/* Profile header */}
          <div className="flex items-center gap-3">
            <img src={scoreAvatar} alt="" aria-hidden className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Ta chaîne</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-strong">
                  Régulier
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Résumé d'analyse</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary-strong">
              <TrendingUp className="h-3 w-3" /> +6 cette semaine
            </div>
          </div>

          {/* KPI tiles */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-xl border border-white/[0.06] bg-background/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{k.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Score ring */}
          <div className="mt-6 flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-background/30 p-5">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.25" strokeWidth="9" />
                <circle
                  cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={circumference}
                  style={{ strokeDashoffset: inView ? offset : circumference, transition: "stroke-dashoffset 1400ms cubic-bezier(0.16,1,0.3,1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums text-foreground">{score}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">StreamScore</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">En progression</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Tu es sur la bonne trajectoire. Continue à publier un clip après chaque live pour passer le palier des 80.
              </p>
            </div>
          </div>

          {/* Priority reco */}
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary-strong" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-strong">Action prioritaire</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">Stabilise 2 créneaux récurrents par semaine</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ta régularité est ton plus gros levier ce mois-ci : +15 points possibles en 30 jours.
            </p>
          </div>
        </div>

        {/* ── Evolution + dimensions ────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/60 p-6 backdrop-blur-xl md:p-8">
          {/* Evolution sparkline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary-strong" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-strong/80">Évolution du StreamScore</span>
            </div>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary-strong">90 jours</span>
          </div>
          <div className="relative mt-4 h-16 w-full">
            <svg viewBox="0 0 280 56" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${sparkPath} L280,56 L0,56 Z`} fill="url(#sparkFill)" />
              <path
                d={sparkPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: inView ? 0 : 1, transition: "stroke-dashoffset 1600ms ease-out" }}
              />
            </svg>
          </div>

          {/* Dimensions */}
          <div className="mt-6 space-y-3">
            {DIMENSIONS.map((d, i) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground/90">{d.label}</span>
                  <span className={`font-bold tabular-nums ${valColor(d.value)}`}>{d.value}<span className="text-muted-foreground">/100</span></span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/25">
                  <div
                    className={`h-full rounded-full ${barColor(d.value)}`}
                    style={{ width: inView ? `${d.value}%` : "0%", transition: `width 1100ms cubic-bezier(0.16,1,0.3,1) ${i * 90}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mini benchmark */}
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-background/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Benchmark catégorie</span>
            <div className="mt-3 space-y-2">
              {[
                { label: "Toi", value: 74, highlight: true },
                { label: "Médiane catégorie", value: 58, highlight: false },
                { label: "Top 10%", value: 88, highlight: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={`w-32 text-xs ${row.highlight ? "font-semibold text-primary-strong" : "text-muted-foreground"}`}>{row.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/25">
                    <div
                      className={`h-full rounded-full ${row.highlight ? "bg-primary" : "bg-muted-foreground/40"}`}
                      style={{ width: inView ? `${row.value}%` : "0%", transition: "width 1100ms cubic-bezier(0.16,1,0.3,1) 250ms" }}
                    />
                  </div>
                  <span className={`w-7 text-right text-xs font-semibold tabular-nums ${row.highlight ? "text-primary-strong" : "text-muted-foreground"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Button asChild variant="outline" size="lg">
          <Link to="/fonctionnalites#streamscore">
            Découvrir le StreamScore
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionShell>
  );
};

export default StreamScoreShowcaseSection;
