import { Search, Activity, Map } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionHeading, SectionShell } from "./primitives";

const STEPS = [
  {
    icon: Search,
    title: "Entre ton pseudo Twitch",
    description: "Pas besoin de connecter ton compte pour commencer.",
  },
  {
    icon: Activity,
    title: "Streamnco analyse ta chaîne",
    description:
      "Score, blocage principal, progression vers l'objectif et premières recommandations.",
  },
  {
    icon: Map,
    title: "Tu repars avec un plan clair",
    description:
      "Vois ce qu'il faut corriger maintenant, puis débloque le suivi complet pour aller plus loin.",
  },
];

const HowItWorksSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <SectionShell id="how-it-works">
      <SectionHeading
        badge="Comment ça marche"
        title="Trois étapes, zéro friction"
        subtitle="Tu lances l'analyse, Streamnco lit les signaux utiles de ta chaîne et te montre où agir en priorité."
      />

      <div
        ref={ref}
        className="relative mx-auto mt-10 grid max-w-5xl gap-5 md:mt-14 md:grid-cols-3"
      >
        {/* Connecting line on desktop */}
        <div
          className="pointer-events-none absolute left-[16%] right-[16%] top-[58px] hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block"
          aria-hidden
        />

        {STEPS.map(({ icon: Icon, title, description }, i) => (
          <div
            key={title}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 140}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 140}ms`,
            }}
          >
            <GlassCard className="relative h-full p-6 md:p-7">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-background text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                </div>
                <MicroLabel>Étape {i + 1}</MicroLabel>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground md:text-lg">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </GlassCard>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default HowItWorksSection;
