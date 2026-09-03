import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Coins, Image as ImageIcon, Video as VideoIcon, Sparkles } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

// StreamCoins packs shown publicly on /pricing (marketing only).
// Purchase happens inside the connected product (/billing) via Stripe.
// Estimations map to backend costs: 1 visuel = 120 SC, 1 clip = 350 SC.
const STREAMCOIN_PACKS = [
  { id: "pack_1200", credits: 1200, price: "12 €", description: "Pour quelques générations en plus.", visuals: 10, clips: 3 },
  { id: "pack_3000", credits: 3000, price: "27 €", description: "Pour une semaine bien chargée.", badge: "Populaire", visuals: 25, clips: 8 },
  { id: "pack_7000", credits: 7000, price: "59 €", description: "Pour un mois sans te poser de questions.", visuals: 58, clips: 20 },
  { id: "pack_16000", credits: 16000, price: "129 €", description: "Pour les gros volumes ponctuels.", visuals: 133, clips: 45 },
];

// New 6-question FAQ aligned with the pivot.
const FAQ = [
  {
    q: "Est-ce que je peux utiliser Streamnco sans abonnement ?",
    a: "Oui. Tu peux créer un compte gratuitement et acheter des StreamCoins uniquement quand tu veux générer des clips ou des visuels.",
  },
  {
    q: "À quoi servent les StreamCoins ?",
    a: "Les StreamCoins servent à générer des clips et des visuels à la demande. 1 clip coûte 350 StreamCoins, 1 visuel coûte 120 StreamCoins.",
  },
  {
    q: "À quoi sert Pro ?",
    a: "Pro débloque les outils avancés pour suivre ta progression : StreamScore complet, benchmark, classements, calendrier optimal, débriefs après live, playbooks, historique et recommandations.",
  },
  {
    q: "Est-ce que Pro inclut des générations ?",
    a: "Les générations fonctionnent avec les StreamCoins. Pro te donne accès aux features avancées de progression et te fait bénéficier de +20% de StreamCoins sur chaque recharge.",
  },
  {
    q: "Est-ce que je peux télécharger mes contenus ?",
    a: "Oui. Les clips et visuels générés sont téléchargeables directement depuis Streamnco.",
  },
  {
    q: "Est-ce que Streamnco publie directement sur les réseaux ?",
    a: "Pour le moment, Streamnco se concentre sur la création, le téléchargement et le suivi de progression.",
  },
];

