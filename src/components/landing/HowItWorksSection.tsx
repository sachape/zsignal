import { useInViewOnce } from "@/hooks/useInViewOnce";
import { SectionHeading, SectionShell } from "./primitives";

const STEPS = [
  {
    num: "01",
    title: "Press Start",
    description: "Entre ton pseudo Twitch. Pas de compte, pas de connexion, pas d'attente. Le diagnostic démarre instantanément.",
    color: "hsl(var(--primary))",
    illus: "/illustrations/clutch-time.png",
    tag: "Gratuit · 0 friction",
  },
  {
    num: "02",
    title: "L'IA scanne ta chaîne",
    description: "Streamnco analyse 6 dimensions : régularité, clips, catégorie, momentum, structure de tes lives et progression vers l'objectif.",
    color: "hsl(var(--brand-purple, 258 47% 48%))",
    illus: "/illustrations/midnight-quest.png",
    tag: "< 60 secondes",
  },
  {
    num: "03",
    title: "Tu repars avec un plan",
    description: "Score, blocage #1 identifié, levier à actionner cette semaine. Plus clair qu'un coach, plus rapide qu'une formation.",
    color: "hsl(25 88% 55%)",
    illus: "/illustrations/victory-ritual.png",
    tag: "Plan d'action concret",
  },
];

const HowItWorksSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);

  return (
    <SectionShell id="how-it-works" className="bg-muted/40">
      <SectionHeading
        badge="Comment ça marche"
        title="3 étapes. GG."
        subtitle="Entre ton pseudo. L'IA fait le reste. Tu repars avec un plan d'action concret — pas une liste de conseils génériques."
      />

      <div ref={ref} className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
        {STEPS.map(({ num, title, description, color, illus, tag }, i) => (
          <div
            key={num}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 130}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 130}ms`,
            }}
          >
            <div
              className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-foreground/75 bg-card"
              style={{ boxShadow: `4px 4px 0 0 ${color}` }}
            >
              {/* Illustration fills the top */}
              <div className="h-52 overflow-hidden">
                <img
                  src={illus}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-full w-full object-cover object-center"
                />
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-6">
                {/* Step number */}
                <div
                  className="mb-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground/75 font-display text-lg font-bold text-foreground"
                  style={{ boxShadow: `2px 2px 0 0 ${color}` }}
                >
                  {num}
                </div>

                <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>

                <div className="mt-5">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                    style={{ backgroundColor: color }}
                  >
                    {tag}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default HowItWorksSection;
