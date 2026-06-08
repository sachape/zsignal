import { useState } from "react";
import { Check, Sparkles, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { startCheckout, type PlanName, type BillingCycle } from "@/services/billingService";
import { toast } from "sonner";
import { SectionHeading, SectionShell } from "./primitives";

const FOUNDING_MEMBER = true;
const FOUNDING_SPOTS = 150;

const PRO_MONTHLY = 7.99;
const PRO_ANNUAL = 59;
const PRO_ANNUAL_MONTHLY = PRO_ANNUAL / 12;
const PRO_SAVINGS_PCT = Math.round((1 - PRO_ANNUAL / (PRO_MONTHLY * 12)) * 100);
const PRO_FUTURE = 12.99;
const PRO_FUTURE_ANNUAL = 99;

const GROWTH_MONTHLY = 14.99;
const GROWTH_ANNUAL = 110;
const GROWTH_ANNUAL_MONTHLY = GROWTH_ANNUAL / 12;
const GROWTH_SAVINGS_PCT = Math.round((1 - GROWTH_ANNUAL / (GROWTH_MONTHLY * 12)) * 100);
const GROWTH_FUTURE = 24.99;
const GROWTH_FUTURE_ANNUAL = 179;

const FREE_FEATURES = [
  "StreamScore calculé instantanément",
  "Le blocage #1 identifié avec précision",
  "Progression vers l'affiliation",
  "Action prioritaire de la semaine",
  "Sans connexion Twitch requise",
];

const PRO_FEATURES = [
  "Tout le plan Gratuit",
  "Analyses illimitées après chaque live",
  "Évolution sur 30, 60 et 90 jours",
  "Plan d'action personnalisé chaque semaine",
  "Benchmark concurrents complet",
  "Classements & watchlist",
];

const GROWTH_FEATURES = [
  "Tout le plan Pro",
  "Jusqu'à 3 chaînes Twitch connectées",
  "Suivi multi-chaînes unifié",
  "Export PNG de ta carte score",
  "Support prioritaire",
  "Accès anticipé aux nouvelles features",
];

const FeatureList = ({ features, accent = false }: { features: string[]; accent?: boolean }) => (
  <ul className="space-y-2.5">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2.5 text-sm">
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: accent ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.12)" }}
        >
          <Check className="h-2.5 w-2.5" style={{ color: accent ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground)/0.6)" }} />
        </span>
        <span className="text-muted-foreground">{f}</span>
      </li>
    ))}
  </ul>
);

const PricingSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);
  const { openAuthModal } = useAuthModal();
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);

  const handleFreeCta = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('input[type="text"], input[type="search"]')?.focus();
    }, 600);
  };

  const handlePaidCta = async (plan: PlanName) => {
    if (loadingPlan) return;
    if (!user) {
      openAuthModal({ redirectTo: "/pricing" });
      return;
    }
    try {
      setLoadingPlan(plan);
      await startCheckout(plan, billing as BillingCycle);
    } catch {
      toast.error("Impossible de démarrer le paiement. Réessaie dans un instant.");
      setLoadingPlan(null);
    }
  };

  const proPrice = billing === "annual"
    ? `${PRO_ANNUAL_MONTHLY.toFixed(2).replace(".", ",")} €`
    : `${PRO_MONTHLY.toFixed(2).replace(".", ",")} €`;

  const growthPrice = billing === "annual"
    ? `${GROWTH_ANNUAL_MONTHLY.toFixed(2).replace(".", ",")} €`
    : `${GROWTH_MONTHLY.toFixed(2).replace(".", ",")} €`;

  const delay = (ms: number) =>
    `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${ms}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${ms}ms`;

  return (
    <SectionShell id="pricing">
      <SectionHeading
        badge="Tarifs"
        title="Commence gratuit. Accélère quand tu veux."
        subtitle="Ton diagnostic est immédiat et gratuit. Passe au suivi complet pour piloter ta progression live après live."
      />

      <div ref={ref} className="mt-10 flex flex-col items-center gap-8 md:mt-12">

        {/* Billing toggle */}
        <div
          className="inline-flex items-center gap-0.5 rounded-full border-2 border-foreground/70 bg-card p-1"
          style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.5)" }}
        >
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${
              billing === "monthly"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${
              billing === "annual"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annuel
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground">
              -{PRO_SAVINGS_PCT}%
            </span>
          </button>
        </div>

        {/* Founding banner */}
        {FOUNDING_MEMBER && (
          <div
            className="flex w-full max-w-5xl items-center gap-3 rounded-xl border-2 border-foreground/20 bg-primary/10 px-4 py-3"
          >
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-foreground">
              <span className="font-bold text-primary">Offre Fondateur · {FOUNDING_SPOTS} places au tarif de lancement.</span>
              {" "}Prix locké à vie pour les premiers abonnés — augmentation à {PRO_FUTURE} € / {GROWTH_FUTURE} € ensuite.
            </p>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid w-full max-w-5xl gap-5 md:grid-cols-3">

          {/* Free */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(0) }}>
            <div
              className="flex h-full flex-col rounded-2xl border-2 border-foreground/70 bg-card p-6 md:p-8"
              style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Départ</span>
                <h3 className="mt-1 font-display text-2xl font-bold text-foreground">Gratuit</h3>
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-bold tabular-nums text-foreground">0 €</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">pour toujours</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Sache en 60 secondes ce qui freine ta chaîne — sans compte, sans carte.
              </p>
              <div className="mt-6">
                <FeatureList features={FREE_FEATURES} />
              </div>
              <div className="mt-auto pt-7">
                <Button size="lg" variant="outline" className="w-full border-2 border-foreground/60 font-bold" onClick={handleFreeCta}>
                  Press Start — Gratuit
                </Button>
              </div>
            </div>
          </div>

          {/* Pro — highlighted */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(100) }}>
            <div
              className="flex h-full flex-col rounded-2xl border-2 border-primary bg-card p-6 md:p-8"
              style={{ boxShadow: "4px 4px 0 0 hsl(var(--primary))" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Croissance</span>
                  <h3 className="mt-1 font-display text-2xl font-bold text-foreground">Pro</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommandé
                  </span>
                  {FOUNDING_MEMBER && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                      Fondateur
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5">
                {FOUNDING_MEMBER && (
                  <p className="mb-1 text-xs text-muted-foreground line-through">
                    {billing === "annual"
                      ? `${(PRO_FUTURE_ANNUAL / 12).toFixed(2).replace(".", ",")} €/mois`
                      : `${PRO_FUTURE.toFixed(2).replace(".", ",")} €/mois`}
                  </p>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-bold tabular-nums text-foreground">{proPrice}</span>
                  <span className="text-sm text-muted-foreground">/ mois</span>
                </div>
                {billing === "annual" ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Facturé <strong className="text-foreground">{PRO_ANNUAL} €</strong> en une fois
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    ou{" "}
                    <button onClick={() => setBilling("annual")} className="font-bold text-primary underline-offset-2 hover:underline">
                      {PRO_ANNUAL} € / an
                    </button>
                    {" "}(-{PRO_SAVINGS_PCT}%)
                  </p>
                )}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Pour les streamers qui progressent live après live, sans avancer à l'aveugle.
              </p>
              <div className="mt-6">
                <FeatureList features={PRO_FEATURES} accent />
              </div>
              <div className="mt-auto pt-7">
                <Button
                  size="lg"
                  className="w-full font-bold"
                  onClick={() => handlePaidCta("pro")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === "pro"
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirection…</>
                    : "Activer le plan Pro ⚡"}
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {FOUNDING_MEMBER ? "Prix locké à vie · sans engagement" : "Sans engagement · résiliable à tout moment"}
                </p>
              </div>
            </div>
          </div>

          {/* Growth */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(200) }}>
            <div
              className="flex h-full flex-col rounded-2xl border-2 border-foreground/70 bg-card p-6 md:p-8"
              style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avancé</span>
                  <h3 className="mt-1 font-display text-2xl font-bold text-foreground">Growth</h3>
                </div>
                {FOUNDING_MEMBER && (
                  <span className="rounded-full border border-foreground/20 bg-foreground/5 px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                    Fondateur
                  </span>
                )}
              </div>

              <div className="mt-5">
                {FOUNDING_MEMBER && (
                  <p className="mb-1 text-xs text-muted-foreground line-through">
                    {billing === "annual"
                      ? `${(GROWTH_FUTURE_ANNUAL / 12).toFixed(2).replace(".", ",")} €/mois`
                      : `${GROWTH_FUTURE.toFixed(2).replace(".", ",")} €/mois`}
                  </p>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-bold tabular-nums text-foreground">{growthPrice}</span>
                  <span className="text-sm text-muted-foreground">/ mois</span>
                </div>
                {billing === "annual" ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Facturé <strong className="text-foreground">{GROWTH_ANNUAL} €</strong> en une fois
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    ou{" "}
                    <button onClick={() => setBilling("annual")} className="font-bold text-primary underline-offset-2 hover:underline">
                      {GROWTH_ANNUAL} € / an
                    </button>
                    {" "}(-{GROWTH_SAVINGS_PCT}%)
                  </p>
                )}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Pour les streamers sérieux qui pilotent plusieurs chaînes.
              </p>
              <div className="mt-6">
                <FeatureList features={GROWTH_FEATURES} />
              </div>
              <div className="mt-auto pt-7">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-foreground/60 font-bold"
                  onClick={() => handlePaidCta("growth")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === "growth"
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirection…</>
                    : "Activer le plan Growth"}
                </Button>
                {FOUNDING_MEMBER && (
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Prix locké à vie · sans engagement
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Pas de carte bancaire pour le diagnostic gratuit ·{" "}
          <Link to="/tarifs" className="font-semibold underline underline-offset-2 hover:text-foreground transition-colors">
            Comparer toutes les fonctionnalités →
          </Link>
        </p>
      </div>
    </SectionShell>
  );
};

export default PricingSection;
