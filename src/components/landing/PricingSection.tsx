import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const PLANS = [
  {
    name: "Aperçu",
    price: "0€",
    cadence: "pour toujours",
    description: "Tout ce qu'il faut pour comprendre où tu en es.",
    features: [
      "1 analyse complète par chaîne",
      "StreamScore et breakdown",
      "3 concurrents pertinents",
      "Suivi de l'affiliation",
    ],
    cta: "Analyser ma chaîne",
    recommended: false,
  },
  {
    name: "Pro",
    price: "9€",
    cadence: "par mois",
    description: "Pour piloter sérieusement ta croissance, semaine après semaine.",
    features: [
      "Analyses illimitées + historique",
      "Plan d'action hebdomadaire",
      "Comparaison avancée de chaînes",
      "Détection des meilleurs créneaux",
      "Suggestions de contenu personnalisées",
      "Accès prioritaire aux nouveautés",
    ],
    cta: "Démarrer l'essai",
    recommended: true,
  },
];

const PricingSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);
  const navigate = useNavigate();

  return (
    <SectionShell id="pricing">
      <SectionHeading
        badge="Tarifs"
        title="Simple, transparent, sans surprise"
        subtitle="Commence gratuitement. Passe Pro quand tu veux suivre ta progression dans la durée."
      />

      <div
        ref={ref}
        className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2"
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
            <GlassCard hero={plan.recommended} className="h-full p-6 md:p-8">
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
                <span className="text-sm text-muted-foreground">{plan.cadence}</span>
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

              <Button
                size="lg"
                variant={plan.recommended ? "default" : "outline"}
                className="mt-7 w-full"
                onClick={() => navigate("/")}
              >
                {plan.cta}
              </Button>
            </GlassCard>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Aucun engagement · résiliable en un clic
      </p>
    </SectionShell>
  );
};

export default PricingSection;
