import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  ListChecks,
  Palette,
  Radio,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { SectionBadge } from "@/components/landing/primitives";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

const NAV_ANCHORS = [
  { label: "Créer", href: "#creer" },
  { label: "Organiser", href: "#organiser" },
  { label: "Analyser", href: "#analyser" },
  { label: "Progresser", href: "#progresser" },
] as const;

const CREATION_FEATURES = [
  "Clip Twitch, VOD ou upload",
  "Vertical 9:16",
  "Facecam + gameplay",
  "Sous-titres automatiques",
  "Styles de captions",
  "Téléchargement du clip",
] as const;

const VISUAL_FORMATS = [
  "Bannière Twitch",
  "Story verticale",
  "Post carré",
  "Annonce live",
  "Cover / header",
  "Offline screen",
] as const;

const FadeIn = ({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const FeaturePanel = ({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  accent = "primary",
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  accent?: "primary" | "cyan" | "amber";
}) => {
  const accentClasses = {
    primary: "border-primary/[0.18] bg-primary/[0.045] text-primary",
    cyan: "border-cyan-200/[0.18] bg-cyan-200/[0.045] text-cyan-100",
    amber: "border-amber-200/[0.18] bg-amber-200/[0.045] text-amber-100",
  };

  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#0d1116] p-5 md:p-7"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", accentClasses[accent])}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          </div>
          <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {children ? <div className="w-full md:max-w-sm">{children}</div> : null}
      </div>
    </section>
  );
};

const FeaturesPage = () => {
  const { openAuthModal } = useAuthModal();

  usePageMeta({
    title: "Fonctionnalités — Streamnco",
    description:
      "Clips réseaux, Studio visuel, file de contenu, StreamScore, benchmark et Live Studio : le cockpit créatif et stratégique des streamers.",
    canonical: "https://streamnco.fr/fonctionnalites",
    ogUrl: "https://streamnco.fr/fonctionnalites",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <section className="relative overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_40%_0%,rgba(190,255,90,0.15),transparent_54%),radial-gradient(ellipse_at_80%_20%,rgba(90,210,255,0.10),transparent_36%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          <FadeIn className="max-w-3xl">
            <SectionBadge>
              <Sparkles className="h-3 w-3" /> Fonctionnalités
            </SectionBadge>
            <h1 className="font-display mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Tout le contenu autour de ton stream, dans un même cockpit.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Streamnco relie les tâches qui vivent souvent dans dix outils : créer des clips, générer des visuels, ranger tes contenus, analyser Twitch et préparer tes prochains lives.
            </p>
          </FadeIn>

          <FadeIn delay={0.12} className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {NAV_ANCHORS.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
                >
                  {anchor.label}
                </a>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => openAuthModal("signup")} className="gap-2">
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" asChild>
                <Link to="/pricing">Voir les tarifs</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl space-y-14 px-4 pb-24 md:px-6">
        <section id="creer" className="scroll-mt-28">
          <FadeIn>
            <div className="mb-6 grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Créer</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Des assets propres, sans repartir de zéro.
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                La création est pensée comme une chaîne : une source réelle, un format clair, un export que tu peux publier manuellement quand tu veux.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-4">
            <FadeIn delay={0.06}>
              <FeaturePanel
                id="clips-reseaux"
                icon={Clapperboard}
                eyebrow="Clips réseaux"
                title="Transforme tes moments Twitch en vidéos verticales 9:16."
                description="Tu pars d'un Clip Twitch, d'une VOD ou d'un upload. Streamnco assemble un format vertical avec facecam, gameplay, sous-titres et styles de captions, puis te laisse télécharger le résultat."
              >
                <div className="grid grid-cols-2 gap-2">
                  {CREATION_FEATURES.map((feature) => (
                    <div key={feature} className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs text-muted-foreground">
                      {feature}
                    </div>
                  ))}
                </div>
              </FeaturePanel>
            </FadeIn>

            <FadeIn delay={0.12}>
              <FeaturePanel
                id="studio-visuel"
                icon={Palette}
                eyebrow="Studio visuel"
                title="Génère des visuels Twitch et sociaux aux bonnes dimensions."
                description="Le Studio visuel produit 3 variantes par génération, sur 8 formats pensés pour l'écosystème streamer : live, profil, réseaux, covers et écrans."
                accent="cyan"
              >
                <div className="grid grid-cols-2 gap-2">
                  {VISUAL_FORMATS.map((format) => (
                    <div key={format} className="rounded-lg border border-cyan-200/10 bg-cyan-200/[0.045] p-3">
                      <div className="h-10 rounded-md bg-[linear-gradient(135deg,rgba(103,232,249,0.2),rgba(255,255,255,0.04))]" />
                      <p className="mt-2 text-xs font-medium text-foreground">{format}</p>
                    </div>
                  ))}
                </div>
              </FeaturePanel>
            </FadeIn>
          </div>
        </section>

        <section id="organiser" className="scroll-mt-28">
          <FadeIn>
            <div className="mb-6 grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Organiser</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Une file claire avant publication.
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Les contenus prêts, les brouillons et les téléchargements restent visibles. Le système privilégie aujourd'hui la préparation et l'export manuel.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn delay={0.06}>
              <FeaturePanel
                id="file-de-contenu"
                icon={ListChecks}
                eyebrow="File de contenu"
                title="Retrouve clips, visuels et brouillons au même endroit."
                description="Un clip généré ou un visuel préparé n'est pas perdu dans un dossier. Il rejoint une file où tu peux distinguer ce qui est prêt, ce qui demande une vérification et ce qui reste en brouillon."
                accent="amber"
              >
                <div className="space-y-2">
                  {["Clip vertical prêt", "Visuel annonce live", "Brouillon de publication"].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-lg bg-white/[0.035] px-3 py-2">
                      <span className="text-xs text-foreground">{item}</span>
                      <span className="text-[10px] text-muted-foreground">0{index + 1}</span>
                    </div>
                  ))}
                </div>
              </FeaturePanel>
            </FadeIn>

            <FadeIn delay={0.12}>
              <FeaturePanel
                id="reseaux-connectes"
                icon={Radio}
                eyebrow="Réseaux connectés"
                title="Une évolution prévue, pas une promesse vendue trop tôt."
                description="TikTok, Instagram et YouTube peuvent apparaître comme destinations de travail, mais la promesse stable aujourd'hui reste la préparation, le téléchargement et la publication manuelle."
              >
                <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Bientôt</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Les connexions sociales avancées seront mises en avant quand elles seront réellement fiables côté produit et validation plateforme.
                  </p>
                </div>
              </FeaturePanel>
            </FadeIn>
          </div>
        </section>

        <section id="analyser" className="scroll-mt-28">
          <FadeIn>
            <div className="mb-6 grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Analyser</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Des données Twitch transformées en priorités.
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Streamnco ne promet pas de croissance garantie. Il rend tes signaux lisibles pour t'aider à choisir la prochaine action.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn delay={0.06}>
              <FeaturePanel
                id="streamscore"
                icon={Activity}
                eyebrow="StreamScore"
                title="Un score global, des dimensions et une progression."
                description="Analyse une chaîne Twitch, comprends ses dimensions de progression, consulte l'historique et transforme le diagnostic en recommandations concrètes."
              >
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-5xl font-bold text-foreground">73</p>
                      <p className="mt-1 text-xs text-muted-foreground">Score global</p>
                    </div>
                    <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {["Régularité", "Contenu", "Positionnement"].map((label, index) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>{label}</span>
                          <span>{[78, 54, 69][index]}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${[78, 54, 69][index]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FeaturePanel>
            </FadeIn>

            <FadeIn delay={0.12}>
              <FeaturePanel
                id="benchmark"
                icon={Users}
                eyebrow="Benchmark"
                title="Compare ta chaîne à d'autres streamers."
                description="Le benchmark aide à identifier les écarts visibles : catégorie, rythme, contenus, positionnement. L'objectif est de repérer des opportunités, pas de copier."
                accent="cyan"
              >
                <div className="space-y-2">
                  {[
                    { rank: "#1", name: "Streamer A", score: 82 },
                    { rank: "#2", name: "Ta chaîne", score: 73 },
                    { rank: "#3", name: "Streamer B", score: 68 },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between rounded-lg bg-white/[0.035] px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-primary">{row.rank}</span>
                        <span className="text-xs text-foreground">{row.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{row.score}</span>
                    </div>
                  ))}
                </div>
              </FeaturePanel>
            </FadeIn>
          </div>
        </section>

        <section id="progresser" className="scroll-mt-28">
          <FadeIn>
            <div className="mb-6 grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Progresser</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Prépare le prochain live avec plus d'intention.
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Les recommandations, le plan d'action, les titres et le planning servent à transformer l'analyse en prochaine action.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <FadeIn delay={0.06}>
              <FeaturePanel
                id="live-studio"
                icon={CalendarDays}
                eyebrow="Live Studio"
                title="Titres, planning et setup live dans un espace plus calme."
                description="Prépare tes prochains lives avec des titres, un planning, des checklists et des intentions de contenu. Le but : arriver en live avec une direction plus claire."
                accent="amber"
              >
                <div className="space-y-2">
                  {["Générateur de titres", "Planning", "Setup live", "Moments à provoquer"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-xs text-foreground">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </FeaturePanel>
            </FadeIn>

            <FadeIn delay={0.12}>
              <section className="rounded-2xl border border-primary/[0.18] bg-primary/[0.045] p-6 md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Plan d'action
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  Une recommandation ne vaut que si elle devient une tâche.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Streamnco relie les signaux Twitch à des actions concrètes : produire un clip, retravailler un titre, stabiliser un créneau, tester une catégorie ou préparer un visuel.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {["Recommandations", "Plan d'action", "Titres", "Planning"].map((item) => (
                    <div key={item} className="rounded-lg border border-primary/[0.15] bg-background/40 px-3 py-2 text-sm text-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          </div>
        </section>

        <FadeIn>
          <section className="rounded-2xl border border-white/[0.08] bg-[#0d1116] p-7 text-center md:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Résumé</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foreground">
              Streamnco t'aide à créer mieux, publier plus proprement et décider avec plus de recul.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Pas de promesse d'automatisation totale. Pas de croissance garantie. Un cockpit fiable pour structurer le contenu et la progression autour de ton stream.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => openAuthModal("signup")} className="gap-2">
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/solutions">Voir les solutions</Link>
              </Button>
            </div>
          </section>
        </FadeIn>
      </main>

      <LandingFooter />
    </div>
  );
};

export default FeaturesPage;
