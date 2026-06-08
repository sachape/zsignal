import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Target,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const FINAL_SCORE = 62;

const PROGRESS_ITEMS = [
  { label: "Viewers moyens", value: "2.8 / 3", pct: 93 },
  { label: "Jours de stream", value: "6 / 7", pct: 86 },
  { label: "Chatteurs uniques", value: "42 / 50", pct: 84 },
];

const useCountUp = (target: number, active: boolean, duration = 1600) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
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
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.5)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="10" />
        <circle cx="100" cy="100" r={radius} fill="none" stroke="url(#scoreGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - progress} style={{ transition: "stroke-dashoffset 60ms linear" }} />
      </svg>
      <div className="flex flex-col items-center text-center">
        <span className="text-5xl font-bold tracking-tight text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
          {score}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const ProgressBar = ({ label, value, pct, active, delay }: { label: string; value: string; pct: number; active: boolean; delay: number }) => (
  <div>
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-foreground/70">{label}</span>
      <span className="font-semibold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
    <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70"
        style={{ width: active ? `${pct}%` : "0%", transition: `width 1100ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms` }}
      />
    </div>
  </div>
);

const Cell = ({ className = "", hero = false, children }: { className?: string; hero?: boolean; children: React.ReactNode }) => (
  <div className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-xl ${className}`}>
    {hero && <div className="bento-hero-border" aria-hidden />}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_55%)]" />
    <div className="relative flex h-full flex-col">{children}</div>
  </div>
);

const CellLabel = ({ icon: Icon, children, tone = "default" }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; tone?: "default" | "warning" | "primary" }) => {
  const toneClasses = tone === "warning" ? "bg-warning/15 text-warning" : tone === "primary" ? "bg-primary/15 text-primary" : "bg-muted/50 text-foreground/70";
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${toneClasses}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/60">{children}</span>
    </div>
  );
};

const DemoPreviewSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <section id="preview" className="relative overflow-hidden py-20 md:py-24 scroll-mt-24 md:scroll-mt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-30" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-background">
            <Sparkles className="h-3 w-3" />
            Aperçu du diagnostic
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Voilà ce que tu vois dès la première analyse
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground/90">
            En moins d'une minute, Streamnco te montre ton niveau, ce qui te
            freine et les prochaines actions à tester.
          </p>
        </div>

        {/* Fictional streamer header — contextualise le diagnostic */}
        <div
          className="mx-auto mt-10 flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-card/50 px-5 py-3.5 backdrop-blur-xl"
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 500ms ease-out",
          }}
          ref={ref}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              MG
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">MistralGaming</p>
              <p className="text-xs text-muted-foreground">Jeux de stratégie · 847 abonnés</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">Analysé le</p>
            <p className="text-xs font-semibold text-foreground">30 avr. 2026</p>
          </div>
        </div>

        {/* Diagnostic grid */}
        <div className="mx-auto mt-5 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-6">
          <Cell className="md:col-span-2 md:row-span-2">
            <CellLabel icon={Activity}>Score global</CellLabel>
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <ScoreRing active={inView} />
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">Bon rythme</p>
                <p className="mt-1 text-xs text-foreground/65">Base solide, marges de progression claires</p>
              </div>
            </div>
          </Cell>

          <Cell hero className="md:col-span-4 md:row-span-2">
            <CellLabel icon={AlertTriangle} tone="warning">Blocage principal</CellLabel>
            <div className="flex flex-1 flex-col justify-center">
              <p className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Régularité du planning trop instable
              </p>
              <p className="mt-3 max-w-md text-sm text-foreground/70">
                Tes créneaux changent trop souvent d'un jour à l'autre. C'est le
                facteur qui pèse le plus sur la rétention de tes viewers.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Détecté sur 30 derniers jours", "Impact estimé : -18% de rétention"].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[10.5px] font-medium text-warning">
                    <span className="h-1 w-1 rounded-full bg-warning" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Cell>

          <Cell className="md:col-span-3">
            <CellLabel icon={Target} tone="primary">Progression vers l'affiliation</CellLabel>
            <div className="flex flex-1 flex-col gap-3">
              {PROGRESS_ITEMS.map((item, i) => (
                <ProgressBar key={item.label} label={item.label} value={item.value} pct={item.pct} active={inView} delay={i * 180} />
              ))}
              <p className="mt-1 text-[11px] text-foreground/60">
                Objectif atteint dans <span className="font-semibold text-foreground">~9 jours</span> au rythme actuel
              </p>
            </div>
          </Cell>

          <Cell className="md:col-span-3">
            <CellLabel icon={Sparkles} tone="primary">Action prioritaire</CellLabel>
            <div className="flex flex-1 flex-col justify-between gap-4">
              <div>
                <p className="text-lg font-semibold leading-snug text-foreground">
                  Fixer 2 créneaux récurrents cette semaine
                </p>
                <p className="mt-2 text-xs text-foreground/65">
                  Un planning prévisible peut faire revenir +30% de tes viewers
                  réguliers sur le mois.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-[11px] text-foreground/75">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">1</span>
                <span>Étape 1 sur 3 du plan recommandé</span>
              </div>
            </div>
          </Cell>
        </div>

        <p className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 text-center text-sm text-muted-foreground/85">
          <ArrowRight className="h-3.5 w-3.5 text-primary/70" />
          Et ce n'est qu'un aperçu : la version complète ajoute l'historique, les
          concurrents comparables et le plan détaillé.
        </p>
      </div>

      <style>{`
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
            hsl(var(--primary) / 0.4) 90deg,
            transparent 180deg,
            transparent 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
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
