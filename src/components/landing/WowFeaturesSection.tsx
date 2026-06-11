import { Clapperboard, Palette, Download, Subtitles, Smartphone, Wand2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionHeading, SectionShell } from "./primitives";
import { useInViewOnce } from "@/hooks/useInViewOnce";

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
        {/* ── Clips réseaux ─────────────────────────────────────────── */}
        <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/30">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-90" aria-hidden />

          <div className="relative p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Clapperboard className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Clips réseaux</span>
            </div>

            <h3 className="relative mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
              Transforme tes clips Twitch en vidéos verticales prêtes à publier
            </h3>
            <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
              Colle un Clip Twitch, importe une VOD ou upload un fichier. Streamnco te rend une vidéo verticale avec facecam, gameplay et sous-titres — prête pour TikTok, Reels et Shorts.
            </p>

            {/* Avant/après visuel */}
            <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* Avant : clip horizontal */}
              <div className="relative">
                <div className="absolute -top-2 left-2 z-10 rounded-full bg-muted/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">Avant</div>
                <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[hsl(264_40%_25%)] to-[hsl(220_30%_12%)]">
                  <div className="flex h-full items-end p-2">
                    <span className="text-[9px] font-semibold text-white/80">Clip Twitch 16:9</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
              {/* Après : clip vertical */}
              <div className="relative">
                <div className="absolute -top-2 left-2 z-10 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">Après</div>
                <div className="mx-auto aspect-[9/16] w-2/3 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-b from-[hsl(220_30%_12%)] to-[hsl(220_30%_8%)] shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.5)]">
                  <div className="relative h-full">
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-br from-[hsl(95_60%_35%)] to-[hsl(172_50%_30%)]" />
                    <div className="absolute inset-x-0 top-1/2 bottom-0 bg-gradient-to-br from-[hsl(264_60%_30%)] to-[hsl(220_30%_10%)]" />
                    <div className="absolute inset-x-1 bottom-3 rounded bg-black/70 px-1 py-0.5 text-center text-[7px] font-bold text-white">
                      QUEL CLUTCH
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ul className="relative mt-6 flex flex-wrap gap-1.5">
              {clipTags.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-background/50 px-2.5 py-1 text-[11px] text-foreground/85">
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
        <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/30">
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

            {/* 3 variantes mockup */}
            <div className="relative mt-6 grid grid-cols-3 gap-2.5">
              {[
                { grad: "from-[hsl(264_60%_45%)] to-[hsl(220_70%_30%)]", label: "Variante 1" },
                { grad: "from-[hsl(95_60%_45%)] to-[hsl(172_60%_30%)]", label: "Variante 2" },
                { grad: "from-[hsl(0_60%_50%)] to-[hsl(38_80%_45%)]", label: "Variante 3" },
              ].map((v, i) => (
                <div
                  key={i}
                  className={`group/v relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br ${v.grad} shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.4)] transition-transform hover:scale-[1.03]`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(0_0%_100%/0.25),transparent_60%)]" />
                  <div className="absolute left-1.5 top-1.5 rounded bg-black/40 px-1 py-0.5 text-[7px] font-bold uppercase text-white backdrop-blur-sm">
                    {v.label}
                  </div>
                  <div className="absolute inset-x-2 bottom-2 rounded bg-black/50 px-1 py-0.5 text-center text-[8px] font-bold text-white backdrop-blur-sm">
                    LIVE NOW
                  </div>
                </div>
              ))}
            </div>

            <ul className="relative mt-5 flex flex-wrap gap-1.5">
              {visualFormats.map((format) => (
                <li
                  key={format}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-background/50 px-2.5 py-1 text-[11px] text-foreground/85"
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
