import { Clapperboard, Palette, Download, Subtitles, Smartphone, Wand2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionHeading, SectionShell } from "./primitives";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import clipShot from "@/assets/shot-clip-vertical.png";
import studioShot from "@/assets/shot-studio-visuel.png";

const clipTags = [
  { icon: Smartphone, label: "9:16" },
  { icon: Wand2, label: "Facecam" },
  { icon: Subtitles, label: "Sous-titres" },
  { icon: Download, label: "Téléchargement" },
];

const visualFormats = ["Bannière Twitch", "Story 9:16", "Post 1:1", "Cover YouTube", "Header X", "Offline screen"];

const WowFeaturesSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);

  return (
    <SectionShell id="features-wow" tone="light">
      <SectionHeading
        badgeTone="light"
        badge="Tes deux nouveaux super-pouvoirs"
        title="Crée tes clips et tes visuels en quelques secondes"
        subtitle="Streamnco transforme ton live en contenu prêt à publier — sans Premiere Pro, sans Photoshop, sans freelance."
      />

      <div
        ref={ref}
        className="mx-auto mt-10 grid max-w-6xl gap-6 md:mt-14 lg:grid-cols-2"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Clipping ─────────────────────────────────────────── */}
        <article className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(220_28%_10%/0.18)] transition-all hover:-translate-y-0.5 hover:border-primary/30">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-90" aria-hidden />

          <div className="relative p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Clapperboard className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Clipping</span>
            </div>

            <h3 className="relative mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
              Transforme tes clips Twitch en vidéos verticales prêtes à publier
            </h3>
            <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
              Colle un Clip Twitch, importe une VOD ou upload un fichier. Streamnco te rend une vidéo verticale avec facecam, gameplay et sous-titres — prête pour TikTok, Reels et Shorts.
            </p>

            {/* Vrai clip produit (capture réelle Streamnco) */}
            <div
              className="relative mt-6 overflow-hidden rounded-2xl border border-black/10 bg-[#0b0e12] shadow-[0_30px_70px_-30px_rgba(15,20,30,0.55)]"
              style={{ animation: "hero-float 7s ease-in-out infinite" }}
            >
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <img
                src={clipShot}
                alt="Un clip Twitch transformé en vidéo verticale 9:16 prête à publier dans Streamnco"
                className="block w-full"
                loading="lazy"
              />
            </div>

            <ul className="relative mt-6 flex flex-wrap gap-1.5">
              {clipTags.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground/85">
                  <Icon className="h-3 w-3 text-primary" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="relative mt-6">
              <Button asChild size="sm" variant="outline" className="group/btn">
                <Link to="/fonctionnalites#clips-reseaux">
                  Voir comment ça marche
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </article>

        {/* ── Studio visuel ─────────────────────────────────────────── */}
        <article className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(220_28%_10%/0.18)] transition-all hover:-translate-y-0.5 hover:border-primary/30">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-90" aria-hidden />

          <div className="relative p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Studio visuel</span>
            </div>

            <h3 className="relative mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
              Génère tes visuels Twitch et réseaux en quelques secondes
            </h3>
            <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
              8 formats prêts à l'emploi, 3 variantes par génération, exportés aux bonnes dimensions. Annonce un live, crée une bannière, prépare un post — sans toucher à un logiciel de design.
            </p>

            {/* Vraie bibliothèque de visuels (capture réelle Streamnco) */}
            <div
              className="relative mt-6 overflow-hidden rounded-2xl border border-black/10 bg-[#0b0e12] shadow-[0_30px_70px_-30px_rgba(15,20,30,0.55)]"
              style={{ animation: "hero-float 7s ease-in-out 0.6s infinite" }}
            >
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <img
                src={studioShot}
                alt="Bibliothèque de visuels générés par Streamnco : bannières, annonces de live et posts aux couleurs du streamer"
                className="block w-full"
                loading="lazy"
              />
            </div>

            <ul className="relative mt-5 flex flex-wrap gap-1.5">
              {visualFormats.map((format) => (
                <li
                  key={format}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground/85"
                >
                  <Sparkles className="h-3 w-3 text-primary/80" />
                  {format}
                </li>
              ))}
            </ul>

            <div className="relative mt-6">
              <Button asChild size="sm" variant="outline" className="group/btn">
                <Link to="/fonctionnalites#studio-visuel">
                  Voir les formats
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </article>
      </div>
    </SectionShell>
  );
};

export default WowFeaturesSection;
