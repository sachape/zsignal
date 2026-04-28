import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const OPTIONS = [
  {
    name: "Coaching",
    price: "~35 €",
    cadence: "/ heure",
    note: "Estimation moyenne du marché",
    description:
      "Utile pour aller plus loin, mais vite coûteux si tu veux un suivi régulier.",
    highlight: false,
  },
  {
    name: "Formation",
    price: "1 000 €+",
    cadence: "",
    note: "Investissement ponctuel",
    description:
      "Bonne pour apprendre des bases, mais rarement pensée pour ta chaîne en évolution live après live.",
    highlight: false,
  },
  {
    name: "StreamPulse",
    price: "11,99 €",
    cadence: "/ mois",
    note: "Sans engagement",
    description:
      "Analyse ta chaîne, suit ta progression et te dit quoi travailler après chaque live.",
    highlight: true,
  },
];

const ValueAnchorSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  const handleCta = () => {
    const hero = document.querySelector<HTMLElement>("section");
    hero?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="text"], input[type="search"]',
      );
      input?.focus();
    }, 600);
  };

  return (
    <SectionShell id="value-anchor">
      <SectionHeading
        badge="Point de départ"
        title="Avant de payer un coach, sache déjà quoi améliorer."
        subtitle="Un coach peut aider. Une formation aussi. Mais au départ, ton vrai besoin est de comprendre ce qui bloque ta chaîne et quoi améliorer maintenant."
      />

      <div
        ref={ref}
        className="mx-auto mt-10 grid max-w-5xl gap-5 md:mt-14 md:grid-cols-3"
      >
        {OPTIONS.map((opt, i) => (
          <div
            key={opt.name}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
            }}
          >
            <GlassCard
              hero={opt.highlight}
              className={`flex h-full flex-col p-6 md:p-7 ${
                opt.highlight ? "" : "opacity-90"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <MicroLabel>Option</MicroLabel>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    {opt.name}
                  </h3>
                </div>
                {opt.highlight && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                    Accessible
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span
                  className={`text-3xl font-bold tracking-tight tabular-nums md:text-4xl ${
                    opt.highlight ? "text-foreground" : "text-foreground/80"
                  }`}
                >
                  {opt.price}
                </span>
                {opt.cadence && (
                  <span className="text-sm text-muted-foreground">
                    {opt.cadence}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
                {opt.note}
              </p>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {opt.description}
              </p>
            </GlassCard>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-3xl text-center md:mt-16">
        <p className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl md:text-4xl">
          Moins cher qu'une heure de coaching. Un copilote pour progresser chaque semaine.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button size="lg" onClick={handleCta}>
            Analyser ma chaîne
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Comprends d'abord ta chaîne avant d'investir plus loin.
          </p>
        </div>
      </div>
    </SectionShell>
  );
};

export default ValueAnchorSection;
