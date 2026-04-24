import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, SectionHeading, SectionShell } from "./primitives";

const NOTES = [
  {
    quote:
      "J'ai enfin compris ce qui freinait mes lives. Je tournais autour du problème depuis des mois.",
    name: "Léa M.",
    context: "Streameuse variety, ~15 viewers moy.",
  },
  {
    quote:
      "Le plus utile, c'est de voir quoi corriger en premier. Je perds moins de temps à tester au hasard.",
    name: "Maxime D.",
    context: "Stream FPS, vise l'affiliation",
  },
];

const SocialProofSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <SectionShell>
      <SectionHeading
        badge="Ce qu'en disent les streamers"
        title="Pas un dashboard de plus. Un vrai déclic."
        subtitle="Quelques retours de streamers qui ont utilisé StreamPulse pour comprendre ce qui bloquait leur chaîne."
      />

      <div ref={ref} className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
        {NOTES.map((t, i) => (
          <div
            key={t.name}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <GlassCard className="h-full p-6">
              <p className="text-sm leading-relaxed text-foreground/90">
                « {t.quote} »
              </p>
              <div className="mt-4 flex items-baseline gap-2 border-t border-white/[0.06] pt-3">
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <span className="text-[11px] text-muted-foreground">
                  — {t.context}
                </span>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default SocialProofSection;
