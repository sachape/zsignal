import { Download, FileInput, FolderCheck, Wand2 } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionHeading, SectionShell } from "./primitives";

const STEPS = [
  {
    icon: FileInput,
    title: "Pars d'une source réelle",
    description:
      "Colle un Clip Twitch, une VOD, un pseudo Twitch ou importe une vidéo. Streamnco part de ce que tu as déjà.",
  },
  {
    icon: Wand2,
    title: "Compose un contenu propre",
    description:
      "Clip vertical avec facecam et sous-titres, visuel de live, bannière, story ou post carré : chaque format a son usage.",
  },
  {
    icon: FolderCheck,
    title: "Récupère et publie",
    description:
      "Tes clips et visuels arrivent prêts dans une file claire. Tu télécharges le bon fichier en un clic et tu publies où tu veux, quand tu veux.",
  },
] as const;

const HowItWorksSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <SectionShell id="how-it-works" glow={false}>
      <SectionHeading
        badge="Parcours"
        title="De ton live à du contenu prêt à poster."
        subtitle="Trois étapes simples, zéro logiciel pro : tes lives deviennent des clips et des visuels prêts à publier."
      />

      <div
        ref={ref}
        className="relative mx-auto mt-10 grid max-w-5xl gap-4 md:mt-14 md:grid-cols-3"
      >
        <div
          className="pointer-events-none absolute left-[16%] right-[16%] top-[54px] hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent md:block"
          aria-hidden
        />

        {STEPS.map(({ icon: Icon, title, description }, i) => (
          <div
            key={title}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <GlassCard className="relative h-full p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  <Icon className="h-5 w-5 text-primary-strong" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-background text-[10px] font-bold text-primary-strong">
                    {i + 1}
                  </span>
                </div>
                <MicroLabel>Étape {i + 1}</MicroLabel>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground md:text-lg">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </GlassCard>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Download className="h-4 w-4 text-primary-strong" />
        Des fichiers prêts à poster, optimisés pour chaque réseau — tu gardes le contrôle total sur ce qui sort.
      </p>
    </SectionShell>
  );
};

export default HowItWorksSection;
