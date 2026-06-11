import { useState } from "react";
import { Check, Sparkles, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { startCheckout, type PlanName, type BillingCycle } from "@/services/billingService";
import { toast } from "sonner";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

// ── Founding member offer ────────────────────────────────────────────────────
// Set to false once the launch offer ends. Future prices shown as strikethrough.

const FOUNDING_MEMBER = true;
const FOUNDING_SPOTS = 150;

// ── Pricing constants ────────────────────────────────────────────────────────

// Founding member prices (current)
const PRO_MONTHLY = 7.99;
const PRO_ANNUAL = 59;
const PRO_ANNUAL_MONTHLY = PRO_ANNUAL / 12;
const PRO_SAVINGS_PCT = Math.round((1 - PRO_ANNUAL / (PRO_MONTHLY * 12)) * 100);

// Future prices (shown as strikethrough during founding offer)
const PRO_FUTURE = 12.99;
const PRO_FUTURE_ANNUAL = 99;

const GROWTH_MONTHLY = 14.99;
const GROWTH_ANNUAL = 110;
const GROWTH_ANNUAL_MONTHLY = GROWTH_ANNUAL / 12;
const GROWTH_SAVINGS_PCT = Math.round((1 - GROWTH_ANNUAL / (GROWTH_MONTHLY * 12)) * 100);

const GROWTH_FUTURE = 24.99;
const GROWTH_FUTURE_ANNUAL = 179;

// ── Feature lists ────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "StreamScore calculé instantanément",
  "5 visuels et 3 clips réseaux par mois",
  "Le blocage #1 identifié avec précision",
  "Téléchargement de tes clips et visuels",
  "Sans connexion Twitch requise pour démarrer",
  "Publication manuelle uniquement",
  "Sans carte bancaire",
];

const PRO_FEATURES = [
  "Tout le plan Gratuit",
  "100 visuels et 30 clips réseaux par mois",
  "Évolution sur 30, 60 et 90 jours",
  "Plan d'action personnalisé chaque semaine",
  "Sous-titres et styles de captions",
  "File de contenu et brouillons",
  "Benchmark concurrents complet",
];

const GROWTH_FEATURES = [
  "Tout le plan Pro",
  "300 visuels et 200 clips réseaux par mois",
  "Jusqu'à 3 chaînes Twitch connectées",
  "Benchmark et watchlist avancés",
  "Préparation live plus complète",
  "Support prioritaire",
  "Accès anticipé aux nouvelles features",
];

// ── Component ────────────────────────────────────────────────────────────────

const FeatureList = ({ features }: { features: string[] }) => (
  <ul className="space-y-2.5">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2.5 text-sm">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/[0.15]">
          <Check className="h-2.5 w-2.5 text-primary" />
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
      document
        .querySelector<HTMLInputElement>('input[type="text"], input[type="search"]')
        ?.focus();
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
    } catch (e) {
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
        title="Commence gratuitement. Structure ton contenu quand tu es prêt."
        subtitle="Un premier diagnostic pour découvrir Streamnco, puis des outils pour créer des clips, produire des visuels et suivre ta progression."
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
                ? "bg-primary/[0.12] border border-primary/25 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              billing === "annual"
                ? "bg-primary/[0.12] border border-primary/25 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
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
              -{PRO_SAVINGS_PCT}%
            </span>
          </button>
        </div>

        {/* Founding member banner */}
        {FOUNDING_MEMBER && (
          <div className="flex w-full max-w-5xl items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-foreground">
              <span className="font-semibold text-primary">Offre Fondateur · {FOUNDING_SPOTS} places au tarif de lancement.</span>
              {" "}Prix locké à vie pour les premiers abonnés — augmentation à {PRO_FUTURE} € / {GROWTH_FUTURE} € ensuite.
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="grid w-full max-w-5xl gap-5 md:grid-cols-3">
          {/* Free */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(0) }}>
            <GlassCard className="flex h-full flex-col p-6 md:p-8">
              <div>
                <MicroLabel>Départ</MicroLabel>
                <h3 className="mt-1 text-xl font-semibold text-foreground">Gratuit</h3>
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums md:text-5xl">
                  0 €
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">pour toujours</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Découvre Streamnco avec un premier diagnostic Twitch — sans carte bancaire.
              </p>
              <div className="mt-6">
                <FeatureList features={FREE_FEATURES} />
              </div>
              <div className="mt-auto pt-7">
                <Button size="lg" variant="outline" className="w-full" onClick={handleFreeCta}>
                  Lancer mon diagnostic gratuit
                </Button>
              </div>
            </GlassCard>
          </div>

          {/* Pro — highlighted */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(100) }}>
            <GlassCard hero className="flex h-full flex-col p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <MicroLabel>Croissance</MicroLabel>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">Pro</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommandé
                  </span>
                  {FOUNDING_MEMBER && (
                    <span className="rounded-full bg-primary/[0.15] px-2 py-0.5 text-[9px] font-bold text-primary">
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
                  <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums md:text-5xl">
                    {proPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mois</span>
                </div>
                {billing === "annual" ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Facturé{" "}
                    <span className="font-semibold text-foreground">{PRO_ANNUAL} €</span>{" "}
                    en une fois · au lieu de{" "}
                    <span className="line-through">{(PRO_MONTHLY * 12).toFixed(2).replace(".", ",")} €</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    ou{" "}
                    <button onClick={() => setBilling("annual")} className="font-semibold text-primary underline-offset-2 hover:underline">
                      {PRO_ANNUAL} € / an
                    </button>
                    {" "}(-{PRO_SAVINGS_PCT}%)
                  </p>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Pour les streamers qui veulent créer et organiser leurs contenus plus sérieusement.
              </p>
              <div className="mt-6">
                <FeatureList features={PRO_FEATURES} />
              </div>
              <div className="mt-auto pt-7">
                <Button size="lg" className="w-full" onClick={() => handlePaidCta("pro")} disabled={loadingPlan !== null}>
                  {loadingPlan === "pro" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirection…</> : "Activer le plan Pro"}
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {FOUNDING_MEMBER ? "Prix locké à vie · sans engagement" : "Sans engagement · résiliable à tout moment"}
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Growth */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(200) }}>
            <GlassCard className="flex h-full flex-col p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <MicroLabel>Avancé</MicroLabel>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">Growth</h3>
                </div>
                {FOUNDING_MEMBER && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
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
                  <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums md:text-5xl">
                    {growthPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mois</span>
                </div>
                {billing === "annual" ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Facturé{" "}
                    <span className="font-semibold text-foreground">{GROWTH_ANNUAL} €</span>{" "}
                    en une fois · au lieu de{" "}
                    <span className="line-through">{(GROWTH_MONTHLY * 12).toFixed(2).replace(".", ",")} €</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    ou{" "}
                    <button onClick={() => setBilling("annual")} className="font-semibold text-primary underline-offset-2 hover:underline">
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
                <Button size="lg" variant="outline" className="w-full" onClick={() => handlePaidCta("growth")} disabled={loadingPlan !== null}>
                  {loadingPlan === "growth" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirection…</> : "Activer le plan Growth"}
                </Button>
                {FOUNDING_MEMBER && (
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Prix locké à vie · sans engagement
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Pas de carte bancaire pour le diagnostic gratuit ·{" "}
          <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Comparer toutes les fonctionnalités →
          </Link>
        </p>
      </div>
    </SectionShell>
  );
};

export default PricingSection;
