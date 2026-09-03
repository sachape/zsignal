import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, ListChecks, Target } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthModal } from "@/contexts/AuthModalContext";

const HeroScoreRing = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = 70;
  const circ = 2 * Math.PI * r;
  return (
    <div ref={ref} className="relative h-44 w-44">
      <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="7" className="stroke-el-hairline" />
        <motion.circle
          cx="90" cy="90" r={r} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-el-ink"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={inView ? { strokeDashoffset: circ * 0.26 } : {}}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-el-display text-[44px] font-light tabular-nums text-el-ink">74</span>
        <span className="mt-1 font-el-sans text-[9px] font-semibold uppercase tracking-widest text-el-muted">StreamScore</span>
      </div>
    </div>
  );
};

const DimensionBar = ({ label, val, weight, delay }: { label: string; val: number; weight: string; delay: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-el-sans text-[15px] font-medium text-el-ink">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-el-sans text-[13px] font-semibold tabular-nums text-el-ink">{val}/100</span>
          <span className="rounded-full bg-el-strong px-2 py-0.5 font-el-sans text-[11px] font-bold text-el-ink">{weight}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-el-strong">
        <motion.div className="h-full rounded-full bg-el-ink" initial={{ width: 0 }} animate={inView ? { width: `${val}%` } : {}} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay }} />
      </div>
    </div>
  );
};

const StatCounter = ({ value, suffix, label }: { value: string; suffix: string; label: string }) => (
  <div className="text-center">
    <div className="font-el-display text-[clamp(2rem,4vw,3rem)] font-light tabular-nums text-el-ink">{value}{suffix}</div>
    <p className="mt-1.5 font-el-sans text-[14px] text-el-muted">{label}</p>
  </div>
);

const DIMENSIONS = [
  { label: "Régularité", val: 82, weight: "25%" },
  { label: "Structure", val: 65, weight: "20%" },
  { label: "Contenu", val: 38, weight: "20%" },
  { label: "Positionnement", val: 91, weight: "15%" },
  { label: "Momentum", val: 55, weight: "10%" },
  { label: "Monétisation", val: 44, weight: "10%" },
];

const PRINCIPLES = [
  { icon: Activity, tint: "bg-el-mint", label: "Un score, pas des stats", body: "Les autres outils te donnent des chiffres. Streamnco te dit ce qu'ils signifient — et exactement quoi corriger en priorité." },
  { icon: Target, tint: "bg-el-peach", label: "Un blocage, pas une liste", body: "Pas 15 recommandations génériques. Un frein principal identifié, avec le levier le plus impactant à actionner cette semaine." },
  { icon: ListChecks, tint: "bg-el-lavender", label: "Un plan, pas des conseils", body: "Chaque analyse génère un plan hebdomadaire concret, personnalisé selon ton profil — et vérifié après chaque live." },
];

const AUDIENCE = [
  { emoji: "🌱", tag: "Le Débutant", body: "Pose les bonnes bases dès le départ et évite les erreurs classiques." },
  { emoji: "📈", tag: "Le Régulier", body: "Comprend pourquoi son audience stagne malgré ses efforts constants." },
  { emoji: "🎯", tag: "L'Ambitieux", body: "Décide avec des données précises pour atteindre l'affiliation." },
  { emoji: "🏢", tag: "Le Manager", body: "Suit plusieurs chaînes depuis un seul espace centralisé." },
];

