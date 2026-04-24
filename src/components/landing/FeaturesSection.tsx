import {
  Gauge,
  AlertTriangle,
  Users,
  CalendarCheck,
  Sparkles,
  History,
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
    label: "Diagnostic instantané",
    title: "Vois immédiatement où ta chaîne en est",
    description:
      "Un score lisible et une lecture humaine de tes signaux : qualité, régularité, engagement, croissance.",
    hero: true,
    span: "md:col-span-3",
  },
  {
    icon: AlertTriangle,
    label: "Lecture du blocage",
    title: "Identifie ce qui freine vraiment ta croissance",
    description:
      "StreamPulse pointe le facteur n°1 qui pèse sur ta progression, sans se cacher derrière les chiffres.",
    span: "md:col-span-3",
  },
  {
    icon: Users,
    label: "Comparaison utile",
    title: "Compare-toi à des chaînes pertinentes",
    description:
      "Pas n'importe qui : des streamers de ta taille et de ton univers, pour voir ce qui marche autour de toi.",
    span: "md:col-span-2",
  },
  {
    icon: CalendarCheck,
    label: "Planning",
    title: "Choisis tes créneaux qui rapportent",
    description:
      "Repère les jours et horaires où ton audience est vraiment au rendez-vous.",
    span: "md:col-span-2",
  },
  {
    icon: Sparkles,
    label: "Plan d'action",
    title: "Trouve quoi tester au prochain stream",
    description:
      "Des idées concrètes, ordonnées par impact, prêtes à appliquer cette semaine.",
    span: "md:col-span-2",
  },
  {
    icon: History,
    label: "Suivi continu",
    title: "Suis ta progression dans le temps",
    description:
      "Compare tes analyses pour voir si tes décisions paient — ou s'il faut corriger le tir.",
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
        badge="Fonctionnalités"
        title="Du signal au geste, sans détour"
        subtitle="Chaque brique du produit répond à une question concrète : où j'en suis, ce qui bloque, et quoi faire ensuite."
      />

      <div
        ref={ref}
        className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-6"
      >
        {FEATURES.map((feat, i) => {
          const { icon: Icon } = feat;
          // Last row uses 3+3 to fill nicely
          const className = i === FEATURES.length - 1 ? "md:col-span-3" : feat.span;
          return (
            <div key={feat.title} style={stagger(i)} className={className}>
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
