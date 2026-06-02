import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, BarChart2, Building2, Calendar, CheckCircle2,
  Clapperboard, Compass, Flame, Rocket, Sparkles, Target, TrendingUp, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import { GlassCard, MicroLabel, SectionBadge, SectionHeading, SectionShell } from "@/components/landing/primitives";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const FadeIn = ({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// ── Persona data ──────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    id: "debutant",
    icon: Rocket,
    emoji: "🌱",
    tag: "Le Débutant",
    tagline: "Tu streams depuis quelques semaines. Tu ne sais pas encore ce qui compte vraiment.",
    quote: "\"Je fais tout ce qu'on me dit, mais rien ne décolle.\"",
    pain: [
      "Impossible de savoir quel signal regarder en priorité",
      "Trop d'infos contradictoires sur Twitch growth",
      "Pas de méthode pour évaluer si tu progresses vraiment",
    ],
    solution: [
      "Un score global qui dit si ta base est solide ou fragile",
      "Le blocage principal identifié sans jargon",
      "Un plan d'action en 3 étapes, pas 30",
    ],
    features: ["Diagnostic gratuit", "StreamScore", "Plan hebdomadaire", "Playbooks"],
    plan: "Gratuit → Pro",
    planColor: "text-muted-foreground",
    accentColor: "border-emerald-500/20 bg-emerald-500/5",
    iconColor: "bg-emerald-500/10 text-emerald-400",
    badgeColor: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "regulier",
    icon: TrendingUp,
    emoji: "📈",
    tag: "Le Régulier",
    tagline: "Tu es là, tu streams souvent. Mais ta croissance s'est arrêtée et tu ne sais pas pourquoi.",
    quote: "\"Je fais autant que d'autres qui grandissent 3× plus vite que moi.\"",
    pain: [
      "Tu streams régulièrement mais les viewers ne suivent pas",
      "Tes stats ne disent pas ce qui est vraiment important",
      "Tu essaies des choses, sans savoir si ça change quelque chose",
    ],
    solution: [
      "Identification du frein exact parmi les 6 dimensions",
      "Historique 30/60/90 jours pour voir ce qui bouge",
      "Comparaison avec des chaînes de ton niveau réel",
    ],
    features: ["StreamScore", "Historique", "Benchmark", "Alertes email"],
    plan: "Pro",
    planColor: "text-primary",
    accentColor: "border-primary/20 bg-primary/5",
    iconColor: "bg-primary/10 text-primary",
    badgeColor: "border-primary/30 bg-primary/10 text-primary",
    highlighted: true,
  },
  {
    id: "ambitieux",
    icon: Target,
    emoji: "🎯",
    tag: "L'Ambitieux",
    tagline: "Tu vises l'affiliation, peut-être le partenariat. Tu veux des données pour décider, pas des intuitions.",
    quote: "\"Je veux savoir exactement ce qui me sépare de l'affiliation Twitch.\"",
    pain: [
      "Les 4 critères Twitch s'entremêlent et tu perds le fil",
      "Difficile de savoir si tes actions ont un impact réel",
      "Ton setup est bon mais quelque chose bloque la croissance",
    ],
    solution: [
      "Tracker d'affiliation avec les 4 critères Twitch en temps réel",
      "Score de progression hebdomadaire avec vérification automatique",
      "Face-à-face avec les streamers qui ont réussi avant toi",
    ],
    features: ["Tracker affiliation", "Plan vérifiable", "Face-à-face", "Clips analytics"],
    plan: "Growth",
    planColor: "text-violet-400",
    accentColor: "border-violet-500/20 bg-violet-500/5",
    iconColor: "bg-violet-500/10 text-violet-400",
    badgeColor: "border-violet-500/20 bg-violet-500/10 text-violet-400",
  },
  {
    id: "manager",
    icon: Building2,
    emoji: "🏢",
    tag: "Le Manager",
    tagline: "Tu gères plusieurs streamers — une org esport, une agence, un collectif. Tu as besoin d'un vue d'ensemble.",
    quote: "\"Je perds 2h par semaine à consolider manuellement les stats de mes streamers.\"",
    pain: [
      "Suivre chaque chaîne individuellement prend trop de temps",
      "Difficile d'identifier rapidement qui a besoin d'aide",
      "Pas d'outil de reporting adapté au suivi multi-créateurs",
    ],
    solution: [
      "Jusqu'à 3 comptes Twitch sur un seul plan Agency",
      "Dashboard unifié avec scores et alertes par chaîne",
      "Vue comparative entre les streamers que tu gères",
    ],
    features: ["Multi-comptes (3)", "Dashboard unifié", "Alertes", "StreamScore par chaîne"],
    plan: "Agency",
    planColor: "text-sky-400",
    accentColor: "border-sky-500/20 bg-sky-500/5",
    iconColor: "bg-sky-500/10 text-sky-400",
    badgeColor: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  },
];

