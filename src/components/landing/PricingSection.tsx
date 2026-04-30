import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const PLANS = [
  {
    name: "Aperçu gratuit",
    price: "0€",
    cadence: "",
    description: "Pour voir rapidement où ta chaîne en est.",
    features: [
      "1 diagnostic instantané",
      "Score global + blocage principal",
      "Progression vers l'objectif",
      "Action prioritaire",
      "Sans connexion Twitch pour commencer",
    ],
    cta: "Obtenir mon aperçu gratuit",
    recommended: false,
    note: null,
  },
  {
    name: "Suivi complet",
    price: "11,99 €",
    cadence: "/ mois",
    description:
      "Pour suivre ta progression, retrouver ton historique et aller plus loin après le premier diagnostic.",
    features: [
      "Analyses illimitées",
      "Historique des lives et progression",
      "Suivi complet des objectifs",
      "Plan d'action enrichi",
      "Comparaisons plus avancées",
    ],
    cta: "Débloquer le suivi complet",
    recommended: true,
    note: "Sans engagement · annulable à tout moment",
  },
];

const PricingSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);
  const { openAuthModal } = useAuthModal();

  const handlePlanClick = (recommended: boolean) => {
    if (recommended) {
      openAuthModal({ redirectTo: "/dashboard" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('input[type="text"], input[type="search"]')
        ?.focus();
    }, 600);
  };

  return (
    <SectionShell id="pricing">
      <SectionHeading
        badge="Tarifs"
        title="Commence gratuitement, passe au suivi quand tu veux"
        subtitle="L'aperçu te montre déjà l'essentiel. Le suivi complet sert à piloter ta progression dans la durée."
      />

      <div
        ref={ref}
        className="mx-auto mt-10 grid max-w-4xl gap-5 md:mt-14 md:grid-cols-2"
      >
        {PLANS.map((plan, i) => (
          <div
            key={plan.name}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 150}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 150}ms`,
            }}
          >
            <GlassCard hero={plan.recommended} className="flex h-full flex-col p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <MicroLabel>Plan</MicroLabel>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">
                    {plan.name}
                  </h3>
                </div>
                {plan.recommended && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommandé
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums md:text-5xl">
                  {plan.price}
                </span>
                {plan.cadence && (
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <Button
                  size="lg"
                  variant={plan.recommended ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handlePlanClick(plan.recommended)}
                >
                  {plan.cta}
                </Button>
                {plan.note && (
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    {plan.note}
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Tu peux commencer par l'aperçu gratuit, sans carte bancaire.
      </p>
    </SectionShell>
  );
};

export default PricingSection;
