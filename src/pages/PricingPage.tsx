import { useState } from "react";
import { Link } from "react-router-dom";
import { startCheckout } from "@/services/billingService";
import { Loader2, Check, Minus, Mail, ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
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
    group: "Création",
    rows: [
      { label: "Studio visuel (visuels / mois)", free: "3", pro: "100", growth: "300", agency: "Sur mesure" },
      { label: "Clipping (vidéos / mois)", free: "1", pro: "30", growth: "200", agency: "Sur mesure" },
      { label: "Téléchargement clips & visuels", free: true, pro: true, growth: true, agency: true },
      { label: "File de contenu", free: true, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Analyse",
    rows: [
      { label: "StreamScore", free: "1/mois", pro: "Quota Pro", growth: "Quota Growth", agency: "Sur devis" },
      { label: "Progression affilié", free: "Basique", pro: "Complète + projections", growth: "Complète + projections", agency: "Complète + projections" },
      { label: "Historique des analyses", free: "30 jours", pro: "90 jours", growth: "Avancé", agency: "Sur devis" },
      { label: "Profil public", free: true, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Progression",
    rows: [
      { label: "Plan de la semaine", free: false, pro: true, growth: true, agency: true },
      { label: "Quêtes & badges", free: true, pro: true, growth: true, agency: true },
      { label: "Bibliothèque de ressources", free: false, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Benchmark",
    rows: [
      { label: "Concurrents", free: "3 chaînes", pro: "Quota Pro", growth: "Quota Growth", agency: "Sur devis" },
      { label: "Export PNG (share card)", free: false, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Comptes & support",
    rows: [
      { label: "Comptes Twitch connectés", free: "1", pro: "1", growth: "Jusqu'à 3", agency: "Sur devis" },
      { label: "Support prioritaire", free: false, pro: false, growth: true, agency: true },
      { label: "Onboarding dédié", free: false, pro: false, growth: false, agency: true },
      { label: "Accès anticipé aux features", free: false, pro: false, growth: false, agency: true },
    ],
  },
];

interface Tier {
  id: "free" | "pro" | "growth";
  name: string;
  price: string;
  annual?: string;
  annualTotal?: string;
  period: string;
  description: string;
  cta: string;
  highlighted: boolean;
  badge?: string;
  features: string[];
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0 €",
    period: "pour toujours",
    description: "Pour découvrir et commencer à analyser ta chaîne.",
    cta: "Commencer gratuitement",
    highlighted: false,
    features: ["StreamScore instantané", "3 visuels & 1 clip / mois", "Téléchargement des exports", "Sans carte bancaire"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "12,99 €",
    annual: "10,83 €",
    annualTotal: "129,90 €",
    period: "/ mois",
    description: "Tout ce qu'il faut pour progresser semaine après semaine.",
    cta: "Passer au Pro",
    highlighted: true,
    badge: "Le plus choisi",
    features: ["Tout le plan Gratuit", "100 visuels & 30 clips / mois", "Évolution 30 / 60 / 90 jours", "Plan d'action chaque semaine", "Sous-titres, file de contenu, benchmark"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "29,99 €",
    annual: "24,99 €",
    annualTotal: "299,90 €",
    period: "/ mois",
    description: "Pour les streamers sérieux qui pilotent plusieurs chaînes.",
    cta: "Passer au Growth",
    highlighted: false,
    features: ["Tout le plan Pro", "300 visuels & 200 clips / mois", "Jusqu'à 3 chaînes Twitch", "Benchmark & watchlist avancés", "Support prioritaire + accès anticipé"],
  },
];

const FAQ = [
  { q: "Puis-je changer de plan à tout moment ?", a: "Oui. Tu peux passer à un plan supérieur ou inférieur à tout moment. Le changement prend effet immédiatement." },
  { q: "Comment fonctionne la facturation ?", a: "Facturation via Stripe. Aucun engagement, annulable à tout moment depuis la page Facturation." },
  { q: "Mes données sont-elles sécurisées ?", a: "Oui. Toutes les données sont chiffrées et hébergées en Europe. Streamnco n'accède qu'aux données publiques de ta chaîne Twitch." },
  { q: "Le plan Gratuit est-il vraiment gratuit ?", a: "Oui, sans limite de durée. Aucune carte bancaire requise pour démarrer." },
];

function CellValue({ value, featured }: { value: string | boolean; featured?: boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-el-ink" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-el-muted-soft" />;
  return <span className={cn("text-[13px] font-medium", featured ? "text-el-ink" : "text-el-ink")}>{value}</span>;
}

const PricingPage = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  usePageMeta({
    title: "Tarifs",
    description:
      "Streamnco — Gratuit, Pro à 7,99€/mois, Growth à 14,99€/mois. Crée tes clips et visuels de stream, analyse Twitch et progresse.",
    canonical: "https://streamnco.fr/pricing",
    ogUrl: "https://streamnco.fr/pricing",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  });

  // Public marketing pricing page: always show it (no redirect to in-app
  // /billing) so the header "Tarifs" link works for logged-in users too.
  const handleCheckout = async (plan: "pro" | "growth") => {
    if (!user) {
      openAuthModal("signup");
      return;
    }
    setCheckoutLoading(plan);
    try {
      await startCheckout(plan, billing === "annual" ? "annual" : "monthly");
    } catch {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />

      {/* Header */}
      <section className="relative overflow-hidden pt-36 pb-16 md:pt-44">
        <Orb color="bg-el-mint" className="left-1/4 top-10 h-[24rem] w-[24rem] opacity-50" />
        <Orb color="bg-el-peach" className="right-[-6rem] top-24 h-[26rem] w-[26rem] opacity-50" animate="fast" />
        <Container className="relative text-center">
          <Reveal>
            <Eyebrow className="justify-center">Tarifs</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-3xl font-el-display text-[clamp(2rem,5.2vw,3.5rem)] font-light leading-[1.06] tracking-[-0.03em] text-el-ink">
              Commence gratuitement. Évolue à ton rythme.
            </h1>
            <p className="mx-auto mt-5 max-w-lg font-el-sans text-[17px] leading-[1.6] text-el-body">
              Aucune carte bancaire pour démarrer. Passe au niveau supérieur quand tu es prêt.
            </p>
          </Reveal>


          {/* Billing toggle */}
          <Reveal delay={140}>
            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-el-hairline bg-el-card p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-full px-5 py-2 font-el-sans text-[14px] font-medium transition-colors",
                  billing === "monthly" ? "bg-el-ink text-el-on-dark" : "text-el-body hover:text-el-ink",
                )}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 font-el-sans text-[14px] font-medium transition-colors",
                  billing === "annual" ? "bg-el-ink text-el-on-dark" : "text-el-body hover:text-el-ink",
                )}
              >
                Annuel
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", billing === "annual" ? "bg-el-on-dark text-el-ink" : "bg-el-strong text-el-ink")}>
                  2 mois offerts
                </span>
              </button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Tier cards */}
      <section className="pb-8">
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            {TIERS.map((tier, i) => {
              const featured = tier.highlighted;
              const showAnnual = billing === "annual" && tier.annual;
              return (
                <Reveal key={tier.id} delay={i * 90}>
                  <div
                    className={cn(
                      "relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300",
                      featured
                        ? "bg-el-dark text-el-on-dark shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] md:-translate-y-2"
                        : "border border-el-hairline bg-el-card text-el-ink hover:-translate-y-1 hover:border-el-hairline-strong hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.2)]",
                    )}
                  >
                    {tier.badge && (
                      <span className="absolute -top-3 left-8 rounded-full bg-el-on-dark px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-ink">
                        {tier.badge}
                      </span>
                    )}
                    <p className="font-el-sans text-[15px] font-medium">{tier.name}</p>
                </span>
              </button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Tier cards */}
      <section className="pb-8">
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            {TIERS.map((tier, i) => {
              const featured = tier.highlighted;
              const showAnnual = billing === "annual" && tier.annual;
              return (
                <Reveal key={tier.id} delay={i * 90}>
                  <div
                    className={cn(
                      "relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300",
                      featured
                        ? "bg-el-dark text-el-on-dark shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] md:-translate-y-2"
                        : "border border-el-hairline bg-el-card text-el-ink hover:-translate-y-1 hover:border-el-hairline-strong hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.2)]",
                    )}
                  >
                    {tier.badge && (
                      <span className="absolute -top-3 left-8 rounded-full bg-el-on-dark px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-ink">
                        {tier.badge}
                      </span>
                    )}
                    <p className="font-el-sans text-[15px] font-medium">{tier.name}</p>
                    {FOUNDING_MEMBER && tier.id !== "free" && (
                      <p className={cn("mt-1 text-[13px] line-through", featured ? "text-el-on-dark-soft" : "text-el-muted-soft")}>
                        {tier.id === "pro" ? PRO_FUTURE.toFixed(2).replace(".", ",") : GROWTH_FUTURE.toFixed(2).replace(".", ",")} € / mois
                      </p>
                    )}
                    <div className="mt-2 flex items-end gap-1.5">
                      <span className="font-el-display text-[44px] font-light leading-none tracking-[-0.02em]">
                        {showAnnual ? tier.annual : tier.price}
                      </span>
                      <span className={cn("mb-1.5 text-[14px]", featured ? "text-el-on-dark-soft" : "text-el-muted")}>
                        {tier.id === "free" ? tier.period : tier.period}
                      </span>
                    </div>
                    {showAnnual && tier.annualTotal && (
                      <p className={cn("mt-1 text-[13px]", featured ? "text-el-on-dark-soft" : "text-el-muted")}>
                        Facturé {tier.annualTotal} / an
                      </p>
                    )}
                    <p className={cn("mt-3 text-[14px] leading-relaxed", featured ? "text-el-on-dark-soft" : "text-el-body")}>
                      {tier.description}
                    </p>

                    {tier.id === "free" ? (
                      <button
                        onClick={() => openAuthModal("signup")}
                        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-el-ink font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft"
                      >
                        {tier.cta}
                      </button>
                    ) : (
                      <button
                        disabled={checkoutLoading !== null}
                        onClick={() => handleCheckout(tier.id as "pro" | "growth")}
                        className={cn(
                          "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full font-el-sans text-[15px] font-medium transition-opacity disabled:opacity-60",
                          featured ? "bg-el-on-dark text-el-ink hover:opacity-90" : "bg-el-ink text-el-on-dark hover:opacity-90",
                        )}
                      >
                        {checkoutLoading === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : tier.cta}
                      </button>
                    )}

                    <ul className="mt-7 space-y-3">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-el-mint" : "text-el-ink")} />
                          <span className={cn("font-el-sans text-[15px] leading-snug", featured ? "text-el-on-dark-soft" : "text-el-body")}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Agency band */}
          <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-el-hairline bg-el-card p-7 sm:flex-row sm:items-center">
            <div>
              <p className="font-el-sans text-[18px] font-medium text-el-ink">Agency</p>
              <p className="mt-1 font-el-sans text-[15px] text-el-body">
                Tu gères plusieurs streamers ? Volume sur devis, onboarding dédié et accès anticipé.
              </p>
            </div>
            <a
              href="mailto:contact@streamnco.fr"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-el-hairline-strong px-5 font-el-sans text-[15px] font-medium text-el-ink transition-colors hover:bg-el-strong"
            >
              <Mail className="h-4 w-4" /> Nous contacter
            </a>
          </div>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="py-16">
        <Container>
          <Reveal>
            <h2 className="text-center font-el-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-el-ink">
              Comparer les plans en détail
            </h2>
            <p className="mt-2 text-center font-el-sans text-[13px] text-el-muted md:hidden">
              Fais défiler le tableau horizontalement →
            </p>
          </Reveal>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-el-hairline bg-el-card md:mt-10">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-el-hairline">
                  <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-el-muted">Fonctionnalités</th>
                  {["Gratuit", "Pro", "Growth", "Agency"].map((name) => (
                    <th key={name} className="px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-el-ink">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(({ group, rows }) => (
                  <>
                    <tr key={group}>
                      <td colSpan={5} className="bg-el-strong px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-el-muted">
                        {group}
                      </td>
                    </tr>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-b border-el-hairline last:border-0">
                        <td className="px-6 py-3.5 text-[15px] text-el-body">{row.label}</td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.free} /></td>
                        <td className="bg-el-canvas-soft px-4 py-3.5 text-center"><CellValue value={row.pro} featured /></td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.growth} /></td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.agency} /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-el-hairline bg-el-canvas-soft py-20">
        <Container className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(1.8rem,3.5vw,2.25rem)] font-light tracking-[-0.02em] text-el-ink">
              Encore une hésitation ?
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="divide-y divide-el-hairline border-t border-el-hairline">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-el-sans text-[17px] font-medium text-el-ink">
                    {item.q}
                    <span className="text-el-muted transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-3 font-el-sans text-[15px] leading-[1.65] text-el-body">{item.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-el-dark py-24">
        <Orb color="bg-el-lavender" className="left-[-6rem] top-0 h-[24rem] w-[24rem] opacity-30" />
        <Container className="relative text-center">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-el-display text-[clamp(2rem,4vw,3rem)] font-light leading-[1.08] tracking-[-0.02em] text-el-on-dark">
              Prêt à transformer tes lives en croissance ?
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => openAuthModal("signup")}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-el-on-dark px-7 font-el-sans text-[16px] font-medium text-el-ink transition-opacity hover:opacity-90"
              >
                Créer mon compte gratuit <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/"
                className="inline-flex h-12 items-center rounded-full border border-el-on-dark-soft/40 px-7 font-el-sans text-[16px] font-medium text-el-on-dark transition-colors hover:bg-white/10"
              >
                Découvrir Streamnco
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <SiteFooter />
    </div>
  );
};

export default PricingPage;
