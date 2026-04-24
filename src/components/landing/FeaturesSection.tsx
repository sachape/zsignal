import {
  History,
  Users,
  Map,
  Bell,
} from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const FEATURES = [
  {
    icon: History,
    label: "Historique",
    title: "Vois ta progression dans le temps",
    description:
      "Score, viewers, régularité, objectifs : tout est suivi semaine après semaine pour repérer ce qui marche vraiment.",
    hero: true,
    span: "md:col-span-3",
  },
  {
    icon: Users,
    label: "Concurrents",
    title: "Compare-toi à des chaînes vraiment pertinentes",
    description:
      "Pas un benchmark flou contre tout Twitch : des comparaisons utiles à ton niveau, ta langue, ton format.",
    hero: true,
    span: "md:col-span-3",
  },
  {
    icon: Map,
    label: "Plan détaillé",
    title: "Un plan d'action enrichi, pas une seule action",
    description:
      "Au-delà de la première action prioritaire, vois la séquence complète à exécuter pour passer le prochain cap.",
    span: "md:col-span-3",
  },
  {
    icon: Bell,
    label: "Suivi",
    title: "Sois alerté quand ton diagnostic évolue",
    description:
      "Score qui chute, blocage qui change, nouvel objectif débloqué : tu restes au courant sans avoir à relancer une analyse.",
    span: "md:col-span-3",
  },
];

const FeaturesSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  const stagger = (i: number) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
  });

  return (
    <SectionShell id="features">
      <SectionHeading
        badge="Au-delà du premier diagnostic"
        title="Ce que tu débloques avec le suivi complet"
        subtitle="Le diagnostic gratuit te montre où tu en es. Le suivi complet t'aide à progresser dans la durée."
      />

      <div
        ref={ref}
        className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-6"
      >
        {FEATURES.map((feat, i) => {
          const { icon: Icon } = feat;
          return (
            <div key={feat.title} style={stagger(i)} className={feat.span}>
              <GlassCard hero={feat.hero} className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <MicroLabel>{feat.label}</MicroLabel>
                    <h3 className="mt-1 text-base font-semibold leading-snug text-foreground md:text-lg">
                      {feat.title}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                  {feat.description}
                </p>
              </GlassCard>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
};

export default FeaturesSection;
