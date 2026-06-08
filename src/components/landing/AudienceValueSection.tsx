import { useInViewOnce } from "@/hooks/useInViewOnce";
import { SectionHeading, SectionShell } from "./primitives";

const PILLARS = [
  {
    illus: "/illustrations/power-friends.png",
    label: "Viewers",
    title: "Plus de viewers à chaque stream.",
    description:
      "Streamnco identifie pourquoi tes viewers ne reviennent pas — mauvais créneau, mauvaise catégorie, mauvais titre. Et te dit quoi changer en premier.",
    stat: "+ viewers réguliers",
    color: "hsl(var(--primary))",
  },
  {
    illus: "/illustrations/combo-rush.png",
    label: "Abonnés",
    title: "Des abonnés qui arrivent naturellement.",
    description:
      "Un score élevé = une chaîne qui convainc. Streamnco te montre les signaux que les viewers scrutent avant de cliquer sur « Suivre » — et comment les optimiser.",
    stat: "+ followers chaque semaine",
    color: "hsl(var(--brand-purple, 258 47% 48%))",
  },
  {
    illus: "/illustrations/secret-level.png",
    label: "Blocages",
    title: "Tu sais enfin ce qui te freine.",
    description:
      "Fini de deviner. Streamnco analyse 6 dimensions, identifie ton blocage #1 avec précision et te donne le levier exact à actionner cette semaine.",
    stat: "1 priorité claire par analyse",
    color: "hsl(25 88% 55%)",
  },
];

const AudienceValueSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);

  return (
    <SectionShell id="features">
      <SectionHeading
        badge="Pourquoi Streamnco"
        title="Tes résultats. Pas tes stats."
        subtitle="TwitchTracker te donne des chiffres. Streamnco te dit ce qu'ils signifient — et exactement ce que tu dois corriger en priorité."
      />

      <div ref={ref} className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
        {PILLARS.map(({ illus, label, title, description, stat, color }, i) => (
          <div
            key={label}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <div
              className="flex h-full flex-col rounded-2xl border-2 border-foreground/75 bg-card p-6 transition-all duration-150 hover:-translate-x-px hover:-translate-y-px md:p-7"
              style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
            >
              {/* Illustration */}
              <div className="mb-5 flex h-24 items-center justify-center">
                <img
                  src={illus}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-24 w-24 object-contain"
                />
              </div>

              {/* Label chip */}
              <span
                className="mb-3 inline-block w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background"
                style={{ backgroundColor: color }}
              >
                {label}
              </span>

              <h3 className="font-display text-xl font-bold leading-snug text-foreground">
                {title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>

              <div className="mt-5 border-t border-foreground/10 pt-4">
                <span className="text-[11px] font-bold text-foreground/70">{stat}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default AudienceValueSection;
