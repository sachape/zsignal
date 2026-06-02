import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, Building2, CheckCircle2, ListChecks, Rocket, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import { SectionBadge, SectionShell } from "@/components/landing/primitives";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { cn } from "@/lib/utils";

const FadeIn = ({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const PERSONAS = [
  {
    icon: Rocket,
    tag: "Le Débutant",
    headline: "Pose les bonnes bases dès le départ.",
    description: "Tu streams depuis peu et tu ne sais pas encore ce qui compte vraiment.",
    benefits: ["Diagnostic en 1 min", "Premier plan d'action", "Sans compte requis"],
    plan: "Gratuit",
    planStyle: "border-border/40 text-muted-foreground",
    accent: "from-emerald-500/10 to-transparent",
    border: "border-emerald-500/15",
    iconBg: "bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    icon: TrendingUp,
    tag: "Le Régulier",
    headline: "Trouve ce qui bloque ta croissance.",
    description: "Tu stream régulièrement mais les viewers ne suivent pas.",
    benefits: ["Blocage identifié", "Historique 90 jours", "Alertes automatiques"],
    plan: "Pro",
    planStyle: "border-primary/30 text-primary bg-primary/10",
    accent: "from-primary/10 to-transparent",
    border: "border-primary/20",
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    highlighted: true,
  },
  {
    icon: Target,
    tag: "L'Ambitieux",
    headline: "Décide avec des données, pas des intuitions.",
    description: "Tu vises l'affiliation ou le partenariat Twitch.",
    benefits: ["Tracker affiliation", "Vérification auto", "Face-à-face concurrents"],
    plan: "Growth",
    planStyle: "border-violet-500/30 text-violet-400 bg-violet-500/10",
    accent: "from-violet-500/10 to-transparent",
    border: "border-violet-500/15",
    iconBg: "bg-violet-500/10 text-violet-400",
    dot: "bg-violet-400",
  },
] as const;

const SolutionsPage = () => {
  const { openAuthModal } = useAuthModal();
  usePageMeta({
    title: "Solutions — Streamnco",
    description: "Streamnco s'adapte à chaque type de streamer. Débutant, régulier, ambitieux ou manager — trouvez votre plan.",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />
        <div className="container relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <FadeIn>
            <SectionBadge>
              <Users className="h-3 w-3" /> Solutions
            </SectionBadge>
            <h1 className="mx-auto mt-5 max-w-2xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-[3.5rem]">
              Le bon outil,<br />au bon niveau.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-foreground/60 md:text-lg">
              Que tu démarres ou que tu gères une équipe, Streamnco s'adapte à ton profil.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── 3 individual personas ── */}
      <section className="relative overflow-hidden pb-24">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {PERSONAS.map((p, i) => (
              <FadeIn key={p.tag} delay={i * 0.1}>
                <div
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-b p-6 transition-all duration-300 hover:-translate-y-0.5",
                    p.border,
                    p.accent,
                    p.highlighted && "shadow-[0_0_40px_hsl(var(--primary)/0.08)]",
                  )}
                >
                  {/* Icon + Tag */}
                  <div className="flex items-center justify-between">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", p.iconBg)}>
                      <p.icon className="h-5 w-5" />
                    </div>
                    {p.highlighted && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        Populaire
                      </span>
                    )}
                  </div>

                  {/* Label + headline */}
                  <div className="mt-5 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      {p.tag}
                    </p>
                    <h3 className="mt-1.5 text-lg font-bold leading-snug text-foreground">
                      {p.headline}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Benefits */}
                  <ul className="mt-5 space-y-2">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-foreground/80">
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", p.dot)} />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* Plan + CTA */}
                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", p.planStyle)}>
                      {p.plan}
                    </span>
                    <Link
                      to="/"
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Commencer <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agency / Manager ── */}
      <section className="relative overflow-hidden py-8 pb-28">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-r from-primary/8 via-background to-background p-8 md:p-12">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_right,hsl(var(--primary)/0.06),transparent_60%)]" />

              <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
                {/* Left */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Agency
                    </span>
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
                    Tu gères plusieurs streamers ?
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
                    Un seul plan pour suivre jusqu'à 3 chaînes Twitch. Idéal pour les orgs esport, agences de talent et managers de contenu.
                  </p>
                  <Button className="mt-6 gap-2" asChild>
                    <Link to="/pricing">
                      Voir le plan Agency <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {/* Right */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "3 comptes Twitch",
                    "Dashboard unifié",
                    "Score par chaîne",
                    "Alertes automatiques",
                    "Plans d'action séparés",
                    "Support prioritaire",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-xs font-medium text-foreground/80">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Bottom CTA — premium split ── */}
      <SectionShell grid={false}>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.2)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--primary)/0.12),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-40" />

            <div className="relative grid lg:grid-cols-[1.1fr_1fr]">

              {/* LEFT — CTA */}
              <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12 lg:p-14">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <Zap className="h-3 w-3" /> Gratuit · Sans compte
                </span>
                <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground md:text-4xl">
                  Découvre ton profil<br />de streamer.
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Score global, blocage principal, plan d'action — en 60 secondes. Sans connexion Twitch, sans carte bancaire.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
                    <Sparkles className="h-4 w-4" /> Essayer gratuitement
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/pricing">Voir les tarifs</Link>
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

              {/* RIGHT — 4 persona mini-cards stacked */}
              <div className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center py-10 pr-10">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-card/20 to-transparent" />
                <div className="relative space-y-3 w-full max-w-[260px]">
                  {[
                    { emoji: "🌱", tag: "Le Débutant", line: "Score 34 · Blocage : Régularité", color: "border-emerald-500/20 bg-emerald-500/5" },
                    { emoji: "📈", tag: "Le Régulier", line: "Score 58 · Frein : Contenu clips", color: "border-primary/20 bg-primary/5", active: true },
                    { emoji: "🎯", tag: "L'Ambitieux", line: "Score 72 · Objectif : Affiliation", color: "border-violet-500/20 bg-violet-500/5" },
                    { emoji: "🏢", tag: "Le Manager", line: "3 chaînes · Score moyen : 61", color: "border-primary/15 bg-primary/5" },
                  ].map((p, i) => (
                    <motion.div
                      key={p.tag}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm",
                        p.color,
                        p.active && "shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                      )}
                    >
                      <span className="text-lg leading-none">{p.emoji}</span>
                      <div className="min-w-0">
                        <p className={cn("text-[11px] font-semibold", p.active ? "text-primary" : "text-foreground")}>{p.tag}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{p.line}</p>
                      </div>
                    </motion.div>
                  ))}
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

export default SolutionsPage;