const PricingPage = () => {
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  usePageMeta({
    title: "Tarifs — Streamnco",
    description:
      "Streamnco est gratuit pour créer un compte. Recharge en StreamCoins pour générer clips et visuels, ou passe Pro à 9,99€/mois pour débloquer les outils de progression avancés.",
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

  // Public marketing CTAs never trigger Stripe directly.
  // Visitors → /auth (with plan intent); logged-in users → /billing.
  const signupHref = "/auth";
  const proHref = user ? "/billing" : "/auth?plan=pro";
  const streamcoinsHref = user ? "/billing" : "/auth?intent=streamcoins";

  const proPriceMonthly = "9,99 €";
  const proPriceAnnualPerMonth = "8,33 €";
  const proAnnualTotal = "99,90 €";

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />
      <main>
        {/* Header */}
        <section className="relative overflow-hidden pt-36 pb-14 md:pt-44">
          <Orb color="bg-el-mint" className="left-1/4 top-10 h-[24rem] w-[24rem] opacity-50" />
          <Orb color="bg-el-peach" className="right-[-6rem] top-24 h-[26rem] w-[26rem] opacity-50" animate="fast" />
          <Container className="relative text-center">
            <Reveal>
              <Eyebrow className="justify-center">Tarifs</Eyebrow>
              <h1 className="mx-auto mt-5 max-w-3xl font-el-display text-[clamp(2rem,5.2vw,3.5rem)] font-light leading-[1.06] tracking-[-0.03em] text-el-ink">
                Génère à la demande. Passe Pro pour progresser.
              </h1>
              <p className="mx-auto mt-5 max-w-xl font-el-sans text-[17px] leading-[1.6] text-el-body">
                Compte gratuit, StreamCoins à la carte pour générer clips et visuels, et une seule offre Pro pour débloquer les outils de progression sérieuse.
              </p>
            </Reveal>

            {/* Billing toggle (applies to Pro card) */}
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
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      billing === "annual" ? "bg-el-on-dark text-el-ink" : "bg-el-strong text-el-ink",
                    )}
                  >
                    2 mois offerts
                  </span>
                </button>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* Two tiers: À la carte + Pro */}
        <section className="pb-16">
          <Container>
            <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
              {/* À la carte */}
              <Reveal>
                <div className="relative flex h-full flex-col rounded-2xl border border-el-hairline bg-el-card p-8 text-el-ink transition-all duration-300 hover:-translate-y-1 hover:border-el-hairline-strong hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.2)]">
                  <p className="font-el-sans text-[15px] font-medium">À la carte</p>
                  <div className="mt-2 flex items-end gap-1.5">
                    <span className="font-el-display text-[44px] font-light leading-none tracking-[-0.02em]">
                      Gratuit
                    </span>
                    <span className="mb-1.5 text-[14px] text-el-muted">pour commencer</span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-el-body">
                    Crée un compte gratuitement, puis recharge en StreamCoins quand tu veux générer.
                  </p>

                  <Link
                    to={signupHref}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-el-ink font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft"
                  >
                    Créer un compte
                  </Link>

                  <ul className="mt-7 space-y-3">
                    {[
                      "Compte gratuit, sans carte bancaire",
                      "Diagnostic Twitch de base",
                      "Achat de StreamCoins à la demande",
                      "Génération de clips avec StreamCoins",
                      "Génération de visuels avec StreamCoins",
                      "Téléchargement des exports",
                      "Sans abonnement, sans engagement",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-el-ink" />
                        <span className="font-el-sans text-[15px] leading-snug text-el-body">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              {/* Pro */}
              <Reveal delay={90}>
                <div className="relative flex h-full flex-col rounded-2xl bg-el-dark p-8 text-el-on-dark shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] md:-translate-y-2">
                  <span className="absolute -top-3 left-8 rounded-full bg-el-on-dark px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-ink">
                    Pour progresser
                  </span>
                  <p className="font-el-sans text-[15px] font-medium">Pro</p>
                  <div className="mt-2 flex items-end gap-1.5">
                    <span className="font-el-display text-[44px] font-light leading-none tracking-[-0.02em]">
                      {billing === "annual" ? proPriceAnnualPerMonth : proPriceMonthly}
                    </span>
                    <span className="mb-1.5 text-[14px] text-el-on-dark-soft">/ mois</span>
                  </div>
                  {billing === "annual" && (
                    <p className="mt-1 text-[13px] text-el-on-dark-soft">
                      Facturé {proAnnualTotal} / an
                    </p>
                  )}
                  <p className="mt-3 text-[14px] leading-relaxed text-el-on-dark-soft">
                    Pour suivre ta progression et savoir quoi améliorer stream après stream.
                  </p>

                  <Link
                    to={proHref}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-el-on-dark font-el-sans text-[15px] font-medium text-el-ink transition-opacity hover:opacity-90"
                  >
                    Passer Pro
                  </Link>

                  <ul className="mt-7 space-y-3">
                    {[
                      "Tout le mode À la carte",
                      "StreamScore complet",
                      "Débrief après chaque live",
                      "Historique des lives avancé",
                      "Calendrier optimal",
                      "Benchmark",
                      "Classements",
                      "Playbooks",
                      "Recommandations avancées",
                      "Suivi de progression avancé",
                      "Bonus +20% StreamCoins sur chaque recharge",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-el-mint" />
                        <span className="font-el-sans text-[15px] leading-snug text-el-on-dark-soft">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            <p className="mt-6 text-center font-el-sans text-[13px] text-el-muted">
              À la carte : je recharge en StreamCoins pour créer. Pro : je débloque les outils pour progresser.
            </p>
          </Container>
        </section>

        {/* StreamCoins packs */}
        <section className="border-t border-el-hairline bg-el-canvas-soft py-16">
          <Container>
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow className="justify-center">
                <Coins className="h-3.5 w-3.5" /> StreamCoins
              </Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-el-ink">
                Recharge quand tu veux, sans abonnement
              </h2>
              <p className="mt-3 font-el-sans text-[17px] text-el-body">
                Les StreamCoins servent à générer des clips et des visuels à la demande.
              </p>
              <p className="mt-2 font-el-sans text-[14px] text-el-muted">
                1 visuel ≈ 120 StreamCoins · 1 clip ≈ 350 StreamCoins
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STREAMCOIN_PACKS.map((p) => (
                <div key={p.id} className="relative flex flex-col rounded-2xl border border-el-hairline bg-el-card p-6">
                  {p.badge && (
                    <span className="absolute -top-3 left-6 rounded-full bg-el-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-on-dark">
                      {p.badge}
                    </span>
                  )}
                  <p className="font-el-display text-[28px] font-light leading-none tracking-[-0.02em] text-el-ink">
                    {p.credits.toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-1 font-el-sans text-[13px] uppercase tracking-[0.12em] text-el-muted">
                    StreamCoins
                  </p>
                  <p className="mt-3 font-el-sans text-[14px] text-el-body">{p.description}</p>
                  <div className="mt-4">
                    <p className="mb-2 font-el-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-el-muted">
                      Utilisation estimée
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-el-hairline bg-el-strong px-2.5 py-1 text-[12px] font-medium text-el-ink">
                        <ImageIcon className="h-3 w-3 text-el-muted" />
                        ≈ {p.visuals} visuels
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-el-hairline bg-el-strong px-2.5 py-1 text-[12px] font-medium text-el-ink">
                        <VideoIcon className="h-3 w-3 text-el-muted" />
                        ≈ {p.clips} clips
                      </span>
                    </div>
                  </div>
                  <p className="mt-5 font-el-display text-[22px] font-light tracking-[-0.01em] text-el-ink">
                    {p.price}
                  </p>
                </div>
              ))}
            </div>

            {/* Pro bonus band — visible marketing promise, activated in a later pass */}
            <Reveal delay={80}>
              <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-el-hairline bg-el-card p-7 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-el-ink" />
                  <div>
                    <p className="font-el-sans text-[17px] font-medium text-el-ink">
                      Tu génères régulièrement ? Passe Pro.
                    </p>
                    <p className="mt-1 font-el-sans text-[14px] text-el-body">
                      Les membres Pro reçoivent <strong>+20% de StreamCoins</strong> sur chaque recharge.
                    </p>
                  </div>
                </div>
                <Link
                  to={proHref}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-el-ink px-5 font-el-sans text-[15px] font-medium text-el-on-dark transition-opacity hover:opacity-90"
                >
                  Découvrir Pro <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                to={streamcoinsHref}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-el-hairline-strong px-6 font-el-sans text-[15px] font-medium text-el-ink transition-colors hover:bg-el-strong"
              >
                {user ? "Recharger mes StreamCoins" : "Créer un compte pour recharger"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-center font-el-sans text-[13px] text-el-muted">
                Top-up ponctuel — pas d'abonnement requis pour acheter des StreamCoins.
              </p>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="border-t border-el-hairline bg-el-canvas py-20">
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
                Transforme tes streams en contenus. Suis ta progression.
              </h2>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={signupHref}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-el-on-dark px-7 font-el-sans text-[16px] font-medium text-el-ink transition-opacity hover:opacity-90"
                >
                  Créer gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
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

      </main>

      <SiteFooter />
    </div>
  );
};

export default PricingPage;
