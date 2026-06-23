import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clapperboard, ListChecks, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthModal } from "@/contexts/AuthModalContext";

// ── Scroll word reveal ────────────────────────────────────────────────────────
const WordReveal = ({ text, className = "" }: { text: string; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const words = text.split(" ");
  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

// ── Animated score ring (large) ───────────────────────────────────────────────
const HeroScoreRing = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = 70; const circ = 2 * Math.PI * r;
  return (
    <div ref={ref} className="relative h-44 w-44">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/20 blur-3xl" />
      <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="aboutRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary)/0.3)" />
          </linearGradient>
          <filter id="aboutGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="hsl(var(--border)/0.2)" strokeWidth="7" />
        <motion.circle
          cx="90" cy="90" r={r} fill="none"
          stroke="url(#aboutRingGrad)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={inView ? { strokeDashoffset: circ * 0.26 } : {}}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          filter="url(#aboutGlow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold tabular-nums text-foreground"
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1 }}
        >74</motion.span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">StreamScore</span>
      </div>
    </div>
  );
};

// ── Floating card component ───────────────────────────────────────────────────
const FloatCard = ({ children, delay = 0, duration = 7, className = "" }: {
  children: React.ReactNode; delay?: number; duration?: number; className?: string;
}) => (
  <motion.div
    className={className}
    animate={{ y: [0, -12, 0] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
  >
    {children}
  </motion.div>
);

// ── Animated dimension bars ───────────────────────────────────────────────────
const DimensionBar = ({ label, val, weight, delay }: {
  label: string; val: number; weight: string; delay: number;
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const color = val >= 70 ? "bg-emerald-400" : val >= 45 ? "bg-primary" : "bg-warning";
  return (
    <div ref={ref} className="group">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground group-hover:text-primary-strong transition-colors">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tabular-nums text-foreground">{val}/100</span>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-strong">{weight}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={inView ? { width: `${val}%` } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay }}
        />
      </div>
    </div>
  );
};

// ── Stats counter ─────────────────────────────────────────────────────────────
const StatCounter = ({ value, suffix, label, delay }: {
  value: number; suffix: string; label: string; delay: number;
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-bold tabular-nums text-foreground md:text-5xl">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay, duration: 0.5 }}
        >
          {value.toLocaleString("fr-FR")}{suffix}
        </motion.span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground/70">{label}</p>
    </div>
  );
};

const DIMENSIONS = [
  { label: "Régularité", val: 82, weight: "25%", desc: "Fréquence et cohérence du planning de stream" },
  { label: "Structure", val: 65, weight: "20%", desc: "Durée et volume total des sessions" },
  { label: "Contenu", val: 38, weight: "20%", desc: "Production de clips et VOD exploitables" },
  { label: "Positionnement", val: 91, weight: "15%", desc: "Stabilité de la catégorie principale" },
  { label: "Momentum", val: 55, weight: "10%", desc: "Activité et engagement sur les 7 derniers jours" },
  { label: "Monétisation", val: 44, weight: "10%", desc: "Progression vers les critères d'affiliation Twitch" },
];

const AboutPage = () => {
  const { openAuthModal } = useAuthModal();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  usePageMeta({
    title: "À propos de Streamnco — Outil de progression pour streamers Twitch",
    description: "Streamnco est un outil d'analyse et de progression pour streamers Twitch. Il calcule un StreamScore, identifie les points faibles et génère un plan d'action concret.",
    canonical: "https://streamnco.fr/a-propos",
    ogUrl: "https://streamnco.fr/a-propos",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO — parallax + floating cards + large score ring                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden pt-32 pb-24 md:pt-44 md:pb-32">
        {/* Layered atmosphere */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[42rem] w-[58rem] -translate-x-1/2 landing-aurora" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.035)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-50" />

        {/* Ambient orbs */}
        <motion.div
          className="pointer-events-none absolute left-[15%] top-[30%] h-64 w-64 rounded-full bg-primary/8 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-[10%] top-[20%] h-48 w-48 rounded-full bg-primary/6 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        {/* Floating product cards */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          {/* LEFT — Blocage card */}
          <FloatCard delay={0.5} duration={7} className="pointer-events-none absolute left-[5%] top-[32%] hidden lg:block xl:left-[9%]">
            <div className="w-[210px] rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/15">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-foreground/50">Blocage #1</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-foreground">Régularité trop instable</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">Créneaux instables sur 30 jours</p>
            </div>
          </FloatCard>

          {/* RIGHT — Plan card */}
          <FloatCard delay={1} duration={8} className="pointer-events-none absolute right-[5%] top-[28%] hidden lg:block xl:right-[9%]">
            <div className="w-[220px] rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <ListChecks className="h-3.5 w-3.5 text-primary-strong" />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-foreground/50">Plan d'action</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-[11px]">
                {["Fixer 2 créneaux récurrents", "Créer 1 clip par live", "Cibler 1 catégorie pivot"].map((s, i) => (
                  <li key={s} className="flex items-start gap-1.5 text-foreground/85">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary-strong" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </FloatCard>

          {/* BOTTOM RIGHT — Score delta */}
          <FloatCard delay={0.2} duration={9} className="pointer-events-none absolute right-[8%] top-[65%] hidden lg:block xl:right-[12%]">
            <div className="rounded-2xl border border-white/10 bg-card/70 p-3.5 backdrop-blur-xl shadow-lg">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">Progression</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">+18</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-400 font-semibold">pts ce mois</span>
                  <span className="text-[9px] text-muted-foreground/50">41 → 59</span>
                </div>
              </div>
            </div>
          </FloatCard>
        </motion.div>

        {/* Center content */}
        <div className="container relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-strong shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
              <Sparkles className="h-3 w-3" /> À propos
            </span>

            <h1 className="font-display mx-auto mt-5 max-w-2xl bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-[3.5rem] md:leading-[1.08]">
              À propos de Streamnco
            </h1>
          </motion.div>

          {/* Score ring */}
          <motion.div
            className="mt-10 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            <HeroScoreRing />
          </motion.div>

          {/* Required text content */}
          <motion.div
            className="mx-auto mt-10 max-w-2xl space-y-4 text-left text-base leading-relaxed text-foreground/70 md:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <p>Streamnco est un outil d'analyse et de progression pour streamers Twitch.</p>
            <p>
              La plateforme analyse une chaîne Twitch, calcule un{" "}
              <span className="font-semibold text-foreground">StreamScore</span>, identifie les points faibles et génère un plan d'action concret pour aider les streamers à progresser.
            </p>
            <p>
              Streamnco s'adresse aux streamers francophones qui veulent mieux comprendre leur contenu, leur régularité, leur visibilité et leur potentiel de croissance.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STATS STRIP                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative border-y border-white/[0.05] bg-muted/[0.03] py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_65%)]" />
        <div className="container relative mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <StatCounter value={8000} suffix="+" label="chaînes analysées" delay={0} />
            <StatCounter value={6} suffix="" label="dimensions mesurées" delay={0.1} />
            <StatCounter value={60} suffix=" s" label="diagnostic complet" delay={0.2} />
            <StatCounter value={48} suffix="/5" label="satisfaction moyenne" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SCROLLING MARQUEE — continuous horizontal text                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-white/[0.04] py-5">
        <motion.div
          className="flex gap-12 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/25"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 2 }).map((_, j) => (
            <span key={j} className="flex gap-12">
              {["StreamScore", "Régularité", "Structure", "Contenu", "Positionnement", "Momentum", "Monétisation", "Plan d'action", "Affiliation", "Benchmark", "Clips Analytics", "Score Live"].map((t) => (
                <span key={t} className="flex items-center gap-3">
                  {t}
                  <span className="h-1 w-1 rounded-full bg-primary/30" />
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STREAMSCORE — animated dimension bars                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_right,hsl(var(--primary)/0.06),transparent_55%)]" />
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            {/* Left — text */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-strong">
                Méthodologie
              </span>
              <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
                <WordReveal text="Comment fonctionne le StreamScore ?" />
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Le StreamScore est un indicateur composite sur 100. Il mesure la qualité d'exécution de la chaîne — pas sa popularité. Chaque dimension est pondérée selon son impact réel sur la croissance d'une chaîne Twitch francophone.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                La formule est transparente : chaque dimension a ses propres signaux, ses raisons et ses leviers d'action. Quand un signal manque, la dimension est neutralisée plutôt qu'artificiellement gonflée.
              </p>
            </div>

            {/* Right — animated bars */}
            <div className="space-y-4">
              {DIMENSIONS.map((d, i) => (
                <DimensionBar key={d.label} label={d.label} val={d.val} weight={d.weight} delay={i * 0.1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PHILOSOPHY — 3 animated feature blocks                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              <WordReveal text="La philosophie du produit" />
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Trois principes qui guident chaque décision.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Activity, label: "Un score, pas des stats",
                body: "TwitchTracker te donne des chiffres. Streamnco te dit ce qu'ils signifient — et exactement ce que tu dois corriger en priorité.",
                illus: (
                  <div className="mt-4 rounded-xl bg-background/40 p-3">
                    <div className="mb-2 flex justify-between text-[9px] text-muted-foreground/50">
                      <span>Score global</span><span>Confiance 87%</span>
                    </div>
                    <div className="flex items-end gap-1 h-10">
                      {[40, 55, 48, 62, 58, 74].map((v, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-sm bg-primary/60"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${(v / 74) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-right text-[10px] font-bold text-primary-strong">74 / 100</div>
                  </div>
                ),
              },
              {
                icon: Target, label: "Un blocage, pas une liste",
                body: "Pas 15 recommandations génériques. Un frein principal identifié, avec le levier le plus impactant à actionner cette semaine.",
                illus: (
                  <div className="mt-4 space-y-1.5">
                    {[
                      { t: "Régularité trop instable", bad: true },
                      { t: "Peu de clips ce mois", bad: false },
                    ].map((item) => (
                      <div key={item.t} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${item.bad ? "border border-warning/25 bg-warning/8 font-semibold text-foreground" : "bg-muted/20 text-muted-foreground/60"}`}>
                        {item.bad ? <AlertTriangle className="h-3 w-3 text-warning shrink-0" /> : <span className="h-3 w-3 shrink-0" />}
                        {item.t}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: ListChecks, label: "Un plan, pas des conseils",
                body: "Chaque analyse génère un plan hebdomadaire concret, personnalisé selon ton profil — et vérifié automatiquement après chaque live.",
                illus: (
                  <div className="mt-4 space-y-1.5">
                    {[
                      { t: "Fixer 2 créneaux fixes", done: true },
                      { t: "Créer 1 clip par live", done: false },
                      { t: "Cibler 1 catégorie pivot", done: false },
                    ].map((item, i) => (
                      <motion.div
                        key={item.t}
                        className="flex items-center gap-2 text-[11px]"
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.12 }}
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-primary/40 bg-primary/20" : "border-border/50"}`}>
                          {item.done && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                        <span className={item.done ? "text-muted-foreground/50 line-through" : "text-foreground/80"}>{item.t}</span>
                      </motion.div>
                    ))}
                  </div>
                ),
              },
            ].map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
              >
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.2)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.06),transparent_55%)]" />
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)] transition-all group-hover:bg-primary/15">
                      <p.icon className="h-5 w-5 text-primary-strong" />
                    </div>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Principe</p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">{p.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                    {p.illus}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FOR WHO — staggered cards                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--primary)/0.06),transparent_55%)]" />
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-strong">
                Audience
              </span>
              <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
                <WordReveal text="À qui s'adresse Streamnco ?" />
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Streamnco est conçu pour les{" "}
                <strong className="text-foreground">streamers francophones</strong> — qu'ils débutent ou qu'ils aient déjà une audience établie.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🌱", tag: "Le Débutant", body: "Pose les bonnes bases dès le départ et évite les erreurs classiques.", score: "34" },
                { emoji: "📈", tag: "Le Régulier", body: "Comprend pourquoi son audience stagne malgré ses efforts constants.", score: "58" },
                { emoji: "🎯", tag: "L'Ambitieux", body: "Décide avec des données précises pour atteindre l'affiliation.", score: "72" },
                { emoji: "🏢", tag: "Le Manager", body: "Suit plusieurs chaînes depuis un seul dashboard centralisé.", score: "65" },
              ].map((p, i) => (
                <motion.div
                  key={p.tag}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                  className="group rounded-2xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur-sm transition-all hover:border-primary/20 hover:bg-card/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{p.emoji}</span>
                    <span className="text-[10px] font-bold tabular-nums text-primary-strong">{p.score}/100</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{p.tag}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">{p.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CTA — premium split                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 md:py-24">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.2)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--primary)/0.12),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />

              <div className="relative grid lg:grid-cols-2">
                <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12 lg:p-14">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-strong">
                    <Zap className="h-3 w-3" /> Gratuit · Sans compte
                  </span>
                  <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground md:text-4xl">
                    Découvre ton<br />StreamScore.
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Entre ton pseudo Twitch. En 60 secondes tu as ton score, ton blocage principal et ton premier plan d'action.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
                      <Sparkles className="h-4 w-4" /> Essayer gratuitement
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/fonctionnalites">Voir les fonctionnalités <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/60">
                    {["Sans connexion Twitch", "Résultat en 60 s", "8 000+ chaînes analysées"].map((t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right — animated score ring */}
                <div className="relative hidden min-h-[340px] overflow-hidden lg:flex lg:items-center lg:justify-center">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-card/30 to-transparent" />
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
                    <svg viewBox="0 0 160 160" className="relative h-36 w-36">
                      <defs>
                        <linearGradient id="ctaAboutGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--primary)/0.35)" />
                        </linearGradient>
                      </defs>
                      <circle cx="80" cy="80" r="66" fill="none" stroke="hsl(var(--border)/0.25)" strokeWidth="8" />
                      <motion.circle
                        cx="80" cy="80" r="66" fill="none"
                        stroke="url(#ctaAboutGrad)" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 66}
                        initial={{ strokeDashoffset: 2 * Math.PI * 66 }}
                        whileInView={{ strokeDashoffset: 2 * Math.PI * 66 * 0.26 }}
                        style={{ transformOrigin: "80px 80px", transform: "rotate(-90deg)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                      />
                      <text x="80" y="76" textAnchor="middle" style={{ fontSize: 28, fontWeight: 700, fill: "hsl(var(--foreground))" }}>74</text>
                      <text x="80" y="94" textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: "hsl(var(--muted-foreground))", letterSpacing: "0.15em" }}>STREAMSCORE</text>
                    </svg>

                    <FloatCard delay={0.5} duration={6} className="absolute -left-32 top-2">
                      <div className="w-[150px] rounded-xl border border-white/10 bg-card/80 p-3 backdrop-blur-xl shadow-lg">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-warning/70">Blocage #1</p>
                        <p className="mt-1 text-[11px] font-semibold text-foreground">Régularité</p>
                        <p className="text-[10px] text-muted-foreground/60">→ Fixer 2 créneaux</p>
                      </div>
                    </FloatCard>

                    <FloatCard delay={1} duration={7} className="absolute -right-32 bottom-2">
                      <div className="w-[140px] rounded-xl border border-white/10 bg-card/80 p-3 backdrop-blur-xl shadow-lg">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-400/70">Progression</p>
                        <p className="mt-1 text-lg font-bold text-foreground">+18 pts</p>
                        <p className="text-[10px] text-muted-foreground/60">ce mois-ci</p>
                      </div>
                    </FloatCard>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default AboutPage;
