import { useState } from "react";
import { Check, Sparkles, Clock, Loader2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { startCheckout, type PlanName, type BillingCycle } from "@/services/billingService";
import { toast } from "sonner";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import FaqSection from "@/components/landing/FaqSection";
import { usePageMeta } from "@/hooks/usePageMeta";

// ── Pricing constants (keep in sync with PricingSection.tsx) ─────────────
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

// ── Feature comparison table ──────────────────────────────────────────────
const FEATURE_GROUPS = [
  {
    title: "Diagnostic",
    rows: [
      { label: "StreamScore instantané", free: true, pro: true, growth: true },
      { label: "Blocage #1 identifié", free: true, pro: true, growth: true },
      { label: "Progression vers l'affiliation", free: true, pro: true, growth: true },
      { label: "Action prioritaire de la semaine", free: true, pro: true, growth: true },
      { label: "Analyses illimitées après chaque live", free: false, pro: true, growth: true },
      { label: "Évolution sur 30 / 60 / 90 jours", free: false, pro: true, growth: true },
    ],
  },
  {
    title: "Plan d'action",
    rows: [
      { label: "Plan d'action hebdo personnalisé", free: false, pro: true, growth: true },
      { label: "Benchmark concurrents complet", free: false, pro: true, growth: true },
      { label: "Classements & watchlist", free: false, pro: true, growth: true },
    ],
  },
  {
    title: "Multi-chaînes",
    rows: [
      { label: "Jusqu'à 3 chaînes Twitch connectées", free: false, pro: false, growth: true },
      { label: "Suivi multi-chaînes unifié", free: false, pro: false, growth: true },
      { label: "Export PNG de ta carte score", free: false, pro: false, growth: true },
    ],
  },
  {
    title: "Support",
    rows: [
      { label: "Support standard", free: true, pro: true, growth: true },
      { label: "Support prioritaire", free: false, pro: false, growth: true },
      { label: "Accès anticipé aux nouvelles features", free: false, pro: false, growth: true },
    ],
  },
];

const PRICING_FAQ = [
  {
    q: "Est-ce que le diagnostic gratuit est vraiment gratuit ?",
    a: "Oui, complètement. Tu entres ton pseudo Twitch, Streamnco analyse ta chaîne et tu reçois ton score, ton blocage #1 et ton action prioritaire — sans créer de compte, sans carte bancaire.",
  },
  {
    q: "Quelle est la différence entre Pro et Growth ?",
    a: "Le plan Pro couvre une chaîne Twitch avec toutes les analyses avancées. Le plan Growth ajoute la gestion multi-chaînes (jusqu'à 3), l'export de ta carte score et le support prioritaire.",
  },
  {
    q: "Qu'est-ce que l'offre Fondateur ?",
    a: `Les ${FOUNDING_SPOTS} premiers abonnés bénéficient d'un tarif réduit locké à vie. Le prix augmentera à ${PRO_FUTURE} € / ${GROWTH_FUTURE} € après le lancement. Sans engagement de ta part.`,
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Pas d'engagement, pas de frais de résiliation. Tu peux annuler depuis ton espace facturation en 1 clic.",
  },
];

// ── Reusable check cell ───────────────────────────────────────────────────
const Cell = ({ value, accent = false }: { value: boolean; accent?: boolean }) => (
  <td className="px-4 py-3 text-center">
    {value ? (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: accent ? "hsl(var(--primary))" : "hsl(var(--foreground)/0.12)" }}
      >
        <Check className="h-3.5 w-3.5" style={{ color: accent ? "#fff" : "hsl(var(--foreground)/0.6)" }} />
      </span>
    ) : (
      <span className="inline-block h-1 w-4 rounded-full bg-foreground/15" />
    )}
  </td>
);

