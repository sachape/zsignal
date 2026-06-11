import { Activity, Clapperboard, ListChecks, Palette } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionHeading, SectionShell } from "./primitives";

const PILLARS = [
  {
    icon: Clapperboard,
    label: "Créer",
    title: "Tes moments deviennent des assets propres.",
    description:
      "Clip Twitch, VOD ou upload : tu produis un vertical 9:16 avec facecam, gameplay, sous-titres et styles prêts à télécharger.",
    stat: "Clips réseaux",
  },
  {
    icon: Palette,
    label: "Habiller",
    title: "Ton image de chaîne reste cohérente.",
    description:
      "Le Studio visuel génère des formats Twitch et sociaux avec des dimensions propres, sans repartir d'une page blanche.",
    stat: "8 formats · 3 variantes",
  },
  {
    icon: Activity,
    label: "Comprendre",
    title: "Tes données deviennent des décisions.",
    description:
      "StreamScore, dimensions de progression, benchmark et historique t'aident à savoir quoi prioriser sans lire des dashboards bruts.",
    stat: "Analyse Twitch",
  },
  {
    icon: ListChecks,
    label: "Préparer",
    title: "Chaque contenu a une prochaine étape.",
    description:
      "File de contenu, brouillons, recommandations, titres et planning : tu avances avec un système, pas avec une liste perdue.",
    stat: "File de contenu",
  },
] as const;

const AudienceValueSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <SectionShell id="features" glow={false}>
      <SectionHeading
        badge="Pourquoi Streamnco"
        title="Un cockpit, pas une pile d'outils."
        subtitle="Tout ce qui entoure ton stream est relié : les clips, les visuels, l'organisation et les décisions de progression."
      />

      <div ref={ref} className="mx-auto mt-10 grid max-w-6xl gap-4 md:mt-14 md:grid-cols-4">
        {PILLARS.map(({ icon: Icon, label, title, description, stat }, i) => (
          <div
            key={label}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
            }}
          >
            <GlassCard interactive className="flex h-full flex-col p-5 md:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>{label}</MicroLabel>
              <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
                {title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <span className="text-[11px] font-semibold text-primary/[0.85]">{stat}</span>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default AudienceValueSection;
