import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuthModal } from "@/contexts/AuthModalContext";
import {
  Activity, BarChart2, Bell, Calendar, CalendarDays, Clapperboard, Compass,
  ListChecks, Radio, Sparkles, Target, Trophy, TrendingUp, Type, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import { GlassCard, MicroLabel, SectionHeading, SectionShell, SectionBadge } from "@/components/landing/primitives";
import { usePageMeta } from "@/hooks/usePageMeta";
import LandingFooter from "@/components/landing/LandingFooter";

usePageMeta;

// ── Animated score ring ───────────────────────────────────────────────────────
const ScoreRingIllus = ({ score = 74 }: { score?: number }) => {
  const r = 40;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto mt-4 h-28 w-28">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
      <svg viewBox="0 0 100 100" className="relative h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border)/0.3)" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - (score / 100) * circ }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">score</span>
      </div>
    </div>
  );
};

// ── Dimension bars illus ──────────────────────────────────────────────────────
const DimensionBars = () => {
  const dims = [
    { label: "Régularité", val: 82, color: "bg-primary" },
    { label: "Structure", val: 65, color: "bg-primary" },
    { label: "Contenu", val: 38, color: "bg-warning" },
    { label: "Positionnement", val: 91, color: "bg-emerald-400" },
    { label: "Momentum", val: 55, color: "bg-primary" },
    { label: "Monétisation", val: 44, color: "bg-warning" },
  ];
  return (
    <div className="mt-4 space-y-2">
      {dims.map((d, i) => (
        <div key={d.label}>
          <div className="mb-0.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground/80">{d.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{d.val}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className={`h-full rounded-full ${d.color}`}
              initial={{ width: 0 }}
              whileInView={{ width: `${d.val}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.08 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Weekly plan illus ─────────────────────────────────────────────────────────
const WeeklyPlanIllus = () => {
  const tasks = [
    { label: "Fixer 2 créneaux fixes", done: true },
    { label: "Créer 1 clip par live", done: true },
    { label: "Retravailler les titres VOD", done: false },
    { label: "Cibler Just Chatting cette semaine", done: false },
  ];
  return (
    <div className="mt-4 space-y-2">
      {tasks.map((t) => (
        <div key={t.label} className="flex items-center gap-2.5">
          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${t.done ? "border-primary/40 bg-primary/20" : "border-border/50"}`}>
            {t.done && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </div>
          <span className={`text-[11px] ${t.done ? "text-muted-foreground/60 line-through" : "text-foreground/80"}`}>{t.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Live timeline illus ───────────────────────────────────────────────────────
const LiveTimelineIllus = () => {
  const points = [12, 18, 24, 32, 45, 38, 41, 52, 60, 55, 48];
  const max = Math.max(...points);
  const w = 220;
  const h = 60;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (v / max) * h * 0.9;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mb-1">
        <span>Début du live</span>
        <span className="flex items-center gap-1"><Radio className="h-2.5 w-2.5 text-destructive" /> 60 vw peak</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="liveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary)/0.3)" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        <motion.path
          d={path} fill="none" stroke="url(#liveGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

// ── Clip cards illus ──────────────────────────────────────────────────────────
const ClipIllus = () => {
  const clips = [
    { title: "Clutch 1v4 final", views: "1.2k", top: true },
    { title: "Montée ranked Immortal", views: "847" },
    { title: "Fail hilarant", views: "634" },
  ];
  return (
    <div className="mt-4 space-y-2">
      {clips.map((c) => (
        <div key={c.title} className={`flex items-center justify-between rounded-lg px-3 py-2 ${c.top ? "border border-primary/20 bg-primary/5" : "bg-muted/20"}`}>
          <div className="flex items-center gap-2">
            <Clapperboard className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-[11px] text-foreground/80">{c.title}</span>
          </div>
          <span className={`text-[11px] font-semibold tabular-nums ${c.top ? "text-primary" : "text-muted-foreground"}`}>{c.views}</span>
        </div>
      ))}
    </div>
  );
};

// ── Head to head illus ────────────────────────────────────────────────────────
const H2HIllus = () => {
  const dims = [
    { label: "Régularité", me: 82, them: 65 },
    { label: "Contenu", me: 38, them: 78 },
    { label: "Momentum", me: 90, them: 55 },
  ];
  return (
    <div className="mt-4 space-y-2.5">
      {dims.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground/70">{d.label}</span>
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-primary">{d.me}</span>
              <span className="text-muted-foreground/40">vs</span>
              <span className="text-muted-foreground">{d.them}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {[{ val: d.me, cls: "bg-primary" }, { val: d.them, cls: "bg-muted-foreground/30" }].map((b, i) => (
              <div key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
                <motion.div
                  className={`absolute left-0 h-full rounded-full ${b.cls}`}
                  initial={{ width: 0 }} whileInView={{ width: `${b.val}%` }} viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Feature cards data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Activity,
    label: "StreamScore",
    title: "Un score global. Six dimensions actionnables.",
    description: "Régularité, Structure, Contenu, Positionnement, Momentum, Monétisation. Chaque dimension pointe vers une action concrète.",
    illus: <><ScoreRingIllus score={74} /><DimensionBars /></>,
    span: "md:col-span-2",
    hero: true,
  },
  {
    icon: ListChecks,
    label: "Plan hebdomadaire",
    title: "Un plan d'action généré chaque semaine",
    description: "Pas une liste générique. Des actions basées sur ton score du moment, vérifiées automatiquement.",
    illus: <WeeklyPlanIllus />,
    span: "md:col-span-2",
    hero: true,
  },
  {
    icon: Radio,
    label: "Suivi live",
    title: "Chaque live analysé en temps réel",
    description: "Viewers, engagement, durée — tout est tracké. Un débrief automatique t'attend à la fin.",
    illus: <LiveTimelineIllus />,
    span: "md:col-span-2",
    hero: false,
  },
  {
    icon: Clapperboard,
    label: "Clips Analytics",
    title: "Tes meilleurs moments, classés par impact",
    description: "Vues par clip, tendances hebdomadaires, patterns de performance. Sache ce qui accroche vraiment.",
    illus: <ClipIllus />,
    span: "md:col-span-2",
    hero: false,
  },
  {
    icon: Users,
    label: "Face-à-face",
    title: "Compare-toi à n'importe quel concurrent",
    description: "Analyse publique de n'importe quelle chaîne Twitch. Vois exactement où il te devance et pourquoi.",
    illus: <H2HIllus />,
    span: "md:col-span-2",
    hero: true,
  },
  {
    icon: Type,
    label: "Titres",
    title: "5 titres optimisés pour ton prochain live",
    description: "Score de potentiel de clic, tags explicatifs, copie en 1 clic. Génère et teste.",
    illus: (
      <div className="mt-4 space-y-1.5">
        {["🎯 Grind Diamond — push ranked EN DIRECT", "VALORANT ⚡ | Solo carry ranked", "💎 Tryhard ranked — qui est là ?"].map((t, i) => (
          <div key={t} className={`rounded-lg px-3 py-2 text-[11px] ${i === 0 ? "border border-primary/25 bg-primary/5 text-foreground font-medium" : "bg-muted/20 text-foreground/70"}`}>
            {t}
          </div>
        ))}
      </div>
    ),
    span: "md:col-span-2",
    hero: false,
  },
  {
    icon: CalendarDays,
    label: "Planning optimal",
    title: "Tes meilleurs créneaux calculés sur l'historique",
    description: "Heatmap 7j × 24h basée sur tes viewers réels. Les créneaux où ton audience est là — pas ceux que tu imagines.",
    illus: (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1">
          {["L", "M", "M", "J", "V", "S", "D"].map((d) => (
            <div key={d} className="text-center text-[9px] text-muted-foreground/60 pb-1">{d}</div>
          ))}
          {Array.from({ length: 21 }, (_, i) => {
            const hot = [10, 11, 17, 18, 19, 20, 24, 25].includes(i);
            const warm = [3, 4, 12, 13, 16].includes(i);
            return (
              <div key={i} className={`h-4 rounded-sm ${hot ? "bg-primary/80" : warm ? "bg-primary/30" : "bg-muted/20"}`} />
            );
          })}
        </div>
      </div>
    ),
    span: "md:col-span-2",
    hero: false,
  },
  {
    icon: TrendingUp,
    label: "Historique",
    title: "30, 60, 90 jours de progression",
    description: "Ton score évolue. Vois quand il a bougé, pourquoi, et ce qui a changé ce jour-là.",
    illus: null,
    span: "md:col-span-1",
    hero: false,
  },
  {
    icon: Bell,
    label: "Alertes",
    title: "Notifié quand ton score bouge",
    description: "Email automatique dès qu'un delta significatif est détecté. Tu ne rates rien.",
    illus: null,
    span: "md:col-span-1",
    hero: false,
  },
  {
    icon: Target,
    label: "Affiliation",
    title: "Tracker ta progression vers l'affiliation",
    description: "Moyenne viewers, jours de stream, followers — les 4 critères Twitch suivis en temps réel.",
    illus: null,
    span: "md:col-span-1",
    hero: false,
  },
  {
    icon: Trophy,
    label: "Classements",
    title: "Benchmark par catégorie",
    description: "Où tu te situes dans ta catégorie, indexée ou en live. Score et audience.",
    illus: null,
    span: "md:col-span-1",
    hero: false,
  },
];

// ── Fade in wrapper ───────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const FeaturesPage = () => {
  const { openAuthModal } = useAuthModal();
  usePageMeta({
    title: "Fonctionnalités — Streamnco",
    description: "StreamScore, plan hebdomadaire, live tracking, clips, classements et plus. Tout ce qu'il faut pour progresser sur Twitch.",
    canonical: "https://streamnco.fr/fonctionnalites",
    ogUrl: "https://streamnco.fr/fonctionnalites",
    robots: "index, follow",
  });

  const mainFeatures = FEATURES.filter((f) => f.illus);
  const microFeatures = FEATURES.filter((f) => !f.illus);

  return (
    <div className="landing min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-40" />

        <div className="container relative mx-auto max-w-4xl px-4 text-center md:px-6">
          <FadeIn>
            <SectionBadge>
              <Sparkles className="h-3 w-3" /> Fonctionnalités
            </SectionBadge>
            <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
              Tout ce qu'il faut pour progresser sur Twitch
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-foreground/70 md:text-lg">
              Un outil conçu pour te donner une direction claire — pas juste des chiffres.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/">Analyser ma chaîne gratuitement</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/solutions">Voir les solutions →</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* ── Main features bento grid ── */}
      <SectionShell>
        <div className="grid gap-4 md:grid-cols-4">
          {mainFeatures.map((f, i) => (
            <FadeIn key={f.label} delay={i * 0.07} className={f.span}>
              <GlassCard interactive hero={f.hero} className="h-full p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <MicroLabel>{f.label}</MicroLabel>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-snug text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
                {f.illus && <div className="mt-2">{f.illus}</div>}
              </GlassCard>
            </FadeIn>
          ))}
        </div>
      </SectionShell>

      {/* ── Ecosystem features — premium illustrated cards ── */}
      <SectionShell>
        <div className="mb-12 text-center">
          <SectionHeading
            badge="Et aussi"
            title="Tout l'écosystème"
            subtitle="Des outils qui se complètent, pas qui se dispersent."
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* ── Historique 30/60/90j ── */}
          <FadeIn delay={0}>
            <GlassCard interactive className="h-full overflow-hidden p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Historique</p>
              <h3 className="mt-1.5 text-sm font-semibold text-foreground">30, 60, 90 jours de progression</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Vois exactement quand ton score a bougé et pourquoi.</p>

              {/* Area chart illus */}
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-background/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground/50">StreamScore · 90 jours</span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">↑ +18 pts</span>
                </div>
                <svg viewBox="0 0 160 55" className="w-full overflow-visible">
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M0 48 C20 45 30 38 45 35 C55 32 65 30 80 22 C95 14 110 18 130 12 C145 8 155 5 160 4"
                    fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeInOut", delay: 0.1 }}
                  />
                  <motion.path
                    d="M0 48 C20 45 30 38 45 35 C55 32 65 30 80 22 C95 14 110 18 130 12 C145 8 155 5 160 4 L160 55 L0 55 Z"
                    fill="url(#histGrad)"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                    viewport={{ once: true }} transition={{ duration: 1, delay: 0.6 }}
                  />
                  {/* Data points */}
                  {[[45,35],[80,22],[130,12],[160,4]].map(([x, y], i) => (
                    <motion.circle key={i} cx={x} cy={y} r="2.5" fill="hsl(var(--primary))"
                      initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                      viewport={{ once: true }} transition={{ delay: 0.8 + i * 0.1 }}
                    />
                  ))}
                </svg>
                <div className="mt-2 flex justify-between text-[9px] text-muted-foreground/40">
                  <span>J -90</span><span>J -60</span><span>J -30</span><span>Auj.</span>
                </div>
              </div>
            </GlassCard>
          </FadeIn>

          {/* ── Alertes ── */}
          <FadeIn delay={0.08}>
            <GlassCard interactive className="h-full overflow-hidden p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Alertes</p>
              <h3 className="mt-1.5 text-sm font-semibold text-foreground">Notifié quand ton score bouge</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Email automatique dès qu'un delta significatif est détecté.</p>

              {/* Email notification mockup */}
              <div className="mt-4 space-y-2">
                {[
                  { icon: "📈", title: "Score en hausse", sub: "Ton StreamScore a gagné +12 pts", time: "Il y a 2h", color: "border-emerald-500/20 bg-emerald-500/5" },
                  { icon: "⚠️", title: "Contenu en baisse", sub: "Clips : 0 ce mois — frein détecté", time: "Hier", color: "border-warning/20 bg-warning/5" },
                ].map((n) => (
                  <div key={n.title} className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${n.color}`}>
                    <span className="mt-0.5 text-sm leading-none">{n.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-foreground">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{n.sub}</p>
                    </div>
                    <span className="shrink-0 text-[9px] text-muted-foreground/40">{n.time}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </FadeIn>

          {/* ── Affiliation tracker ── */}
          <FadeIn delay={0.16}>
            <GlassCard interactive className="h-full overflow-hidden p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Affiliation</p>
              <h3 className="mt-1.5 text-sm font-semibold text-foreground">Tracker ta progression vers l'affiliation</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Les 4 critères Twitch suivis en temps réel.</p>

              {/* Progress bars for affiliation criteria */}
              <div className="mt-4 space-y-2.5">
                {[
                  { label: "Moy. viewers", val: 71, current: "2.1", target: "3", done: false },
                  { label: "Jours de stream", val: 100, current: "7", target: "7", done: true },
                  { label: "Heures streamed", val: 100, current: "25", target: "25", done: true },
                  { label: "Followers", val: 86, current: "43", target: "50", done: false },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/70">{c.label}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold tabular-nums ${c.done ? "text-emerald-400" : "text-foreground"}`}>{c.current}</span>
                        <span className="text-[9px] text-muted-foreground/40">/{c.target}</span>
                        {c.done && <span className="text-emerald-400 text-[10px]">✓</span>}
                      </div>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted/40">
                      <motion.div
                        className={`h-full rounded-full ${c.done ? "bg-emerald-400" : "bg-primary"}`}
                        initial={{ width: 0 }} whileInView={{ width: `${c.val}%` }}
                        viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </FadeIn>

          {/* ── Benchmark ── */}
          <FadeIn delay={0.24}>
            <GlassCard interactive className="h-full overflow-hidden p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Benchmark</p>
              <h3 className="mt-1.5 text-sm font-semibold text-foreground">Benchmark par catégorie</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Où tu te situes dans ta catégorie, indexée ou en live.</p>

              {/* Mini leaderboard */}
              <div className="mt-4 space-y-1.5">
                {[
                  { rank: 1, name: "StreamerA", score: 91, me: false },
                  { rank: 2, name: "NovaPlay", score: 84, me: false },
                  { rank: 3, name: "JustVibes", score: 79, me: false },
                  { rank: 4, name: "Toi", score: 74, me: true },
                  { rank: 5, name: "GrindMode", score: 68, me: false },
                ].map((r) => (
                  <div
                    key={r.rank}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all ${
                      r.me
                        ? "border border-primary/30 bg-primary/8 font-semibold"
                        : "bg-muted/10"
                    }`}
                  >
                    <span className={`w-4 shrink-0 text-right font-bold tabular-nums ${r.me ? "text-primary" : "text-muted-foreground/40"}`}>
                      #{r.rank}
                    </span>
                    <div className={`h-5 w-5 shrink-0 rounded-full ${r.me ? "bg-primary/30" : "bg-muted/40"} flex items-center justify-center text-[8px] font-bold`}>
                      {r.name[0]}
                    </div>
                    <span className={`flex-1 truncate ${r.me ? "text-primary" : "text-foreground/70"}`}>{r.name}</span>
                    <span className={`tabular-nums font-semibold ${r.me ? "text-primary" : "text-muted-foreground/60"}`}>{r.score}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </FadeIn>

        </div>
      </SectionShell>

      {/* ── CTA — split layout with product preview ── */}
      <SectionShell>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border-2 border-foreground/80 bg-card" style={{ boxShadow: "6px 6px 0 0 hsl(var(--primary))" }}>

            <div className="relative grid lg:grid-cols-[1.1fr_1fr]">

              {/* LEFT — CTA */}
              <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12 lg:p-14">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-background">
                  <Zap className="h-3 w-3" /> Gratuit · Sans compte
                </span>

                <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
                  Vois ce qui bloque<br />ta chaîne. Maintenant.
                </h2>

                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Entre ton pseudo Twitch ci-dessous. En 60 secondes tu as ton score, ton blocage principal et ton premier plan d'action.
                </p>

                <Button size="lg" className="mt-7 gap-2 w-fit" onClick={() => openAuthModal("signup")}>
                  <Sparkles className="h-4 w-4" />
                  Essayer gratuitement
                </Button>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                  {["Sans connexion Twitch", "Résultat en 60 s", "8 000+ chaînes analysées"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* RIGHT — Score ring + floating chips */}
              <div className="relative hidden min-h-[340px] overflow-hidden bg-muted/20 lg:flex lg:items-center lg:justify-center">
                <div className="relative">
                  <svg viewBox="0 0 160 160" className="relative h-36 w-36">
                    <defs>
                      <linearGradient id="ctaRingGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--primary)/0.4)" />
                      </linearGradient>
                    </defs>
                    <circle cx="80" cy="80" r="66" fill="none" stroke="hsl(var(--foreground)/0.08)" strokeWidth="8" />
                    <motion.circle
                      cx="80" cy="80" r="66" fill="none"
                      stroke="url(#ctaRingGrad)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 66}
                      initial={{ strokeDashoffset: 2 * Math.PI * 66 }}
                      whileInView={{ strokeDashoffset: 2 * Math.PI * 66 * 0.28 }}
                      style={{ transformOrigin: "80px 80px", transform: "rotate(-90deg)" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    />
                    <text x="80" y="76" textAnchor="middle" style={{ fontSize: 28, fontWeight: 700, fill: "hsl(var(--foreground))" }}>72</text>
                    <text x="80" y="94" textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: "hsl(var(--muted-foreground))", letterSpacing: "0.15em" }}>StreamScore</text>
                  </svg>

                  <motion.div
                    className="absolute -left-28 top-0 w-[160px] rounded-xl border-2 border-foreground/70 bg-card p-3"
                    style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.6)", animation: "hero-float 7s ease-in-out infinite" }}
                    initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Blocage #1</p>
                    <p className="mt-1 text-[11px] font-semibold text-foreground">Régularité trop instable</p>
                  </motion.div>

                  <motion.div
                    className="absolute -right-28 bottom-0 w-[160px] rounded-xl border-2 border-foreground/70 bg-card p-3"
                    style={{ boxShadow: "3px 3px 0 0 hsl(var(--primary))", animation: "hero-float 8s ease-in-out infinite 1s" }}
                    initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: 1, duration: 0.6 }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Action #1</p>
                    <p className="mt-1 text-[11px] font-semibold text-foreground">Fixer 2 créneaux fixes</p>
                  </motion.div>
                </div>
              </div>

            </div>
          </div>
        </FadeIn>
      </SectionShell>

      <LandingFooter />
    </div>
  );
};

export default FeaturesPage;
