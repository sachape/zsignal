import { Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const STATS = [
  { value: 500, suffix: "+", label: "Streamers analysés" },
  { value: 4.8, suffix: "/5", label: "Note moyenne", decimals: 1 },
  { value: 60, suffix: "s", label: "Temps moyen d'analyse" },
  { value: 92, suffix: "%", label: "Recommanderaient l'outil" },
];

const TESTIMONIALS = [
  {
    quote:
      "J'ai compris en 2 minutes ce qui bloquait ma chaîne depuis des mois. Le score et les concurrents proposés étaient ultra pertinents.",
    name: "Léa M.",
    handle: "@leaplays_fr",
    size: "1.2K abonnés",
  },
  {
    quote:
      "Enfin un outil qui me dit quoi faire au lieu de me noyer sous les chiffres. Mon plan d'action est clair, je l'applique chaque semaine.",
    name: "Maxime D.",
    handle: "@maxstream",
    size: "850 abonnés",
  },
  {
    quote:
      "La comparaison avec d'autres streamers de ma taille m'a donné des idées concrètes que j'ai pu tester dès le stream suivant.",
    name: "Anaïs R.",
    handle: "@nayrocosplay",
    size: "3.4K abonnés",
  },
];

const useCountUp = (target: number, active: boolean, decimals = 0) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(eased * target);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);
  return decimals ? v.toFixed(decimals) : Math.round(v).toString();
};

const Stat = ({
  value,
  suffix,
  label,
  active,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  label: string;
  active: boolean;
  decimals?: number;
}) => {
  const display = useCountUp(value, active, decimals);
  return (
    <div className="text-center">
      <p className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tabular-nums text-transparent md:text-4xl">
        {display}
        <span className="text-primary">{suffix}</span>
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
};

const SocialProofSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <SectionShell>
      <SectionHeading
        badge="Ils nous font confiance"
        title="Des streamers, des vrais résultats"
        subtitle="Ce que disent ceux qui utilisent StreamPulse pour piloter leur croissance."
      />

      <div ref={ref} className="mx-auto mt-14 max-w-5xl space-y-10">
        {/* Stats */}
        <GlassCard className="p-6 md:p-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity 700ms ease-out ${i * 100}ms, transform 700ms ease-out ${i * 100}ms`,
                }}
              >
                <Stat
                  value={s.value}
                  suffix={s.suffix}
                  label={s.label}
                  active={inView}
                  decimals={s.decimals}
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Testimonials */}
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.handle}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms`,
              }}
            >
              <GlassCard className="h-full p-6">
                <Quote className="h-5 w-5 text-primary/50" />
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {t.quote}
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-semibold text-foreground">
                    {t.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {t.name}
                      <span className="ml-1.5 font-normal text-muted-foreground">{t.handle}</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                      {t.size}
                    </p>
                  </div>
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>
                <MicroLabel>Témoignage</MicroLabel>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};

export default SocialProofSection;