// ── Page ─────────────────────────────────────────────────────────────────
const PublicPricingPage = () => {
  usePageMeta({
    title: "Tarifs Streamnco — Diagnostic gratuit, plans Pro & Growth",
    description:
      "Découvrez les tarifs Streamnco : diagnostic Twitch gratuit, plan Pro à 7,99 €/mois, plan Growth multi-chaînes. Sans engagement.",
    canonical: "https://streamnco.fr/tarifs",
    robots: "index, follow",
  });

  const { openAuthModal } = useAuthModal();
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);

  const handleFreeCta = () => window.location.assign("/#hero");

  const handlePaidCta = async (plan: PlanName) => {
    if (loadingPlan) return;
    if (!user) {
      openAuthModal({ redirectTo: "/tarifs" });
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

  return (
    <div className="landing min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-20">
        {/* Pixel decorations */}
        <span className="pointer-events-none absolute right-[8%] top-[20%] text-4xl text-primary opacity-40 select-none" aria-hidden>✦</span>
        <span className="pointer-events-none absolute left-[6%] top-[40%] text-3xl opacity-30 select-none" style={{ color: "hsl(var(--brand-purple, 258 47% 48%))" }} aria-hidden>★</span>

        <div className="container mx-auto max-w-5xl px-4 text-center md:px-6">
          {/* Illustration */}
          <div className="mb-8 flex justify-center">
            <img
              src="/illustrations/loot-fever.png"
              alt=""
              aria-hidden
              loading="eager"
              className="h-48 w-48 object-contain drop-shadow-lg md:h-60 md:w-60"
            />
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-background">
            <Zap className="h-3 w-3" /> Tarifs
          </span>

          <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-foreground sm:text-6xl md:text-7xl">
            Commence gratuit.<br />
            <span className="text-primary">Level up quand tu veux.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Ton diagnostic Twitch est immédiat et gratuit. Sans compte, sans carte bancaire.
            Passe au suivi complet pour piloter ta progression live après live.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex justify-center">
            <div
              className="inline-flex items-center gap-0.5 rounded-full border-2 border-foreground/70 bg-card p-1"
              style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.5)" }}
            >
              <button
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-6 py-2 text-sm font-bold transition-all duration-200 ${
                  billing === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all duration-200 ${
                  billing === "annual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annuel
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground">
                  -{PRO_SAVINGS_PCT}%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Founding banner ── */}
      {FOUNDING_MEMBER && (
        <div className="container mx-auto max-w-5xl px-4 pb-6 md:px-6">
          <div className="flex items-center gap-3 rounded-xl border-2 border-foreground/20 bg-primary/10 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-foreground">
              <span className="font-bold text-primary">Offre Fondateur · {FOUNDING_SPOTS} places au tarif de lancement.</span>
              {" "}Prix locké à vie — augmentation à {PRO_FUTURE} € / {GROWTH_FUTURE} € ensuite.
            </p>
          </div>
        </div>
      )}

      {/* ── Plan cards ── */}
      <section className="pb-20 md:pb-28">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-3">

            {/* Gratuit */}
            <div
              className="flex flex-col rounded-2xl border-2 border-foreground/70 bg-card p-7"
              style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Départ</span>
              <h2 className="mt-1 font-display text-3xl font-bold text-foreground">Gratuit</h2>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-bold text-foreground">0 €</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">pour toujours</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Sache en 60 secondes ce qui freine ta chaîne — sans compte, sans carte.
              </p>
              <div className="mt-auto pt-8">
                <Button size="lg" variant="outline" className="w-full border-2 border-foreground/60 font-bold" onClick={handleFreeCta}>
                  Press Start — Gratuit
                </Button>
              </div>
            </div>

            {/* Pro */}
            <div
              className="flex flex-col rounded-2xl border-2 border-primary bg-card p-7"
              style={{ boxShadow: "4px 4px 0 0 hsl(var(--primary))" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Croissance</span>
                  <h2 className="mt-1 font-display text-3xl font-bold text-foreground">Pro</h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                  <Sparkles className="h-2.5 w-2.5" /> Recommandé
                </span>
              </div>

              {FOUNDING_MEMBER && (
                <p className="mt-4 text-xs text-muted-foreground line-through">
                  {billing === "annual"
                    ? `${(PRO_FUTURE_ANNUAL / 12).toFixed(2).replace(".", ",")} €/mois`
                    : `${PRO_FUTURE.toFixed(2).replace(".", ",")} €/mois`}
                </p>
              )}
              <div className={`flex items-baseline gap-1.5 ${FOUNDING_MEMBER ? "mt-1" : "mt-4"}`}>
                <span className="font-display text-5xl font-bold text-foreground">{proPrice}</span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
              {billing === "annual" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Facturé <strong className="text-foreground">{PRO_ANNUAL} €</strong> en une fois
                </p>
              )}
              {billing === "monthly" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  ou{" "}
                  <button onClick={() => setBilling("annual")} className="font-bold text-primary underline-offset-2 hover:underline">
                    {PRO_ANNUAL} € / an
                  </button>
                  {" "}(-{PRO_SAVINGS_PCT}%)
                </p>
              )}

              <p className="mt-4 text-sm text-muted-foreground">
                Pour les streamers qui progressent live après live, sans avancer à l'aveugle.
              </p>
              <div className="mt-auto pt-8">
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
                  Prix locké à vie · sans engagement
                </p>
              </div>
            </div>

            {/* Growth */}
            <div
              className="flex flex-col rounded-2xl border-2 border-foreground/70 bg-card p-7"
              style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avancé</span>
              <h2 className="mt-1 font-display text-3xl font-bold text-foreground">Growth</h2>

              {FOUNDING_MEMBER && (
                <p className="mt-4 text-xs text-muted-foreground line-through">
                  {billing === "annual"
                    ? `${(GROWTH_FUTURE_ANNUAL / 12).toFixed(2).replace(".", ",")} €/mois`
                    : `${GROWTH_FUTURE.toFixed(2).replace(".", ",")} €/mois`}
                </p>
              )}
              <div className={`flex items-baseline gap-1.5 ${FOUNDING_MEMBER ? "mt-1" : "mt-4"}`}>
                <span className="font-display text-5xl font-bold text-foreground">{growthPrice}</span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
              {billing === "annual" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Facturé <strong className="text-foreground">{GROWTH_ANNUAL} €</strong> en une fois
                </p>
              )}
              {billing === "monthly" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  ou{" "}
                  <button onClick={() => setBilling("annual")} className="font-bold text-primary underline-offset-2 hover:underline">
                    {GROWTH_ANNUAL} € / an
                  </button>
                  {" "}(-{GROWTH_SAVINGS_PCT}%)
                </p>
              )}

              <p className="mt-4 text-sm text-muted-foreground">
                Pour les streamers sérieux qui pilotent plusieurs chaînes.
              </p>
              <div className="mt-auto pt-8">
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
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Prix locké à vie · sans engagement
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="border-t-2 border-foreground/10 pb-20 pt-16 md:pb-28 md:pt-20">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-10 text-center font-display text-3xl font-bold text-foreground sm:text-4xl">
            Comparaison complète
          </h2>

          <div
            className="overflow-hidden rounded-2xl border-2 border-foreground/70"
            style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
          >
            <table className="w-full border-collapse bg-card text-sm">
              {/* Header */}
              <thead>
                <tr className="border-b-2 border-foreground/20">
                  <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Fonctionnalité
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className="font-display text-base font-bold text-foreground">Gratuit</span>
                  </th>
                  <th className="bg-primary/8 px-4 py-4 text-center">
                    <span className="font-display text-base font-bold text-primary">Pro</span>
                    <br />
                    <span className="text-[10px] font-bold text-muted-foreground">{proPrice}/mois</span>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className="font-display text-base font-bold text-foreground">Growth</span>
                    <br />
                    <span className="text-[10px] font-bold text-muted-foreground">{growthPrice}/mois</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map((group) => (
                  <>
                    <tr key={group.title} className="border-t border-foreground/10 bg-muted/30">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                      >
                        {group.title}
                      </td>
                    </tr>
                    {group.rows.map((row, i) => (
                      <tr
                        key={row.label}
                        className={`border-t border-foreground/8 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-4 py-3 text-sm text-foreground">{row.label}</td>
                        <Cell value={row.free} />
                        <Cell value={row.pro} accent />
                        <Cell value={row.growth} />
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection extraFaq={PRICING_FAQ} />

      <LandingFooter />
    </div>
  );
};

export default PublicPricingPage;
