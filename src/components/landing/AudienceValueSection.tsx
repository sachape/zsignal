import { Activity, Clapperboard, Palette } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionHeading, SectionShell } from "./primitives";

const PILLARS = [
  {
    icon: Clapperboard,
    label: "Clipping",
    title: "Tes meilleurs moments deviennent des clips qui tournent.",
    description:
      "Clip Twitch, VOD ou upload → une vidéo verticale 9:16 avec facecam et sous-titres, prête à poster sur TikTok, Reels et Shorts.",
    stat: "Format 9:16 prêt à poster",
  },
  {
    icon: Palette,
    label: "Visuels",
    title: "Une image de chaîne pro, sans Photoshop.",
    description:
      "Bannières, miniatures, stories, posts d'annonce : génère des visuels aux bons formats Twitch et réseaux en quelques secondes.",
    stat: "8 formats · plusieurs variantes",
  },
  {
    icon: Activity,
    label: "Progression",
    title: "Vois exactement ce qui fait grandir ta chaîne.",
    description:
      "Un récap après chaque live, des stats claires et un StreamScore qui te dit quoi améliorer pour le prochain stream.",
    stat: "Récap live + StreamScore",
  },
] as const;

const AudienceValueSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <SectionShell id="features" glow={false}>
      <SectionHeading
        badge="Ce que tu obtiens"
        title="Trois façons de faire grandir ta chaîne."
        subtitle="Tes lives deviennent des clips, des visuels et une vision claire de ta progression. Le reste, Streamnco s'en occupe."
      />

      <div ref={ref} className="mx-auto mt-10 grid max-w-5xl gap-4 md:mt-14 md:grid-cols-3">
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
