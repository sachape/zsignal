import { Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { GlassCard, MicroLabel, SectionShell } from "./primitives";

const PRO_MONTHLY = 7.99;
const PRO_FUTURE = 12.99;
const FOUNDING_SPOTS = 150;

const OPTIONS = [
  {
    id: "coaching",
    name: "Coaching individuel",
    price: "~35 €",
    cadence: "/ heure",
    note: "Minimum 1h · tarif marché",
    description:
      "Utile pour débloquer un problème précis. Mais entre les sessions, personne n'analyse tes lives, ne compare tes stats ni ne te dit ce qui a changé cette semaine.",
    highlight: false,
    verdict: "Ponctuel. Pas systématique.",
    verdictBg: "bg-muted",
    verdictText: "text-muted-foreground",
  },
  {
    id: "formation",
    name: "Formation en ligne",
    price: "1 000 €+",
    cadence: "",
    note: "Paiement unique",
    description:
      "Tu apprends les bases une fois. Mais ta chaîne évolue chaque semaine — la formation, elle, ne s'adapte pas à ton dernier live ni à tes concurrents actuels.",
    highlight: false,
    verdict: "Figé. Pas personnalisé.",
    verdictBg: "bg-muted",
    verdictText: "text-muted-foreground",
  },
  {
    id: "streamnco",
    name: "Streamnco Pro",
    price: `${PRO_MONTHLY.toFixed(2).replace(".", ",")} €`,
    cadence: "/ mois",
    note: `Offre fondateur · ${FOUNDING_SPOTS} places`,
    futurePrice: `${PRO_FUTURE.toFixed(2).replace(".", ",")} €`,
    description:
      "StreamScore après chaque live. Blocage #1 identifié avec précision. Benchmark de tes concurrents. Plan d'action hebdo personnalisé. Automatiquement — pendant que tu te couches.",
    highlight: true,
    verdict: "Continu. Personnalisé. Automatique.",
    verdictBg: "bg-primary",
    verdictText: "text-primary-foreground",
  },
] as const;

const ValueAnchorSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  const handleCta = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('input[type="text"], input[type="search"]')
        ?.focus();
    }, 600);
  };

  return (
    <SectionShell id="value-anchor" className="bg-muted/40">
      {/* Heading */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-background">
          Vs. les alternatives
        </span>

        <h2 className="mt-5 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          Un coach coûte 35 €/heure.
          <br />
          <span className="text-primary">Streamnco, c'est {PRO_MONTHLY.toFixed(2).replace(".", ",")} €/mois.</span>
        </h2>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Un humain ne peut pas scruter ton stream chaque semaine, comparer tes stats
          avec tes concurrents directs, et te rédiger un plan d'action personnalisé.{" "}
          <strong className="font-semibold text-foreground">Streamnco, si.</strong>
        </p>
      </div>

      {/* Cards */}
      <div
        ref={ref}
        className="mx-auto mt-10 grid max-w-5xl gap-5 md:mt-14 md:grid-cols-3"
      >
        {OPTIONS.map((opt, i) => (
          <div
            key={opt.id}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <GlassCard
              hero={opt.highlight}
              className={`flex h-full flex-col p-6 md:p-7 ${!opt.highlight ? "opacity-80" : ""}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <MicroLabel>Option</MicroLabel>
                  <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                    {opt.name}
                  </h3>
                </div>
                {opt.highlight && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                      <Sparkles className="h-2.5 w-2.5" />
                      Recommandé
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                      <Clock className="h-2.5 w-2.5" />
                      Fondateur
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="mt-5">
                {"futurePrice" in opt && opt.futurePrice && (
                  <p className="mb-1 text-xs text-muted-foreground line-through">
                    {opt.futurePrice}/mois après le lancement
                  </p>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tabular-nums text-foreground">
                    {opt.price}
                  </span>
                  {opt.cadence && (
                    <span className="text-sm text-muted-foreground">{opt.cadence}</span>
                  )}
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  {opt.note}
                </p>
              </div>

              {/* Description */}
              <p className="mt-5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {opt.description}
              </p>

              {/* Verdict */}
              <div className="mt-5">
                <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold ${opt.verdictBg} ${opt.verdictText}`}>
                  {opt.verdict}
                </span>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>

      {/* Bottom hook */}
      <div className="mx-auto mt-12 max-w-2xl text-center md:mt-16">
        <p className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Moins cher qu'un skin Epic.
          <br />
          <span className="text-primary">Plus efficace qu'un coach.</span>
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Pour le prix d'un skin Epic par mois — un système qui analyse,
          compare et te dit exactement quoi corriger. Chaque semaine.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button size="lg" onClick={handleCta} className="font-bold">
            Voir mon diagnostic gratuit
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Gratuit et immédiat · Pro à{" "}
            <span className="font-bold text-foreground">{PRO_MONTHLY.toFixed(2).replace(".", ",")} €/mois</span>{" "}
            · Prix locké à vie pour les fondateurs.
          </p>
        </div>
      </div>
    </SectionShell>
  );
};

export default ValueAnchorSection;
