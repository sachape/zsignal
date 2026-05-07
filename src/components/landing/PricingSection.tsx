import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

// ── Pricing constants ────────────────────────────────────────────────────────

const PRO_MONTHLY = 7.99;
const PRO_ANNUAL = 59; // per year
const PRO_ANNUAL_MONTHLY = PRO_ANNUAL / 12; // ≈ 4.92
const PRO_SAVINGS_PCT = Math.round((1 - PRO_ANNUAL / (PRO_MONTHLY * 12)) * 100); // ≈ 38

const GROWTH_MONTHLY = 14.99;
const GROWTH_ANNUAL = 110; // per year
const GROWTH_ANNUAL_MONTHLY = GROWTH_ANNUAL / 12; // ≈ 9.17
const GROWTH_SAVINGS_PCT = Math.round((1 - GROWTH_ANNUAL / (GROWTH_MONTHLY * 12)) * 100); // ≈ 39

// ── Feature lists ────────────────────────────────────────────────────────────

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
  "Export PNG et PDF des rapports",
  "Support prioritaire",
  "Accès anticipé aux nouvelles features",
];

// ── Component ────────────────────────────────────────────────────────────────

const FeatureList = ({ features }: { features: string[] }) => (
  <ul className="space-y-2.5">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2.5 text-sm">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
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
              -{PRO_SAVINGS_PCT}%
            </span>
          </button>
        </div>

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
                Sache en 60 secondes ce qui freine ta chaîne — sans compte, sans carte.
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
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                  Recommandé
                </span>
              </div>
              <div className="mt-5">
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
                Pour les streamers qui progressent live après live, sans avancer à l'aveugle.
              </p>
              <div className="mt-6">
                <FeatureList features={PRO_FEATURES} />
              </div>
              <div className="mt-auto pt-7">
                <Button size="lg" className="w-full" onClick={handlePaidCta}>
                  Activer le plan Pro
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Sans engagement · résiliable à tout moment
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Growth */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: delay(200) }}>
            <GlassCard className="flex h-full flex-col p-6 md:p-8">
              <div>
                <MicroLabel>Avancé</MicroLabel>
                <h3 className="mt-1 text-xl font-semibold text-foreground">Growth</h3>
              </div>
              <div className="mt-5">
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
                <Button size="lg" variant="outline" className="w-full" onClick={handlePaidCta}>
                  Activer le plan Growth
                </Button>
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
