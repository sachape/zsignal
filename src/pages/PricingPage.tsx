import { useState } from "react";
import { Link } from "react-router-dom";
import { startCheckout } from "@/services/billingService";
import { Loader2, Check, Minus, Mail, ArrowRight, Coins } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCreditPackages, formatPackPrice } from "@/hooks/useCreditPackages";
import { isFeatureEnabled } from "@/lib/featureFlags";
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
      { label: "Clips verticaux 9:16 (facecam + gameplay)", free: false, pro: true, growth: true, agency: true },
      { label: "Sous-titres automatiques + styles", free: false, pro: true, growth: true, agency: true },
      { label: "File de contenu", free: true, pro: true, growth: true, agency: true },
      { label: "Téléchargement clips & visuels", free: true, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Publication",
    rows: [
      { label: "Téléchargement manuel des exports", free: true, pro: true, growth: true, agency: true },
      { label: "Réseaux connectés", free: false, pro: "Standard", growth: "Avancé", agency: "Sur mesure" },
      { label: "Publication Instagram", free: false, pro: "Selon disponibilité", growth: "Selon disponibilité", agency: "Sur mesure" },
      { label: "Publication YouTube", free: false, pro: "Selon disponibilité", growth: "+ stats si dispo", agency: "Sur mesure" },
      { label: "Publication TikTok", free: false, pro: "Selon disponibilité", growth: "Selon disponibilité", agency: "Sur mesure" },
      { label: "Publication X / Threads / Facebook", free: false, pro: "Selon disponibilité", growth: "Selon disponibilité", agency: "Sur mesure" },
      { label: "Publication multi-réseaux", free: false, pro: "Limitée", growth: true, agency: "Sur mesure" },
      { label: "Publications directes / mois", free: "—", pro: "30", growth: "150", agency: "Sur mesure" },
    ],
  },
  {
    group: "Analyse",
    rows: [
      { label: "StreamScore", free: "Basique", pro: "Complet", growth: "Complet", agency: "Sur mesure" },
      { label: "Progression affilié", free: "Basique", pro: "Complète + projections", growth: "Complète + projections", agency: "Complète + projections" },
      { label: "Historique des analyses", free: "30 jours", pro: "90 jours", growth: "Étendu", agency: "Sur devis" },
      { label: "Débriefs après live", free: false, pro: "Standard", growth: "Avancés", agency: "Sur mesure" },
      { label: "Profil public", free: true, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Progression",
    rows: [
      { label: "Plan de la semaine", free: false, pro: true, growth: true, agency: true },
      { label: "Planning optimal", free: false, pro: "Standard", growth: "Avancé", agency: "Sur mesure" },
      { label: "Playbooks", free: false, pro: "Personnalisés", growth: "Complets", agency: "Sur mesure" },
      { label: "Recommandations", free: false, pro: true, growth: "Avancées", agency: "Sur mesure" },
      { label: "Quêtes & badges", free: true, pro: true, growth: true, agency: true },
      { label: "Bibliothèque de ressources", free: false, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Benchmark",
    rows: [
      { label: "Concurrents suivis", free: "3 chaînes", pro: "Essentiel", growth: "Avancé", agency: "Sur mesure" },
      { label: "Classements", free: false, pro: "Aperçu", growth: "Live + général", agency: "Sur mesure" },
      { label: "Watchlist", free: false, pro: false, growth: true, agency: true },
      { label: "Export PNG (share card)", free: false, pro: true, growth: true, agency: true },
    ],
  },
  {
    group: "Comptes & support",
    rows: [
      { label: "Comptes Twitch connectés", free: "1", pro: "1", growth: "Jusqu'à 3", agency: "Sur devis" },
      { label: "Support prioritaire", free: false, pro: false, growth: true, agency: true },
      { label: "Accès anticipé aux intégrations", free: false, pro: false, growth: true, agency: true },
      { label: "Onboarding dédié", free: false, pro: false, growth: false, agency: true },
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
    description: "Pour découvrir Streamnco et créer tes premiers contenus.",
    cta: "Commencer gratuitement",
    highlighted: false,
    features: [
      "Diagnostic Twitch + StreamScore de base",
      "3 visuels et 1 clip par mois",
      "Téléchargement manuel des exports",
      "Sans carte bancaire",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "12,99 €",
    annual: "10,83 €",
    annualTotal: "129,90 €",
    period: "/ mois",
    description: "Pour créer et publier chaque semaine à partir de tes streams.",
    cta: "Passer au Pro",
    highlighted: true,
    badge: "Le plus choisi",
    features: [
      "Tout le plan Gratuit",
      "100 visuels et 30 clips par mois",
      "Clips 9:16, sous-titres, file de contenu",
      "Réseaux connectés + 30 publications directes / mois",
      "Débrief après chaque live, playbooks, planning optimal",
      "Benchmark essentiel + classements en aperçu",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "29,99 €",
    annual: "24,99 €",
    annualTotal: "299,90 €",
    period: "/ mois",
    description: "Pour piloter sérieusement ta création, tes réseaux et ta progression.",
    cta: "Passer au Growth",
    highlighted: false,
    features: [
      "Tout le plan Pro",
      "300 visuels et 200 clips par mois",
      "Jusqu'à 3 chaînes Twitch",
      "Réseaux connectés avancés + 150 publications directes / mois",
      "Benchmark avancé, watchlist, classements live + général",
      "Débriefs avancés, planning et playbooks complets",
      "Support prioritaire + accès anticipé aux intégrations",
    ],
  },
];

const FAQ = [
  {
    q: "Est-ce que je peux utiliser Streamnco sans abonnement ?",
    a: "Oui. Le plan Gratuit permet de tester Streamnco avec un diagnostic Twitch, 3 visuels par mois et 1 clip par mois.",
  },
  {
    q: "Quelle est la différence entre Pro et Growth ?",
    a: "Pro est pensé pour créer et publier chaque semaine. Growth est pensé pour piloter plus sérieusement sa progression, ses réseaux, ses benchmarks et plusieurs chaînes.",
  },
  {
    q: "Est-ce que Streamnco publie directement sur Instagram, YouTube ou TikTok ?",
    a: "Streamnco peut proposer de la publication directe selon les plateformes disponibles dans ton espace. Certaines peuvent être en bêta ou dépendre de leur disponibilité. Tu peux toujours télécharger tes contenus et les publier manuellement.",
  },
  {
    q: "Est-ce que mes générations sont illimitées ?",
    a: "Non. Chaque plan inclut des limites mensuelles pour garantir la qualité du service. Tu peux acheter des StreamCoins en complément si tu as besoin de générations ponctuelles supplémentaires.",
  },
  {
    q: "Est-ce que les StreamCoins remplacent le Pro ?",
    a: "Non. Les StreamCoins servent aux générations ponctuelles. Les plans Pro et Growth débloquent une expérience plus complète, des quotas mensuels plus avantageux, les réseaux connectés et les fonctionnalités de progression.",
  },
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui. Tu peux passer à un plan supérieur ou inférieur à tout moment. Le changement prend effet immédiatement.",
  },
  {
    q: "Comment fonctionne la facturation ?",
    a: "Facturation via Stripe. Aucun engagement, annulable à tout moment depuis ta page Facturation.",
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-el-ink" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-el-muted-soft" />;
  return <span className="text-[13px] font-medium text-el-ink">{value}</span>;
}

const PricingPage = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const paygEnabled = isFeatureEnabled("PAYG_CREDITS_ENABLED");
  const { data: packs = [] } = useCreditPackages(paygEnabled);
  const showStreamCoins = paygEnabled && packs.length > 0;

  usePageMeta({
    title: "Tarifs",
    description:
      "Streamnco — Gratuit, Pro à 12,99€/mois, Growth à 29,99€/mois. Crée tes clips et visuels, publie tes contenus et analyse ta chaîne Twitch.",
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
              Choisis comment tu veux créer, publier et progresser.
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-el-sans text-[17px] leading-[1.6] text-el-body">
              Commence gratuitement, passe Pro quand tu veux publier régulièrement,
              ou utilise Growth pour piloter ta progression plus sérieusement.
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
                    <div className="mt-2 flex items-end gap-1.5">
                      <span className="font-el-display text-[44px] font-light leading-none tracking-[-0.02em]">
                        {showAnnual ? tier.annual : tier.price}
                      </span>
                      <span className={cn("mb-1.5 text-[14px]", featured ? "text-el-on-dark-soft" : "text-el-muted")}>
                        {tier.period}
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
              <p className="font-el-sans text-[18px] font-medium text-el-ink">Agency · Sur devis</p>
              <p className="mt-1 font-el-sans text-[15px] text-el-body">
                Pour agences, managers, collectifs et équipes qui gèrent plusieurs streamers.
                Multi-créateurs, volume custom, réseaux connectés sur mesure, onboarding dédié.
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

      {/* Publication & réseaux connectés */}
      <section className="py-16">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">Publication</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-el-ink">
              Publication et réseaux connectés
            </h2>
            <p className="mt-3 font-el-sans text-[16px] text-el-body">
              Prépare, télécharge ou publie tes contenus depuis Streamnco selon ton plan.
              Publication directe selon disponibilité des plateformes.
            </p>
          </Reveal>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-el-hairline bg-el-card">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-el-hairline">
                  <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.12em] text-el-muted">Publication</th>
                  {["Gratuit", "Pro", "Growth", "Agency"].map((name) => (
                    <th key={name} className="px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-el-ink">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.find((g) => g.group === "Publication")?.rows.map((row) => (
                  <tr key={row.label} className="border-b border-el-hairline last:border-0">
                    <td className="px-6 py-3.5 text-[15px] text-el-body">{row.label}</td>
                    <td className="px-4 py-3.5 text-center"><CellValue value={row.free} /></td>
                    <td className="bg-el-canvas-soft px-4 py-3.5 text-center"><CellValue value={row.pro} /></td>
                    <td className="px-4 py-3.5 text-center"><CellValue value={row.growth} /></td>
                    <td className="px-4 py-3.5 text-center"><CellValue value={row.agency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center font-el-sans text-[13px] text-el-muted">
            Certaines plateformes peuvent être en bêta ou dépendre de leur disponibilité.
            Tu peux toujours télécharger tes contenus et les publier manuellement.
          </p>
        </Container>
      </section>

      {/* StreamCoins — only when flag ON + active packs */}
      {showStreamCoins && (
        <section className="border-t border-el-hairline bg-el-canvas-soft py-16">
          <Container>
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow className="justify-center"><Coins className="h-3.5 w-3.5" /> StreamCoins</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-el-ink">
                Besoin de quelques générations en plus ?
              </h2>
              <p className="mt-3 font-el-sans text-[16px] text-el-body">
                Achète des StreamCoins sans changer d'abonnement. 1 visuel = 120 StreamCoins · 1 clip = 350 StreamCoins.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {packs.map((p) => (
                <div key={p.id} className="relative flex flex-col rounded-2xl border border-el-hairline bg-el-card p-6">
                  {p.badge && (
                    <span className="absolute -top-3 left-6 rounded-full bg-el-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-on-dark">
                      {p.badge}
                    </span>
                  )}
                  <p className="font-el-display text-[28px] font-light leading-none tracking-[-0.02em] text-el-ink">
                    {p.credits.toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-1 font-el-sans text-[13px] uppercase tracking-[0.12em] text-el-muted">StreamCoins</p>
                  {p.description && (
                    <p className="mt-3 font-el-sans text-[14px] text-el-body">{p.description}</p>
                  )}
                  <p className="mt-4 font-el-display text-[22px] font-light tracking-[-0.01em] text-el-ink">
                    {formatPackPrice(p) ?? "—"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center font-el-sans text-[13px] text-el-muted">
              Les StreamCoins servent aux générations ponctuelles. Ils ne remplacent pas les fonctionnalités
              Pro et Growth (réseaux connectés, benchmark avancé, multi-chaînes, support prioritaire).
            </p>
          </Container>
        </section>
      )}

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
                      <tr key={`${group}-${row.label}`} className="border-b border-el-hairline last:border-0">
                        <td className="px-6 py-3.5 text-[15px] text-el-body">{row.label}</td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.free} /></td>
                        <td className="bg-el-canvas-soft px-4 py-3.5 text-center"><CellValue value={row.pro} /></td>
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
