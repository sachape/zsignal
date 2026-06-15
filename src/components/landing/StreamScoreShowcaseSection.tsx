import { Link } from "react-router-dom";
import { ArrowRight, Gauge, TrendingUp, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading, SectionShell } from "./primitives";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const DIMENSIONS = [
  { label: "Régularité", value: 78, color: "from-primary to-primary/40" },
  { label: "Clips & VOD", value: 64, color: "from-primary to-primary/40" },
  { label: "Catégorie", value: 52, color: "from-warning to-warning/40" },
  { label: "Momentum", value: 71, color: "from-primary to-primary/40" },
  { label: "Affiliation", value: 88, color: "from-success to-success/40" },
  { label: "Structure", value: 60, color: "from-primary to-primary/40" },
];

const StreamScoreShowcaseSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const score = 72;
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
        className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.15fr]"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Big score card ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-xl md:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" aria-hidden />

          <div className="relative flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">StreamScore</span>
          </div>

          <div className="relative mt-6 flex items-center gap-6">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                <defs>
                  <linearGradient id="bigScore" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.25" strokeWidth="10" />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="url(#bigScore)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tabular-nums text-foreground">{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <TrendingUp className="h-3 w-3" />
                +6 cette semaine
              </div>
              <h3 className="mt-3 text-xl font-semibold text-foreground">En progression</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tu es sur la bonne trajectoire. Continue à publier des clips après chaque live pour passer le palier des 80.
              </p>
            </div>
          </div>

          <div className="relative mt-6 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Recommandation prioritaire</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Stabilise 2 créneaux récurrents par semaine
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ta régularité est ton plus gros levier de croissance ce mois-ci. Un planning fixe peut faire gagner +15 points en 30 jours.
            </p>
          </div>
        </div>

        {/* ── Dimensions + benchmark ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-xl md:p-8">
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">6 dimensions analysées</span>
            </div>
          </div>

          <div className="relative mt-6 space-y-3.5">
            {DIMENSIONS.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground/90">{d.label}</span>
                  <span className="font-bold tabular-nums text-foreground">{d.value}<span className="text-muted-foreground">/100</span></span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/30">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${d.color}`}
                    style={{ width: inView ? `${d.value}%` : "0%", transition: "width 1200ms cubic-bezier(0.16,1,0.3,1)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mini benchmark */}
          <div className="relative mt-6 rounded-2xl border border-white/[0.08] bg-background/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Benchmark catégorie</span>
            <div className="mt-3 space-y-2">
              {[
                { label: "Toi", value: 72, highlight: true },
                { label: "Médiane catégorie", value: 58, highlight: false },
                { label: "Top 10%", value: 86, highlight: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={`w-32 text-xs ${row.highlight ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {row.label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={`h-full rounded-full ${row.highlight ? "bg-primary" : "bg-muted-foreground/40"}`}
                      style={{ width: inView ? `${row.value}%` : "0%", transition: "width 1200ms cubic-bezier(0.16,1,0.3,1) 200ms" }}
                    />
                  </div>
                  <span className={`w-8 text-right text-xs font-semibold tabular-nums ${row.highlight ? "text-primary" : "text-muted-foreground"}`}>
                    {row.value}
                  </span>
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
