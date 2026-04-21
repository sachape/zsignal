import { TrendingUp, BarChart3, Target } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const PERSONAS = [
  {
    icon: TrendingUp,
    profile: "Débutant sérieux",
    description:
      "Tu streames depuis peu mais tu veux poser les bonnes bases dès le début, éviter les erreurs classiques et progresser plus vite.",
  },
  {
    icon: BarChart3,
    profile: "Streamer qui stagne",
    description:
      "Tu publies régulièrement mais ta croissance est à l'arrêt. Tu veux comprendre ce qui bloque et identifier les leviers concrets.",
    badge: "Le plus fréquent",
  },
  {
    icon: Target,
    profile: "Créateur structuré",
    description:
      "Tu veux suivre ta progression dans le temps, valider tes décisions par des données et construire une stratégie de contenu cohérente.",
  },
];

const PersonasSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);

  return (
    <SectionShell>
      <SectionHeading
        badge="Pour qui"
        title="Fait pour toi si…"
        subtitle="StreamPulse s'adapte à ton stade — du premier stream à la stratégie long terme."
      />

      <div ref={ref} className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
        {PERSONAS.map(({ icon: Icon, profile, description, badge }, i) => (
          <div
            key={profile}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <GlassCard hero={!!badge} className="h-full p-6 md:p-7">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {badge && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                    {badge}
                  </span>
                )}
              </div>
              <MicroLabel>Profil</MicroLabel>
              <h3 className="mt-1 text-lg font-semibold text-foreground md:text-xl">
                {profile}
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

export default PersonasSection;
