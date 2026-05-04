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
    note: "Coût moyen du marché",
    description:
      "Efficace ponctuellement, mais sans suivi entre les sessions. Le tarif monte vite si tu veux vraiment progresser semaine après semaine.",
    highlight: false,
  },
  {
    name: "Formation",
    price: "1 000 €+",
    cadence: "",
    note: "Investissement unique",
    description:
      "Apprend les bases du streaming. Ne suit pas ta chaîne en temps réel, ni ta progression live après live.",
    highlight: false,
  },
  {
    name: "Streamnco",
    price: "14,99 €",
    cadence: "/ mois",
    note: "Sans engagement",
    description:
      "Analyse chaque live. Identifie ton blocage #1. Te donne un plan d'action chaque semaine. Automatiquement.",
    highlight: true,
  },
];

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
    <SectionShell id="value-anchor">
      <SectionHeading
        badge="Vs. les alternatives"
        title={
          <>
            Un coach coûte 35 € de l'heure.
            <br className="hidden sm:block" /> Streamnco, c'est 14,99 € par mois.
          </>
        }
        subtitle="Les deux peuvent t'aider à progresser. Mais au départ, tu as besoin de comprendre ce qui bloque ta chaîne — et Streamnco le fait automatiquement, après chaque live."
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
                opt.highlight ? "" : "opacity-80"
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
                    Recommandé
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span
                  className={`text-3xl font-bold tracking-tight tabular-nums md:text-4xl ${
                    opt.highlight ? "text-foreground" : "text-foreground/70"
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
          Pour moins d'un euro par jour, un copilote actif sur chaque live.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button size="lg" onClick={handleCta}>
            Voir mon diagnostic gratuit
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Comprends d'abord ce qui bloque ta chaîne — c'est gratuit.
          </p>
        </div>
      </div>
    </SectionShell>
  );
};

export default ValueAnchorSection;
