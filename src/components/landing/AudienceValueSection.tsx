import { Activity, Calendar, Target } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionHeading, SectionShell } from "./primitives";

const PILLARS = [
  {
    icon: Activity,
    label: "Diagnostic",
    title: "Un score, pas des stats.",
    description:
      "TwitchTracker te donne des chiffres. Streamnco te dit ce qu'ils signifient — et exactement ce que tu dois corriger en priorité.",
    stat: "6 dimensions analysées",
  },
  {
    icon: Target,
    label: "Précision",
    title: "Ton blocage exact, pas une liste.",
    description:
      "Pas 15 recommandations génériques. Un blocage principal identifié, avec le levier précis à actionner cette semaine.",
    stat: "1 priorité claire par analyse",
  },
  {
    icon: Calendar,
    label: "Progression",
    title: "Suivi semaine après semaine.",
    description:
      "Ton score évolue à chaque live. Tu vois ce qui progresse, ce qui stagne — et quand il faut changer d'approche.",
    stat: "Score recalculé après chaque stream",
  },
];

const AudienceValueSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <SectionShell id="features">
      <SectionHeading
        badge="Pourquoi Streamnco"
        title="Pas des stats. Une direction."
        subtitle="La différence entre savoir que quelque chose ne va pas — et savoir exactement quoi changer."
      />

      <div ref={ref} className="mx-auto mt-10 grid max-w-5xl gap-5 md:mt-14 md:grid-cols-3">
        {PILLARS.map(({ icon: Icon, label, title, description, stat }, i) => (
          <div
            key={label}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <GlassCard interactive className="flex h-full flex-col p-6 md:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>{label}</MicroLabel>
              <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">
                {title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <span className="text-[11px] font-semibold text-primary/80">{stat}</span>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default AudienceValueSection;
