import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Minus,
  Sparkles,
  Zap,
  Mail,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

// ── Feature table ────────────────────────────────────────────────────────────

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  growth: string | boolean;
  agency: string | boolean;
}

const FEATURES: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "Analyse",
    rows: [
      {
        label: "StreamScore",
        free: "1/mois",
        pro: "Illimité",
        growth: "Illimité",
        agency: "Illimité",
      },
      {
        label: "Progression affilié",
        free: "Basique",
        pro: "Complète + projections",
        growth: "Complète + projections",
        agency: "Complète + projections",
      },
      {
        label: "Historique des analyses",
        free: "30 jours",
        pro: "Illimité",
        growth: "Illimité",
        agency: "Illimité",
      },
      {
        label: "Profil public",
        free: true,
        pro: true,
        growth: true,
        agency: true,
      },
    ],
  },
  {
    group: "Live",
    rows: [
      {
        label: "Live cockpit (temps réel)",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
      {
        label: "Débrief post-live",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
    ],
  },
  {
    group: "Progression",
    rows: [
      {
        label: "Plan de la semaine",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
      {
        label: "Quêtes & badges",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
      {
        label: "Bibliothèque de ressources",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
    ],
  },
  {
    group: "Benchmark",
    rows: [
      {
        label: "Concurrents",
        free: "3 chaînes",
        pro: "Illimité",
        growth: "Illimité",
        agency: "Illimité",
      },
      {
        label: "Export PNG (share card)",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
      {
        label: "Export PDF rapport",
        free: false,
        pro: true,
        growth: true,
        agency: true,
      },
    ],
  },
  {
    group: "Comptes & support",
    rows: [
      {
        label: "Comptes Twitch connectés",
        free: "1",
        pro: "1",
        growth: "Jusqu'à 3",
        agency: "Illimité",
      },
      {
        label: "Support prioritaire",
        free: false,
        pro: false,
        growth: true,
        agency: true,
      },
      {
        label: "Onboarding dédié",
        free: false,
        pro: false,
        growth: false,
        agency: true,
      },
      {
        label: "Accès anticipé aux features",
        free: false,
        pro: false,
        growth: false,
        agency: true,
      },
    ],
  },
];

// ── Tier cards ───────────────────────────────────────────────────────────────

interface Tier {
  id: string;
  name: string;
  price: string;
  annual?: string;
  annualTotal?: string;
  period: string;
  description: string;
  cta: string;
  ctaTo: string;
  highlighted: boolean;
  badge?: string;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "pour toujours",
    description: "Pour découvrir et commencer à analyser ta chaîne.",
    cta: "Commencer gratuitement",
    ctaTo: "/auth",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "7,99€",
    annual: "4,92€",
    annualTotal: "59€",
    period: "par mois",
    description: "Tout ce qu'il faut pour progresser semaine après semaine.",
    cta: "Passer au Pro",
    ctaTo: "/billing",
    highlighted: true,
    badge: "Recommandé",
  },
  {
    id: "growth",
    name: "Growth",
    price: "14,99€",
    annual: "9,17€",
    annualTotal: "110€",
    period: "par mois",
    description: "Pour les streamers sérieux qui pilotent plusieurs chaînes.",
    cta: "Passer au Growth",
    ctaTo: "/billing",
    highlighted: false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function CellValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (value === false)
    return <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />;
  return (
    <span className="text-xs font-medium text-foreground">{value}</span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

const PricingPage = () => {
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  usePageMeta({
    title: "Tarifs",
    description:
      "Streamnco — Gratuit, Pro à 7,99€/mois, Growth à 14,99€/mois. Analyse ta chaîne Twitch et progresse vers l'affiliation.",
  });

  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3 w-3" /> Tarifs simples et transparents
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Commence gratuitement,
            <br />
            <span className="text-primary">évolue à ton rythme.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Aucune carte bancaire requise pour démarrer. Passe au niveau supérieur quand tu es prêt.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/50 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                billing === "monthly"
                  ? "bg-primary/10 border border-primary/25 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                billing === "annual"
                  ? "bg-primary/10 border border-primary/25 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annuel
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${billing === "annual" ? "bg-primary text-background" : "bg-primary/20 text-primary"}`}>
                -38%
              </span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                "relative rounded-2xl border p-6 transition-all",
                tier.highlighted
                  ? "border-primary/40 bg-primary/[0.04] shadow-[0_0_40px_-12px] shadow-primary/20"
                  : "border-white/[0.08] bg-card/40",
              )}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-background px-1.5">
                  <Badge className="gap-1 border-primary/40 bg-primary/10 text-primary shadow-none">
                    <Sparkles className="h-3 w-3" />
                    {tier.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  {tier.name}
                </p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {billing === "annual" && tier.annual ? tier.annual : tier.price}
                  </span>
                  <span className="mb-0.5 text-xs text-muted-foreground">
                    {tier.period}
                  </span>
                </div>
                {billing === "annual" && tier.annualTotal && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Facturé <span className="font-semibold text-foreground">{tier.annualTotal}</span> / an · au lieu de <span className="line-through">{tier.price.replace(",", ".").replace("€", "")}€ × 12</span>
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {tier.description}
                </p>
              </div>

              <Button
                asChild
                size="sm"
                variant={tier.highlighted ? "default" : "outline"}
                className="w-full"
              >
                <Link to={tier.ctaTo}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Agency card */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-card/30 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-foreground">Agency</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tu gères plusieurs streamers ? Comptes illimités, onboarding dédié et accès anticipé aux nouvelles features.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <a href="mailto:hello@streamnco.com">
              <Mail className="h-3.5 w-3.5" /> Nous contacter
            </a>
          </Button>
        </div>

        {/* Feature comparison table */}
        <div className="mb-10 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fonctionnalités
                </th>
                {["Gratuit", "Pro", "Growth", "Agency"].map((name) => (
                  <th
                    key={name}
                    className={cn(
                      "px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest",
                      name === "Pro" ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(({ group, rows }) => (
                <>
                  <tr key={group} className="border-b border-white/[0.04]">
                    <td
                      colSpan={5}
                      className="bg-muted/20 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {group}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3 text-xs text-foreground">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.free} />
                      </td>
                      <td className="bg-primary/[0.03] px-4 py-3 text-center">
                        <CellValue value={row.pro} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.growth} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.agency} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Questions fréquentes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                q: "Puis-je changer de plan à tout moment ?",
                a: "Oui. Tu peux passer à un plan supérieur ou inférieur à tout moment. Le changement prend effet immédiatement.",
              },
              {
                q: "Comment fonctionne la facturation ?",
                a: "Facturation mensuelle via Stripe. Aucun engagement, annulable à tout moment depuis la page Facturation.",
              },
              {
                q: "Mes données sont-elles sécurisées ?",
                a: "Oui. Toutes les données sont chiffrées et hébergées en Europe. Streamnco n'accède qu'aux données publiques de ta chaîne Twitch.",
              },
              {
                q: "Le plan Gratuit est-il vraiment gratuit ?",
                a: "Oui, sans limite de durée. Aucune carte bancaire requise pour démarrer.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-xl border border-white/[0.06] bg-card/30 p-4"
              >
                <p className="mb-1.5 text-sm font-semibold text-foreground">{q}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            Prêt à progresser ?
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Rejoins les streamers qui suivent leur progression et atteignent l'affiliation plus vite.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/auth">Commencer gratuitement</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">Voir les offres Pro</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default PricingPage;
