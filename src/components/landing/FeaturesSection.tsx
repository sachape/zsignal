import {
  BarChart3,
  Users,
  CalendarCheck,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const SPARK = [8, 11, 9, 14, 12, 17, 16, 19, 22, 21, 25, 28];

const ScoreMini = ({ active }: { active: boolean }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (74 / 100) * c;
  return (
    <svg viewBox="0 0 50 50" className="h-14 w-14 -rotate-90">
      <defs>
        <linearGradient id="featScoreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.5)" />
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r={r} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.4" strokeWidth="3" />
      <circle
        cx="25"
        cy="25"
        r={r}
        fill="none"
        stroke="url(#featScoreGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={active ? offset : c}
        style={{ transition: "stroke-dashoffset 1500ms cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
};

const SparkLine = ({ active }: { active: boolean }) => {
  const w = 200;
  const h = 50;
  const max = Math.max(...SPARK);
  const min = Math.min(...SPARK);
  const range = max - min || 1;
  const step = w / (SPARK.length - 1);
  const points = SPARK.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="featSparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill="url(#featSparkArea)"
        style={{ opacity: active ? 1 : 0, transition: "opacity 800ms ease-out 400ms" }}
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 600,
          strokeDashoffset: active ? 0 : 600,
          transition: "stroke-dashoffset 1400ms ease-out 200ms",
        }}
      />
    </svg>
  );
};

const FeaturesSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  const stagger = (i: number) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
  });

  return (
    <SectionShell>
      <SectionHeading
        badge="Fonctionnalités"
        title="Ce que StreamPulse fait pour toi"
        subtitle="Chaque fonctionnalité s'appuie sur des données réelles de ta chaîne — pas de théorie, que de l'actionnable."
      />

      <div
        ref={ref}
        className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[180px]"
      >
        {/* StreamScore — large hero feature */}
        <div style={stagger(0)} className="md:col-span-3 md:row-span-2">
          <GlassCard hero className="h-full p-6 md:p-7">
            <MicroLabel>Score global</MicroLabel>
            <h3 className="mt-1 text-lg font-semibold text-foreground md:text-xl">
              StreamScore qui condense tout
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Qualité, régularité, engagement, croissance — un seul chiffre clair pour
              comprendre où tu en es vraiment.
            </p>
            <div className="mt-auto flex items-center justify-between pt-6">
              <ScoreMini active={inView} />
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-foreground">74</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">/ 100</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Tendance — mini sparkline feature */}
        <div style={stagger(1)} className="md:col-span-3">
          <GlassCard className="h-full p-6">
            <div className="flex items-start justify-between">
              <div>
                <MicroLabel>Tendance</MicroLabel>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  Détecte ce qui décolle
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3"><SparkLine active={inView} /></div>
          </GlassCard>
        </div>

        {/* Affiliation tracker */}
        <div style={stagger(2)} className="md:col-span-3">
          <GlassCard className="h-full p-6">
            <div className="flex items-start justify-between">
              <div>
                <MicroLabel>Objectifs</MicroLabel>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  Suivi de l'affiliation
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Vois exactement combien de jours, viewers et chatteurs il te reste avant de débloquer le statut.
            </p>
          </GlassCard>
        </div>

        {/* Comparaison */}
        <div style={stagger(3)} className="md:col-span-2 md:row-span-2">
          <GlassCard className="h-full p-6">
            <MicroLabel>Concurrents</MicroLabel>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Comparaison de chaînes
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Identifie les streamers les plus pertinents dans ta niche et comprends ce qu'ils font différemment.
            </p>
            <div className="mt-auto flex items-center justify-center pt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Best schedule */}
        <div style={stagger(4)} className="md:col-span-2">
          <GlassCard className="h-full p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <MicroLabel>Planning</MicroLabel>
                <h3 className="mt-0.5 text-base font-semibold text-foreground">
                  Meilleurs créneaux
                </h3>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Stratégie */}
        <div style={stagger(5)} className="md:col-span-2">
          <GlassCard className="h-full p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <MicroLabel>Stratégie</MicroLabel>
                <h3 className="mt-0.5 text-base font-semibold text-foreground">
                  Suggestions de contenu
                </h3>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Vitesse */}
        <div style={stagger(6)} className="md:col-span-2">
          <GlassCard className="h-full p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <MicroLabel>Vitesse</MicroLabel>
                <h3 className="mt-0.5 text-base font-semibold text-foreground">
                  Résultat en 60 sec
                </h3>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </SectionShell>
  );
};

export default FeaturesSection;