const AboutPage = () => {
  const { openAuthModal } = useAuthModal();

  usePageMeta({
    title: "À propos de Streamnco — Outil de progression pour streamers Twitch",
    description: "Streamnco est un outil d'analyse et de progression pour streamers Twitch. Il calcule un StreamScore, identifie les points faibles et génère un plan d'action concret.",
    canonical: "https://streamnco.fr/a-propos",
    ogUrl: "https://streamnco.fr/a-propos",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
          <Orb color="bg-el-lavender" className="left-1/4 top-12 h-[26rem] w-[26rem] opacity-50" />
          <Orb color="bg-el-peach" className="right-[-6rem] top-24 h-[24rem] w-[24rem] opacity-50" animate="fast" />
          <Container className="relative text-center">
            <Reveal>
              <Eyebrow className="justify-center">À propos</Eyebrow>
              <h1 className="mx-auto mt-5 max-w-2xl font-el-display text-[clamp(2rem,5.5vw,4rem)] font-light leading-[1.05] tracking-[-0.03em] text-el-ink">
                À propos de Streamnco
              </h1>
            </Reveal>
            <Reveal delay={120} className="relative mt-10 flex justify-center">
              <Orb color="bg-el-mint" className="left-1/2 top-1/2 h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 opacity-60" />
              <div className="relative">
                <HeroScoreRing />
              </div>
            </Reveal>
            <Reveal delay={200} className="mx-auto mt-10 max-w-2xl space-y-4 text-left font-el-sans text-[17px] leading-[1.65] text-el-body">
              <p>Streamnco est un outil d'analyse et de progression pour streamers Twitch.</p>
              <p>La plateforme analyse une chaîne, calcule un <span className="text-el-ink">StreamScore</span>, identifie les points faibles et génère un plan d'action concret pour aider les streamers à progresser.</p>
              <p>Streamnco s'adresse aux streamers francophones qui veulent mieux comprendre leur contenu, leur régularité, leur visibilité et leur potentiel de croissance.</p>
            </Reveal>
          </Container>
        </section>

        {/* Stats */}
        <section className="border-y border-el-hairline bg-el-canvas-soft py-12">
          <Container className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <StatCounter value="8 000" suffix="+" label="chaînes analysées" />
            <StatCounter value="6" suffix="" label="dimensions mesurées" />
            <StatCounter value="60" suffix=" s" label="diagnostic complet" />
            <StatCounter value="4,8" suffix=" / 5" label="satisfaction moyenne" />
          </Container>
        </section>

        {/* Méthodologie */}
        <section className="py-20 md:py-28">
          <Container className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <Eyebrow>Méthodologie</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">Comment fonctionne le StreamScore ?</h2>
              <p className="mt-4 font-el-sans text-[16px] leading-[1.6] text-el-body">
                Le StreamScore est un indicateur composite sur 100. Il mesure la qualité d'exécution de la chaîne — pas sa popularité. Chaque dimension est pondérée selon son impact réel sur la croissance.
              </p>
              <p className="mt-3 font-el-sans text-[16px] leading-[1.6] text-el-body">
                La formule est transparente : chaque dimension a ses signaux, ses raisons et ses leviers. Quand un signal manque, la dimension est neutralisée plutôt qu'artificiellement gonflée.
              </p>
            </Reveal>
            <Reveal delay={100} className="space-y-4 rounded-2xl border border-el-hairline bg-el-card p-7">
              {DIMENSIONS.map((d, i) => (
                <DimensionBar key={d.label} label={d.label} val={d.val} weight={d.weight} delay={i * 0.1} />
              ))}
            </Reveal>
          </Container>
        </section>

        {/* Philosophie */}
        <section className="border-t border-el-hairline bg-el-canvas-soft py-20 md:py-28">
          <Container>
            <Reveal className="mb-12 text-center">
              <h2 className="font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light tracking-[-0.02em] text-el-ink">La philosophie du produit</h2>
              <p className="mx-auto mt-3 max-w-md font-el-sans text-[16px] text-el-body">Trois principes qui guident chaque décision.</p>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {PRINCIPLES.map((p, i) => (
                <Reveal key={p.label} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-el-hairline bg-el-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-el-hairline-strong hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.2)]">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${p.tint} text-el-ink`}><p.icon className="h-5 w-5" /></span>
                    <p className="mt-4 font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-muted">Principe</p>
                    <h3 className="mt-1 font-el-sans text-[18px] font-medium text-el-ink">{p.label}</h3>
                    <p className="mt-2 font-el-sans text-[15px] leading-[1.6] text-el-body">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Audience */}
        <section className="py-20 md:py-28">
          <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <Reveal>
              <Eyebrow>Audience</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">À qui s'adresse Streamnco ?</h2>
              <p className="mt-4 font-el-sans text-[16px] leading-[1.6] text-el-body">
                Streamnco est conçu pour les <span className="text-el-ink">streamers francophones</span> — qu'ils débutent ou qu'ils aient déjà une audience établie.
              </p>
            </Reveal>
            <Reveal delay={100} className="grid grid-cols-2 gap-3">
              {AUDIENCE.map((p) => (
                <div key={p.tag} className="rounded-2xl border border-el-hairline bg-el-card p-5">
                  <span className="text-2xl">{p.emoji}</span>
                  <p className="mt-3 font-el-sans text-[15px] font-medium text-el-ink">{p.tag}</p>
                  <p className="mt-1 font-el-sans text-[13px] leading-[1.55] text-el-body">{p.body}</p>
                </div>
              ))}
            </Reveal>
          </Container>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-el-dark py-24">
          <Orb color="bg-el-sky" className="left-[-6rem] top-0 h-[24rem] w-[24rem] opacity-25" />
          <Container className="relative text-center">
            <Reveal>
              <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-el-on-dark-soft">Gratuit · sans compte</p>
              <h2 className="mx-auto mt-3 max-w-2xl font-el-display text-[clamp(2.2rem,4.5vw,3.25rem)] font-light leading-[1.08] tracking-[-0.02em] text-el-on-dark">
                Découvre ton StreamScore
              </h2>
              <p className="mx-auto mt-4 max-w-md font-el-sans text-[17px] leading-[1.6] text-el-on-dark-soft">
                Entre ton pseudo Twitch. En 60 secondes tu as ton score, ton blocage principal et ton premier plan d'action.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => openAuthModal("signup")} className="inline-flex h-12 items-center gap-2 rounded-full bg-el-on-dark px-7 font-el-sans text-[16px] font-medium text-el-ink transition-opacity hover:opacity-90">
                  Essayer gratuitement <ArrowRight className="h-4 w-4" />
                </button>
                <Link to="/fonctionnalites" className="inline-flex h-12 items-center rounded-full border border-el-on-dark-soft/40 px-7 font-el-sans text-[16px] font-medium text-el-on-dark transition-colors hover:bg-white/10">
                  Voir les fonctionnalités
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

export default AboutPage;
