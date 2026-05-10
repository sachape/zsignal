import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  CreditCard,
  Receipt,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/usePageMeta";

const FREE_FEATURES = [
  "StreamScore (1 analyse/mois)",
  "Progression affilié basique",
  "Profil public",
  "Benchmark (3 chaînes)",
  "Historique 30 jours",
];

const BillingPage = () => {
  usePageMeta({ title: "Facturation", description: "Gérez votre abonnement et vos paiements." });

  return (
    <AppShell>
      <PageContainer size="sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
            Facturation
          </h1>
        </div>

        {/* Plan actuel */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Plan actuel
          </h2>
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">Plan Gratuit</span>
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Actuel
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accès aux fonctionnalités de base.
                  </p>
                </div>
                <span className="text-2xl font-bold text-foreground">0€</span>
              </div>

              <ul className="mb-5 space-y-1.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Passe au Pro et débloque tout
                  </p>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Live cockpit, débrief post-live, plan de la semaine, quêtes, export PDF — à partir de 7,99€/mois.
                </p>
                <Button asChild size="sm">
                  <Link to="/pricing">
                    Voir les offres <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Moyen de paiement */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Moyen de paiement
          </h2>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Aucun moyen de paiement enregistré
                </p>
                <p className="text-xs text-muted-foreground">
                  Géré de façon sécurisée via Stripe.
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="text-xs">
                Ajouter
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Historique */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Historique des factures
          </h2>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Receipt className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">
                Aucune facture pour l'instant
              </p>
              <p className="text-xs text-muted-foreground">
                Tes factures apparaîtront ici dès que tu auras souscrit à un plan.
              </p>
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default BillingPage;
