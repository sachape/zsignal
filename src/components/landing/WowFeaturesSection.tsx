import { Clapperboard, Palette, Download, Subtitles, Smartphone, Wand2, Image as ImageIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionHeading, SectionShell } from "./primitives";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const clipFeatures = [
  { icon: Smartphone, label: "Format vertical 9:16" },
  { icon: Subtitles, label: "Sous-titres auto-générés" },
  { icon: Wand2, label: "Facecam + gameplay alignés" },
  { icon: Download, label: "Téléchargement direct" },
];

const visualFormats = ["Bannière Twitch", "Story 9:16", "Post 1:1", "Annonce de live", "Cover YouTube", "Header X", "Schedule", "Offline screen"];

const WowFeaturesSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);

  return (
    <SectionShell id="features-wow">
      <SectionHeading
        badge="Tes deux nouveaux super-pouvoirs"
        title="Crée tes clips et tes visuels en quelques secondes"
        subtitle="Streamnco transforme ton live en contenu prêt à publier — sans Premiere Pro, sans Photoshop, sans freelance."
      />

      <div
        ref={ref}
        className="mx-auto mt-10 grid max-w-6xl gap-5 md:mt-14 md:grid-cols-2"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Clips réseaux ─────────────────────────────────────────── */}
        <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/50 p-6 backdrop-blur-xl transition-all hover:border-primary/30 md:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl transition-opacity group-hover:opacity-80" aria-hidden />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Clips réseaux</span>
          </div>

          <h3 className="font-display relative mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            Transforme tes clips Twitch en vidéos verticales prêtes à publier
          </h3>
          <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
            Colle un Clip Twitch, importe une VOD ou upload un fichier. Streamnco te rend une vidéo verticale avec facecam, gameplay et sous-titres — prête pour TikTok, Reels et Shorts.
          </p>

          <ul className="relative mt-5 grid grid-cols-2 gap-2.5">
            {clipFeatures.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-background/40 px-3 py-2 text-xs text-foreground/85">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </li>
            ))}
          </ul>

          <div className="relative mt-6">
            <Button asChild size="sm" variant="outline" className="group/btn">
              <Link to="/features#clips-reseaux">
                Voir comment ça marche
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </article>

        {/* ── Studio visuel ─────────────────────────────────────────── */}
        <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/50 p-6 backdrop-blur-xl transition-all hover:border-primary/30 md:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl transition-opacity group-hover:opacity-80" aria-hidden />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Studio visuel</span>
          </div>

          <h3 className="font-display relative mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            Génère tes visuels Twitch et réseaux sociaux en quelques secondes
          </h3>
          <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
            8 formats prêts à l'emploi, 3 variantes par génération, exportés aux bonnes dimensions. Annonce un live, crée une bannière, prépare un post — sans toucher à un logiciel de design.
          </p>

          <div className="relative mt-5 flex flex-wrap gap-1.5">
            {visualFormats.map((format) => (
              <span
                key={format}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-background/40 px-2.5 py-1 text-[11px] text-foreground/80"
              >
                <ImageIcon className="h-3 w-3 text-primary/70" />
                {format}
              </span>
            ))}
          </div>

          <div className="relative mt-6">
            <Button asChild size="sm" variant="outline" className="group/btn">
              <Link to="/features#studio-visuel">
                Voir les formats
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </SectionShell>
  );
};

export default WowFeaturesSection;
