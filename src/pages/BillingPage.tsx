import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  Receipt,
  Sparkles,
  AlertTriangle,
  Crown,
  Zap,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useSubscription } from "@/hooks/useSubscription";

import { openBillingPortal, startCheckout } from "@/services/billingService";
import { toast } from "sonner";
import { CreditsSection } from "@/components/credits/CreditsSection";

const PLAN_META: Record<
  string,
  { label: string; icon: React.ReactNode; price: string; priceAnnual: string; color: string }
> = {
  pro: {
    label: "Pro",
    icon: <Sparkles className="h-4 w-4 text-primary-strong" />,
    price: "9,99",
    priceAnnual: "8,33",
    color: "primary",
  },
  // Growth kept in metadata only for users who already have an active Growth
  // subscription — no longer sold from this page.
  growth: {
    label: "Growth",
    icon: <Crown className="h-4 w-4 text-violet-400" />,
    price: "29,99",
    priceAnnual: "24,99",
    color: "violet",
  },
};

const FREE_FEATURES = [
  "Diagnostic StreamScore instantané",
  "Blocage #1 identifié",
  "Progression vers l'affiliation",
  "Action prioritaire de la semaine",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const BillingPage = () => {
  usePageMeta({ title: "Facturation", description: "Gérez votre abonnement et vos paiements." });
  const sub = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<"pro" | null>(null);

  const handleCheckout = async (plan: "pro") => {
    if (checkoutLoading) return;
    try {
      setCheckoutLoading(plan);
      await startCheckout(plan, "monthly");
    } catch {
      toast.error("Impossible de lancer le paiement. Réessaie dans un instant.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    if (portalLoading) return;
    try {
      setPortalLoading(true);
      await openBillingPortal();
    } catch {
      toast.error("Impossible d'ouvrir le portail. Réessaie dans un instant.");
      setPortalLoading(false);
    }
  };

  const planMeta = sub.plan_name !== "free" ? PLAN_META[sub.plan_name] : null;
  const isPaid = sub.is_active && planMeta;

  return (
    <AppShell>
      <PageContainer size="sm">
        <div className="mb-8 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
            <Link to="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
            Facturation
          </h1>
        </div>

        {/* Pay As You Go credits — visible only when flag ON + packs active */}
        <CreditsSection />




        {/* Plan actuel */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
            Plan actuel
          </h2>

          {sub.loading ? (
            <Card>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
                </div>
              </CardContent>
            </Card>
          ) : isPaid ? (
            <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.07] to-card">
              {/* Ambient glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_65%)]" />
              <CardContent className="relative p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      {planMeta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">
                          Plan {planMeta.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider text-primary-strong">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Actif
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {sub.billing_cycle === "annual" ? "Facturation annuelle" : "Facturation mensuelle"}
                        {" · "}
                        {sub.billing_cycle === "annual"
                          ? `${planMeta.priceAnnual} €/mois`
                          : `${planMeta.price} €/mois`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {sub.billing_cycle === "annual" ? planMeta.priceAnnual : planMeta.price} €
                    </span>
                    <p className="text-[12px] text-muted-foreground">/ mois</p>
                  </div>
                </div>

                {/* Renewal / cancellation */}
                {sub.current_period_end && (
                  <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    sub.cancel_at_period_end
                      ? "border border-orange-500/20 bg-orange-500/[0.08] text-orange-400"
                      : "border border-border bg-background/40 text-muted-foreground"
                  }`}>
                    {sub.cancel_at_period_end
                      ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      : <Calendar className="h-3.5 w-3.5 shrink-0" />
                    }
                    {sub.cancel_at_period_end
                      ? `Résiliation prévue le ${formatDate(sub.current_period_end)} — accès jusqu'à cette date`
                      : `Prochain renouvellement le ${formatDate(sub.current_period_end)}`
                    }
                  </div>
                )}

                {/* Portal CTA */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full border-border bg-background/40 text-sm hover:bg-background/70"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Redirection…
                    </>
                  ) : (
                    "Gérer mon abonnement via Stripe"
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">Plan Gratuit</span>
                        <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
                          Actuel
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Accès aux fonctionnalités de base.
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-foreground">0 €</span>
                </div>

                <ul className="mb-5 space-y-1.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary-strong" />
                    <p className="text-sm font-semibold text-foreground">
                      Passe Pro pour progresser sérieusement
                    </p>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Débloque le StreamScore complet, les débriefs post-live, le calendrier
                    optimal, le benchmark, les playbooks et les recommandations avancées.
                    Bonus Pro : +20% de StreamCoins sur chaque recharge <em>(bientôt).</em>
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleCheckout("pro")}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === "pro" ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Passer Pro — 9,99 €/mois
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Moyen de paiement */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
            Moyen de paiement
          </h2>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                {isPaid ? (
                  <>
                    <p className="text-sm font-medium text-foreground">Géré via Stripe</p>
                    <p className="text-xs text-muted-foreground">
                      Modifie ta carte depuis le portail Stripe.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      Aucun moyen de paiement enregistré
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Géré de façon sécurisée via Stripe.
                    </p>
                  </>
                )}
              </div>
              {isPaid && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gérer"}
                </Button>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Historique */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
            Historique des factures
          </h2>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Receipt className="h-7 w-7 text-muted-foreground/25" />
              {isPaid ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Tes factures sont disponibles sur Stripe
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Accède à l'historique complet et télécharge tes PDF depuis le portail.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handlePortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Voir mes factures"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Aucune facture pour l'instant</p>
                  <p className="text-xs text-muted-foreground">
                    Tes factures apparaîtront ici dès que tu auras souscrit à un plan.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default BillingPage;
