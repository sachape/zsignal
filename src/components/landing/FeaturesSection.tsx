import {
  Gauge,
  AlertTriangle,
  Target,
  Sparkles,
  Users,
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
    icon: Gauge,
    label: "Lecture du niveau",
    title: "Vois immédiatement où ta chaîne en est",
    description:
      "Un score lisible, interprété humainement, pour comprendre si ta chaîne progresse, stagne ou reste trop fragile.",
    hero: true,
    span: "md:col-span-3",
  },
  {
    icon: AlertTriangle,
    label: "Diagnostic",
    title: "Identifie ce qui te freine vraiment",
    description:
      "StreamPulse fait remonter le blocage principal de ta chaîne pour éviter de corriger le mauvais problème.",
    hero: true,
    span: "md:col-span-3",
  },
  {
    icon: Target,
    label: "Objectif",
    title: "Suis ta progression vers l'affiliation",
    description:
      "Viewers, jours de stream, chatteurs uniques : vois précisément ce qu'il te manque et à quel rythme tu avances.",
    span: "md:col-span-2",
  },
  {
    icon: Sparkles,
    label: "Action",
    title: "Décide quoi tester au prochain stream",
    description:
      "Repars avec une action prioritaire claire au lieu de te perdre dans des statistiques brutes.",
    span: "md:col-span-2",
  },
  {
    icon: Users,
    label: "Comparaison",
    title: "Compare-toi à des chaînes vraiment pertinentes",
    description:
      "Pas un benchmark flou contre tout Twitch : des comparaisons utiles pour comprendre ce qui marche à ton niveau.",
    span: "md:col-span-2",
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
        badge="Bénéfices"
        title="Ce que StreamPulse change concrètement pour toi"
        subtitle="Pas une liste de features. Des réponses claires aux questions que tu te poses après chaque stream."
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
