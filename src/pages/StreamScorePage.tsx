import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, BarChart2, Calendar,
  CheckCircle2, Clapperboard, Eye, ListChecks, Sparkles, TrendingUp, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { GlassCard, SectionBadge, SectionShell } from "@/components/landing/primitives";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthModal } from "@/contexts/AuthModalContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const AnimBar = ({ val, delay, color = "bg-primary" }: { val: number; delay: number; color?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-1.5 overflow-hidden rounded-full bg-muted/40">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${val}%` } : {}}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      />
    </div>
  );
};

// ── Animated score ring ───────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 120 }: { score: number; size?: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = size * 0.38; const circ = 2 * Math.PI * r; const cx = size / 2; const cy = size / 2;
  const color = score >= 70 ? "hsl(var(--primary))" : score >= 45 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <div ref={ref} style={{ width: size, height: size }} className="relative shrink-0">
      <div className="pointer-events-none absolute inset-0 rounded-full blur-2xl" style={{ background: `${color}20` }} />
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border)/0.25)" strokeWidth={size * 0.052} />
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={size * 0.052} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={inView ? { strokeDashoffset: circ * (1 - score / 100) } : {}}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold tabular-nums text-foreground" style={{ fontSize: size * 0.22 }}>{score}</span>
        <span className="font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontSize: size * 0.07 }}>/ 100</span>
      </div>
    </div>
  );
};

// ── Data ──────────────────────────────────────────────────────────────────────
const DIMENSIONS = [
  {
    icon: Calendar,
    label: "Régularité",
    description: "Analyse la fréquence de tes streams, les jours actifs et la cohérence de ton planning.",
    detail: "Un streamer régulier construit une habitude chez ses viewers. Sans planning stable, la croissance reste aléatoire.",
  },
  {
    icon: Clapperboard,
    label: "Contenu",
    description: "Analyse ta capacité à transformer tes lives en moments forts, clips et contenus réutilisables.",
    detail: "Un live ne dure que quelques heures. Un clip ou une VOD continue d'exister et d'attirer des viewers bien après.",
  },
  {
    icon: Eye,
    label: "Visibilité",
    description: "Analyse les signaux qui peuvent aider ta chaîne à être plus facilement découverte.",
    detail: "La visibilité repose sur des signaux comme la stabilité de ta catégorie, tes titres et ta cohérence de positionnement.",
  },
  {
    icon: TrendingUp,
    label: "Progression",
    description: "Analyse les signaux d'évolution de ta chaîne pour comprendre si tu avances, stagnes ou régresses.",
    detail: "Un score de progression mesure la dynamique de la chaîne sur les 7 et 30 derniers jours — pas juste une photo figée.",
  },
];

const OUTPUTS = [
  { icon: BarChart2, title: "Une note claire", body: "Pour savoir immédiatement où ta chaîne se situe — sans avoir à interpréter des dizaines de métriques." },
  { icon: Activity, title: "Un diagnostic par dimension", body: "Pour comprendre ce qui fonctionne et ce qui bloque, dimension par dimension." },
  { icon: ListChecks, title: "Des recommandations concrètes", body: "Pour savoir quoi améliorer en priorité, avec le levier le plus impactant d'abord." },
  { icon: CheckCircle2, title: "Un plan d'action", body: "Pour transformer l'analyse en prochaines étapes simples et actionnables dès aujourd'hui." },
];

const SIGNALS = [
  "ta fréquence de stream",
  "ta régularité sur les 30 derniers jours",
  "la cohérence de ton planning",
  "tes signaux de contenu",
  "tes signaux de visibilité",
  "tes indicateurs de progression",
];

const FAQ = [
  {
    q: "Le StreamScore est-il gratuit ?",
    a: "Oui, l'analyse de base peut être lancée gratuitement. Entre ton pseudo Twitch, Streamnco génère un premier diagnostic sans compte requis.",
  },
  {
    q: "Est-ce que le StreamScore garantit de gagner des viewers ?",
    a: "Non. Le StreamScore ne promet pas une croissance automatique. Il aide à comprendre les blocages et à prioriser les bonnes actions. La croissance dépend ensuite de l'exécution.",
  },
  {
    q: "Est-ce que Streamnco est connecté à Twitch ?",
    a: "Streamnco analyse les données disponibles de ta chaîne Twitch pour générer un diagnostic de progression. Le diagnostic de base utilise les données publiques. Le suivi complet utilise les données authentifiées.",
  },
  {
    q: "À quelle fréquence faut-il vérifier son StreamScore ?",
    a: "Idéalement après plusieurs streams ou chaque semaine, pour suivre l'évolution de ta régularité, de ton contenu et de ta progression.",
  },
  {
    q: "Un mauvais StreamScore veut dire que ma chaîne est mauvaise ?",
    a: "Non. Un score faible indique surtout qu'il existe des axes d'amélioration clairs. C'est un point de départ, pas un jugement.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const StreamScorePage = () => {
  const { openAuthModal } = useAuthModal();

  usePageMeta({
    title: "StreamScore — Analyse ta chaîne Twitch avec Streamnco",
    description:
      "Le StreamScore est le score généré par Streamnco pour analyser ta chaîne Twitch, identifier tes points faibles et obtenir un plan d'action clair pour progresser.",
    canonical: "https://streamnco.fr/streamscore",
    robots: "index, follow",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 1. HERO                                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.035)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-45" />
        <motion.div
          className="pointer-events-none absolute left-[8%] top-[35%] h-64 w-64 rounded-full bg-primary/8 blur-3xl"
          animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-[8%] top-[20%] h-48 w-48 rounded-full bg-primary/6 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />

        <div className="container relative mx-auto max-w-4xl px-4 text-center md:px-6">
          <FadeIn>
            <SectionBadge>
              <Activity className="h-3 w-3" /> Concept Streamnco
            </SectionBadge>

            {/* H1 — required verbatim */}
            <h1 className="font-display mx-auto mt-5 max-w-3xl bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-[3.25rem] md:leading-[1.08]">
              StreamScore : le score de progression de ta chaîne Twitch
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-foreground/70 md:text-lg">
              Streamnco analyse ta chaîne Twitch et génère un StreamScore pour t'aider à comprendre où tu en es, ce qui bloque ta progression et quelles actions prioriser.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
              <Sparkles className="h-4 w-4" /> Découvrir mon StreamScore
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#comment-ca-marche">Voir comment ça marche <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
          </FadeIn>

          {/* Score ring hero visual */}
          <FadeIn delay={0.3} className="mt-14 flex justify-center">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
              <ScoreRing score={74} size={160} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 2. DÉFINITION                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell id="definition" glow={false} grid={false}>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Définition
            </span>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Qu'est-ce que le StreamScore ?
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-foreground/70">
              <p>
                Le StreamScore est un score généré par Streamnco pour mesurer la{" "}
                <strong className="text-foreground">santé globale d'une chaîne Twitch</strong>.
              </p>
              <p>
                Il ne sert pas seulement à donner une note. Il sert à transformer les données de ta chaîne en{" "}
                <strong className="text-foreground">diagnostic clair</strong>, puis en{" "}
                <strong className="text-foreground">plan d'action concret</strong>.
              </p>
              <p>
                L'objectif : t'aider à progresser stream après stream, sans te perdre dans des statistiques brutes.
              </p>
            </div>
          </FadeIn>
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 3. 4 DIMENSIONS                                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell glow={false}>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Les dimensions analysées
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Quatre axes complémentaires pour une lecture complète de ta progression.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {DIMENSIONS.map((d, i) => (
            <FadeIn key={d.label} delay={i * 0.1}>
              <GlassCard interactive className="h-full p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <d.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{d.label}</h3>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground/80">{d.description}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d.detail}</p>
              </GlassCard>
            </FadeIn>
          ))}
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 4. CALCUL                                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell id="comment-ca-marche" glow={false} grid={false}>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Méthodologie
            </span>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Comment est calculé le StreamScore ?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/70">
              Le StreamScore est calculé à partir de plusieurs signaux issus de ta chaîne Twitch.
            </p>
            <p className="mt-2 text-base leading-relaxed text-foreground/70">
              Streamnco observe notamment :
            </p>
            <ul className="mt-4 space-y-2.5">
              {SIGNALS.map((s, i) => (
                <motion.li
                  key={s}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                  className="flex items-center gap-3 text-sm text-foreground/80"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[9px] font-bold text-primary">
                    {i + 1}
                  </span>
                  {s}
                </motion.li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Chaque dimension contribue à une lecture globale de ta chaîne. Quand un signal est manquant, il est neutralisé plutôt qu'artificiellement gonflé — pour garantir un score honnête.
            </p>
          </FadeIn>
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 5. CE QUE L'UTILISATEUR OBTIENT                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell glow={false}>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Ce que tu obtiens après ton analyse
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTPUTS.map((o, i) => (
            <FadeIn key={o.title} delay={i * 0.09}>
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-card/70 to-card/30 p-5 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.06),transparent_55%)]" />
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <o.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{o.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{o.body}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 6. EXEMPLE DE LECTURE                                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell glow={false} grid={false}>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Exemple concret
            </span>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Exemple de lecture
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-8">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/50 p-6 backdrop-blur-xl md:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08),transparent_55%)]" />
              <div className="relative">
                {/* Score global */}
                <div className="flex items-center gap-5 border-b border-white/[0.06] pb-6">
                  <ScoreRing score={48} size={96} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">StreamScore global</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">48 / 100</p>
                    <p className="mt-1 text-sm text-muted-foreground">En construction — des axes clairs à améliorer.</p>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="mt-6 space-y-5">
                  {[
                    { label: "Régularité", score: 72, comment: "Tu streams souvent, mais ton planning manque encore de cohérence.", color: "bg-primary" },
                    { label: "Contenu", score: 34, comment: "Tes lives existent, mais tes meilleurs moments ne sont pas assez transformés en contenu.", color: "bg-warning" },
                    { label: "Visibilité", score: 41, comment: "Ta chaîne manque de signaux qui facilitent la découverte.", color: "bg-warning" },
                  ].map((d, i) => (
                    <div key={d.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{d.label}</span>
                        <span className="text-sm font-bold tabular-nums text-foreground">{d.score}/100</span>
                      </div>
                      <AnimBar val={d.score} delay={0.3 + i * 0.1} color={d.color} />
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{d.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Priority */}
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">Priorité recommandée</p>
                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed">
                      Commencer par clipper et republier tes meilleurs moments pour créer plus de points d'entrée vers ta chaîne.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 7. POURQUOI C'EST UTILE                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell glow={false} grid={false}>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Pourquoi le StreamScore est utile ?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/70">
              Beaucoup de streamers savent qu'ils doivent progresser, mais ne savent pas exactement où agir.
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Before */}
              <div className="flex flex-col gap-2 rounded-2xl border border-destructive/15 bg-destructive/5 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive/60">Sans StreamScore</p>
                <p className="text-lg font-bold text-foreground leading-snug">"Je dois faire mieux."</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Vague. Pas actionnable. Tu ne sais pas par où commencer.</p>
              </div>
              {/* After */}
              <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">Avec StreamScore</p>
                <p className="text-lg font-bold text-foreground leading-snug">"Je dois améliorer ma régularité, mieux exploiter mes clips et structurer mon planning."</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Précis. Priorisé. Actionnable dès aujourd'hui.</p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              C'est une lecture simple, actionnable et pensée pour les streamers.
            </p>
          </FadeIn>
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 8. FAQ                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell glow={false} grid={false}>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Questions fréquentes
            </h2>
          </FadeIn>
          <div className="mt-8 space-y-4">
            {FAQ.map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/[0.06] bg-card/30 p-5">
                  <p className="text-sm font-semibold text-foreground">{item.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 9. CTA FINAL                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      <SectionShell grid={false}>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.2)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
            <div className="relative px-8 py-14 text-center md:px-16 md:py-20">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">
                Gratuit · Sans compte
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                Découvre ton StreamScore
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Entre ton pseudo Twitch et obtiens une analyse claire de ta chaîne en quelques secondes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
                  <Zap className="h-4 w-4" /> Analyser ma chaîne Twitch
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/fonctionnalites">Voir toutes les fonctionnalités</Link>
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground/60">
                {["Sans connexion Twitch requise", "Résultat en 60 secondes", "8 000+ chaînes analysées"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </SectionShell>

      <LandingFooter />
    </div>
  );
};

export default StreamScorePage;
