import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { SectionShell, SectionBadge, GlassCard } from "@/components/landing/primitives";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthModal } from "@/contexts/AuthModalContext";

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

const PILLARS = [
  {
    icon: Activity,
    title: "Un score, pas des chiffres",
    body: "Streamnco transforme les données brutes d'une chaîne Twitch en un StreamScore lisible — un indicateur global sur 100 qui reflète la qualité d'exécution réelle du streamer.",
  },
  {
    icon: Target,
    title: "Un blocage, pas une liste",
    body: "Plutôt que d'afficher 20 métriques sans contexte, Streamnco identifie le frein principal de la chaîne et le levier le plus impactant à actionner en premier.",
  },
  {
    icon: TrendingUp,
    title: "Un plan, pas des conseils",
    body: "Chaque analyse génère un plan d'action hebdomadaire concret, personnalisé selon le profil du streamer — et vérifié automatiquement après chaque live.",
  },
];

const DIMENSIONS = [
  { label: "Régularité", desc: "Fréquence et cohérence du planning", weight: "25 %" },
  { label: "Structure", desc: "Durée et volume des sessions", weight: "20 %" },
  { label: "Contenu", desc: "Production de clips et VOD", weight: "20 %" },
  { label: "Positionnement", desc: "Stabilité de la catégorie principale", weight: "15 %" },
  { label: "Momentum", desc: "Activité récente sur 7 jours", weight: "10 %" },
  { label: "Monétisation", desc: "Progression vers l'affiliation Twitch", weight: "10 %" },
];

const AboutPage = () => {
  const { openAuthModal } = useAuthModal();

  usePageMeta({
    title: "À propos de Streamnco — Outil de progression pour streamers Twitch",
    description:
      "Streamnco est un outil d'analyse et de progression pour streamers Twitch. Il calcule un StreamScore, identifie les points faibles et génère un plan d'action concret.",
    canonical: "https://streamnco.fr/about",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.09),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-40" />

        <div className="container relative mx-auto max-w-3xl px-4 md:px-6">
          <FadeIn>
            <SectionBadge>
              <Sparkles className="h-3 w-3" /> À propos
            </SectionBadge>

            {/* ── Required H1 ── */}
            <h1 className="mt-5 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-[3.25rem]">
              À propos de Streamnco
            </h1>

            {/* ── Required content — verbatim ── */}
            <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/70 md:text-lg">
              <p>
                Streamnco est un outil d'analyse et de progression pour streamers Twitch.
              </p>
              <p>
                La plateforme analyse une chaîne Twitch, calcule un <span className="font-semibold text-foreground">StreamScore</span>, identifie les points faibles et génère un plan d'action concret pour aider les streamers à progresser.
              </p>
              <p>
                Streamnco s'adresse aux streamers francophones qui veulent mieux comprendre leur contenu, leur régularité, leur visibilité et leur potentiel de croissance.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 3 pillars ── */}
      <SectionShell glow={false}>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            La philosophie du produit
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trois principes qui guident chaque décision de design.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.1}>
              <GlassCard interactive className="h-full p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </GlassCard>
            </FadeIn>
          ))}
        </div>
      </SectionShell>

      {/* ── StreamScore breakdown ── */}
      <SectionShell glow={false} grid={false}>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Comment fonctionne le StreamScore ?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Le StreamScore est un indicateur composite sur 100, calculé à partir de six dimensions qui mesurent la qualité d'exécution de la chaîne — pas sa popularité. Chaque dimension est pondérée selon son impact réel sur la croissance.
              </p>
            </div>
          </FadeIn>

          <div className="space-y-3">
            {DIMENSIONS.map((d, i) => (
              <FadeIn key={d.label} delay={i * 0.07}>
                <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-card/30 px-5 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {d.weight}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.5}>
            <p className="mt-5 text-xs text-muted-foreground/60 leading-relaxed">
              Le score est calculé côté client après analyse des données publiques Twitch (régularité, clips, VOD, catégorie) et, pour les comptes connectés, des données authentifiées (followers, EventSub). La formule est transparente : chaque dimension a ses propres signaux, ses raisons et ses leviers d'action.
            </p>
          </FadeIn>
        </div>
      </SectionShell>

      {/* ── À qui s'adresse Streamnco ── */}
      <SectionShell glow={false} grid={false}>
        <FadeIn>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              À qui s'adresse Streamnco ?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Streamnco est conçu pour les <strong className="text-foreground">streamers francophones</strong> — qu'ils débutent ou qu'ils aient déjà une audience établie.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { title: "Les débutants", body: "Qui veulent poser de bonnes bases dès le départ et éviter les erreurs classiques qui freinent la croissance." },
                { title: "Les réguliers", body: "Qui streamint souvent mais ne comprennent pas pourquoi leur audience stagne malgré leurs efforts." },
                { title: "Les ambitieux", body: "Qui visent l'affiliation ou le partenariat Twitch et ont besoin de données précises pour décider." },
                { title: "Les managers", body: "Qui gèrent plusieurs créateurs et veulent un suivi centralisé sans y passer des heures chaque semaine." },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={0.1 + i * 0.08}>
                  <div className="rounded-xl border border-white/[0.06] bg-card/20 p-4">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </FadeIn>
      </SectionShell>

      {/* ── CTA ── */}
      <SectionShell grid={false}>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-10 text-center md:p-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1),transparent_60%)]" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">Gratuit pour commencer</p>
              <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
                Découvre ton StreamScore en 60 secondes.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Sans compte, sans connexion Twitch. Entre ton pseudo et récupère ton diagnostic immédiatement.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
                  <Sparkles className="h-4 w-4" /> Essayer gratuitement
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/features">Voir les fonctionnalités <ArrowRight className="ml-1 h-4 w-4" /></Link>
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

export default AboutPage;
