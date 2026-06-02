import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Rocket, Target, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import { SectionBadge, SectionShell } from "@/components/landing/primitives";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
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
            <div className="relative overflow-hidden rounded-3xl border border-sky-500/15 bg-gradient-to-r from-sky-500/8 via-background to-background p-8 md:p-12">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_right,hsl(200,80%,60%,0.06),transparent_60%)]" />

              <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
                {/* Left */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10">
                      <Building2 className="h-5 w-5 text-sky-400" />
                    </div>
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                      Agency
                    </span>
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
                    Tu gères plusieurs streamers ?
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
                    Un seul plan pour suivre jusqu'à 3 chaînes Twitch. Idéal pour les orgs esport, agences de talent et managers de contenu.
                  </p>
                  <Button className="mt-6 gap-2 bg-sky-500 hover:bg-sky-400 text-white border-0" asChild>
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
                    <div key={f} className="flex items-center gap-2 rounded-xl border border-sky-500/10 bg-sky-500/5 px-3 py-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                      <span className="text-xs font-medium text-foreground/80">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <SectionShell grid={false}>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/8 to-transparent p-10 text-center md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1),transparent_60%)]" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">Gratuit pour commencer</p>
              <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
                Analyse ta chaîne en 1 minute
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
                Aucun compte, aucune connexion Twitch. Juste ton pseudo.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/">Analyser ma chaîne →</Link>
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