// ── Persona card ──────────────────────────────────────────────────────────────
const PersonaCard = ({ p, delay }: { p: typeof PERSONAS[number]; delay: number }) => (
  <FadeIn delay={delay}>
    <GlassCard
      interactive
      className={`h-full border ${p.accentColor} p-6 md:p-7`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.iconColor}`}>
            <p.icon className="h-5 w-5" />
          </div>
          <div>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.badgeColor}`}>
              {p.tag}
            </span>
          </div>
        </div>
        <span className="text-2xl leading-none">{p.emoji}</span>
      </div>

      {/* Tagline */}
      <p className="mt-4 text-sm font-medium leading-snug text-foreground">
        {p.tagline}
      </p>

      {/* Quote */}
      <blockquote className="mt-3 border-l-2 border-border/40 pl-3 text-xs italic text-muted-foreground leading-relaxed">
        {p.quote}
      </blockquote>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* Pain */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            Le problème
          </p>
          <ul className="space-y-1.5">
            {p.pain.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Solution */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            Ce que Streamnco apporte
          </p>
          <ul className="space-y-1.5">
            {p.solution.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Features chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {p.features.map((f) => (
          <span
            key={f}
            className="rounded-full border border-border/40 bg-muted/30 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Plan + CTA */}
      <div className="mt-5 flex items-center justify-between border-t border-border/30 pt-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">Plan recommandé</p>
          <p className={`text-sm font-bold ${p.planColor}`}>{p.plan}</p>
        </div>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
          <Link to="/analyze">
            Commencer <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </GlassCard>
  </FadeIn>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const SolutionsPage = () => {
  usePageMeta({
    title: "Solutions — Streamnco",
    description: "Streamnco s'adapte à ton niveau — débutant, régulier, ambitieux ou manager. Trouve le plan qui correspond à ton profil.",
  });

  const individual = PERSONAS.filter((p) => p.id !== "manager");
  const manager = PERSONAS.find((p) => p.id === "manager")!;

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-40" />

        <div className="container relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <FadeIn>
            <SectionBadge>
              <Users className="h-3 w-3" /> Solutions
            </SectionBadge>
            <h1 className="mx-auto mt-5 max-w-2xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              Streamnco pour chaque type de streamer
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-foreground/70 md:text-lg">
              Que tu démarres, que tu stagues ou que tu gères une équipe — le bon outil au bon niveau.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/analyze">Analyser ma chaîne gratuitement</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/features">Voir toutes les fonctionnalités →</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* ── Individual streamers (3 personas) ── */}
      <SectionShell glow={false}>
        <div className="mb-8 text-center">
          <SectionHeading
            badge="Streamers individuels"
            title="À quel stade es-tu ?"
            subtitle="Le même outil, adapté à là où tu en es. Commence gratuitement, évolue quand tu es prêt."
          />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {individual.map((p, i) => (
            <PersonaCard key={p.id} p={p} delay={i * 0.1} />
          ))}
        </div>
      </SectionShell>

      {/* ── Manager (Agency) ── */}
      <SectionShell glow={false} grid={false}>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-sky-500/5 p-6 md:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_right,hsl(200,80%,60%,0.06),transparent_60%)]" />

            <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
              {/* Left */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10">
                    <Building2 className="h-6 w-6 text-sky-400" />
                  </div>
                  <div>
                    <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                      Agency
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                  {manager.tag}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{manager.tagline}</p>
                <blockquote className="mt-3 border-l-2 border-sky-500/30 pl-3 text-xs italic text-muted-foreground">
                  {manager.quote}
                </blockquote>
                <div className="mt-6 flex flex-wrap gap-2">
                  {manager.features.map((f) => (
                    <span key={f} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-medium text-sky-400">
                      {f}
                    </span>
                  ))}
                </div>
                <Button className="mt-6 gap-2" asChild>
                  <Link to="/pricing">
                    Voir le plan Agency <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Right */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Le problème</p>
                  <ul className="space-y-2">
                    {manager.pain.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Ce que ça change</p>
                  <ul className="space-y-2">
                    {manager.solution.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </SectionShell>

      {/* ── Bottom CTA ── */}
      <SectionShell grid={false}>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-10 text-center md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_65%)]" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Commence avec le diagnostic gratuit
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Aucun compte requis. Entre ton pseudo Twitch et récupère ton score en moins d'une minute.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/analyze">Analyser ma chaîne →</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/pricing">Voir les tarifs</Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </SectionShell>

      <LandingFooter />
    </div>
  );
};

export default SolutionsPage;
