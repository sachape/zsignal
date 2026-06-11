import { Activity, Clapperboard, Palette, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionShell } from "./primitives";

const OPTIONS = [
  {
    id: "manual",
    icon: Clapperboard,
    name: "Montage manuel",
    price: "Long",
    description:
      "Tu peux tout faire à la main : découper, recadrer, sous-titrer, exporter, ranger, puis recommencer au prochain live.",
    verdict: "Beaucoup de friction",
    muted: true,
  },
  {
    id: "templates",
    icon: Palette,
    name: "Templates isolés",
    price: "Dispersé",
    description:
      "Un outil pour les visuels, un autre pour les clips, un tableur pour les idées, puis des stats Twitch à interpréter ailleurs.",
    verdict: "Peu de continuité",
    muted: true,
  },
  {
    id: "streamnco",
    icon: Sparkles,
    name: "Streamnco",
    price: "Centralisé",
    description:
      "Un cockpit pour préparer tes clips, tes visuels, ta file de contenu et tes décisions Twitch dans le même environnement.",
    verdict: "Création + progression",
    muted: false,
  },
] as const;

const ValueAnchorSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const { openAuthModal } = useAuthModal();

  return (
    <SectionShell id="value-anchor" glow={false}>
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Positionnement
        </span>

        <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Le problème n'est pas de créer un clip.
          <br className="hidden sm:block" />
          <span className="text-primary"> C'est de construire un système.</span>
        </h2>

        <p className="mt-4 text-base leading-relaxed text-foreground/70 md:text-lg">
          Streamnco rassemble les gestes qui entourent ton stream : transformer les moments forts, produire des visuels, retrouver tes brouillons et décider quoi améliorer ensuite.
        </p>
      </div>

      <div ref={ref} className="mx-auto mt-10 grid max-w-5xl gap-4 md:mt-14 md:grid-cols-3">
        {OPTIONS.map((opt, i) => (
          <div
            key={opt.id}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 110}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 110}ms`,
            }}
          >
            <GlassCard
              hero={!opt.muted}
              className={`flex h-full flex-col p-6 md:p-7 ${opt.muted ? "opacity-80" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  <opt.icon className={opt.muted ? "h-5 w-5 text-muted-foreground" : "h-5 w-5 text-primary"} />
                </div>
                {!opt.muted && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                    Recommandé
                  </span>
                )}
              </div>

              <MicroLabel>Option</MicroLabel>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{opt.name}</h3>
              <p className={opt.muted ? "mt-3 text-3xl font-bold text-foreground/70" : "mt-3 text-3xl font-bold text-foreground"}>
                {opt.price}
              </p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {opt.description}
              </p>
              <span
                className={
                  opt.muted
                    ? "mt-5 inline-block rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                    : "mt-5 inline-block rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary"
                }
              >
                {opt.verdict}
              </span>
            </GlassCard>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-2xl text-center md:mt-16">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          D'abord un workflow fiable. Ensuite, des connexions plus profondes.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          C'est volontaire : les intégrations TikTok, Instagram et YouTube ne doivent pas être vendues comme stables tant qu'elles ne le sont pas. Le produit assume le téléchargement et la préparation manuelle.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => openAuthModal("signup")}>
            Essayer gratuitement
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/fonctionnalites">Explorer les fonctionnalités</Link>
          </Button>
        </div>
      </div>
    </SectionShell>
  );
};

export default ValueAnchorSection;
