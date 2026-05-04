import { useState } from "react";
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

const MONTHLY_PRICE = 14.99;
const ANNUAL_PRICE = 110;
const ANNUAL_MONTHLY_EQUIV = ANNUAL_PRICE / 12; // ≈ 9.17
const SAVINGS_PCT = Math.round((1 - ANNUAL_PRICE / (MONTHLY_PRICE * 12)) * 100); // 39

const FREE_FEATURES = [
  "Ton StreamScore calculé instantanément",
  "Le blocage #1 identifié avec précision",
  "Ta progression vers l'affiliation",
  "L'action prioritaire à exécuter cette semaine",
  "Zéro connexion Twitch requise",
];

const PAID_FEATURES = [
  "Analyses illimitées après chaque live",
  "Ton évolution sur 30, 60 et 90 jours",
  "Objectifs affiliation trackés automatiquement",
  "Plan d'action personnalisé chaque semaine",
  "Benchmark contre les chaînes similaires",
];

const PricingSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);
  const { openAuthModal } = useAuthModal();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const handleFreeCta = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('input[type="text"], input[type="search"]')
        ?.focus();
    }, 600);
  };

  const handlePaidCta = () => {
    openAuthModal({ redirectTo: "/dashboard" });
  };

  const paidPrice =
    billing === "annual"
      ? `${ANNUAL_MONTHLY_EQUIV.toFixed(2).replace(".", ",")} €`
      : `${MONTHLY_PRICE.toFixed(2).replace(".", ",")} €`;

  return (
    <SectionShell id="pricing">
      <SectionHeading
        badge="Tarifs"
        title="Commence gratuitement. Accélère quand tu es prêt."
        subtitle="Ton diagnostic est immédiat et gratuit. Passe au suivi complet pour piloter ta progression live après live."
      />

      {/* Billing toggle */}
      <div
        ref={ref}
        className="mt-10 flex flex-col items-center gap-8 md:mt-12"
      >
        <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-card/50 p-1 backdrop-blur-sm shadow-[0_2px_16px_hsl(var(--primary)/0.08)]">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              billing === "monthly"
                ? "bg-primary/12 border border-primary/25 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              billing === "annual"
                ? "bg-primary/12 border border-primary/25 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annuel
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors duration-200 ${
                billing === "annual"
                  ? "bg-primary text-background"
                  : "bg-primary/20 text-primary"
              }`}
            >
              -{SAVINGS_PCT}%
            </span>
          </button>
        </div>

        {/* Cards */}
        <div className="grid w-full max-w-4xl gap-5 md:grid-cols-2">
          {/* Free plan */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 0ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 0ms",
            }}
          >
            <GlassCard className="flex h-full flex-col p-6 md:p-8">
              <div>
                <MicroLabel>Départ</MicroLabel>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  Diagnostic gratuit
                </h3>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums md:text-5xl">
                  0 €
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Sache en 60 secondes ce qui freine ta chaîne — sans compte, sans carte bancaire.
              </p>

              <ul className="mt-6 space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <Button size="lg" variant="outline" className="w-full" onClick={handleFreeCta}>
                  Lancer mon diagnostic gratuit
                </Button>
              </div>
            </GlassCard>
          </div>

          {/* Paid plan */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 150ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 150ms",
            }}
          >
            <GlassCard hero className="flex h-full flex-col p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <MicroLabel>Croissance</MicroLabel>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">
                    Suivi complet
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                  Recommandé
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums md:text-5xl">
                    {paidPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mois</span>
                </div>
                {billing === "annual" && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Facturé{" "}
                    <span className="font-semibold text-foreground">{ANNUAL_PRICE} €</span>{" "}
                    en une fois · au lieu de{" "}
                    <span className="line-through">
                      {(MONTHLY_PRICE * 12).toFixed(2).replace(".", ",")} €
                    </span>
                  </p>
                )}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Pour les streamers qui progressent live après live, sans jamais avancer à l'aveugle.
              </p>

              <ul className="mt-6 space-y-2.5">
                {PAID_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <Button size="lg" className="w-full" onClick={handlePaidCta}>
                  Activer mon suivi complet
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Sans engagement · résiliable à tout moment
                </p>
              </div>
            </GlassCard>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Pas de carte bancaire pour le diagnostic gratuit.
        </p>
      </div>
    </SectionShell>
  );
};

export default PricingSection;
