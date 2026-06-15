import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Compass,
  Palette,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { SectionBadge } from "@/components/landing/primitives";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

const SOLUTIONS = [
  {
    id: "debutant",
    icon: Compass,
    label: "Débutant",
    title: "Tu veux savoir quoi améliorer et créer tes premiers contenus propres.",
    description:
      "Pas besoin d'un outil compliqué. Juste une méthode simple : comprendre ta chaîne, sortir tes premiers clips et visuels propres, et arriver en live avec plus d'intention.",
    focus: ["Premier diagnostic Twitch", "Premiers clips verticaux", "Visuels de base propres"],
    startingPoint: "Lancer un diagnostic puis créer un premier clip 9:16.",
    tone: "primary",
  },
  {
    id: "intermediaire",
    icon: TrendingUp,
    label: "Intermédiaire",
    title: "Tu streams déjà et tu veux publier plus régulièrement.",
    description:
      "Le problème n'est plus de commencer, c'est de tenir le rythme. Streamnco t'aide à transformer tes lives en assets, ranger tes brouillons et préparer une cadence réaliste.",
    focus: ["Clips Twitch / VOD / upload", "File de contenu", "Studio visuel multi-formats"],
    startingPoint: "Mettre en place une file de contenu hebdomadaire.",
    tone: "cyan",
  },
  {
    id: "confirme",
    icon: Target,
    label: "Confirmé",
    title: "Tu veux professionnaliser ton image, suivre tes performances et optimiser ta croissance.",
    description:
      "Tu as déjà des stats, des concurrents et une audience à comprendre. Streamnco devient ton centre de pilotage : création, benchmark, StreamScore, recommandations et préparation live.",
    focus: ["Benchmark concurrentiel", "Historique StreamScore", "Live Studio et plan d'action"],
    startingPoint: "Comparer ta chaîne, prioriser une action et produire les assets liés.",
    tone: "amber",
  },
] as const;

const FadeIn = ({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const toneClasses = {
  primary: "border-primary/20 bg-primary/[0.055] text-primary",
  cyan: "border-cyan-200/20 bg-cyan-200/[0.055] text-cyan-100",
  amber: "border-amber-200/20 bg-amber-200/[0.055] text-amber-100",
};

const SolutionsPage = () => {
  const { openAuthModal } = useAuthModal();

  usePageMeta({
    title: "Solutions — Streamnco",
    description:
      "Streamnco pour streamers débutants, intermédiaires et confirmés : créer des contenus propres, publier plus régulièrement et piloter sa progression Twitch.",
    canonical: "https://streamnco.fr/solutions",
    ogUrl: "https://streamnco.fr/solutions",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <section className="relative overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[58rem] -translate-x-1/2 landing-aurora" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(190,255,90,0.14),transparent_54%),radial-gradient(ellipse_at_80%_20%,rgba(90,210,255,0.10),transparent_36%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          <FadeIn className="max-w-3xl">
            <SectionBadge>
              <Users className="h-3 w-3" /> Solutions
            </SectionBadge>
            <h1 className="font-display mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Quel que soit ton niveau, Streamnco grandit avec toi.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Ton besoin change selon ton niveau : poser les bases, tenir une cadence, ou professionnaliser ta chaîne. Streamnco met l'accent sur ce qui compte pour toi, au bon moment.
            </p>
          </FadeIn>

          <FadeIn delay={0.12} className="mt-8 flex flex-wrap gap-2">
            {SOLUTIONS.map((solution) => (
              <a
                key={solution.id}
                href={`#${solution.id}`}
                className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
              >
                {solution.label}
              </a>
            ))}
          </FadeIn>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {SOLUTIONS.map((solution, index) => (
            <FadeIn key={solution.id} delay={index * 0.08}>
              <section
                id={solution.id}
                className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#0d1116] p-6 md:p-7"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", toneClasses[solution.tone])}>
                  <solution.icon className="h-6 w-6" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {solution.label}
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground">
                  {solution.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {solution.description}
                </p>

                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    À prioriser
                  </p>
                  <div className="mt-3 space-y-2">
                    {solution.focus.map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Point de départ
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {solution.startingPoint}
                  </p>
                </div>
              </section>
            </FadeIn>
          ))}
        </div>

        <FadeIn className="mt-14">
          <section className="grid overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1116] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/[0.06] p-7 md:p-9 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Parcours recommandé</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                Créer, organiser, analyser, progresser.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                La bonne solution n'est pas une page différente pour chaque profil : c'est un produit qui met l'accent sur le bon module au bon moment.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => openAuthModal("signup")} className="gap-2">
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-px bg-white/[0.055] sm:grid-cols-2">
              {[
                { icon: Clapperboard, label: "Clips réseaux", copy: "Transformer les moments Twitch en assets verticaux." },
                { icon: Palette, label: "Studio visuel", copy: "Maintenir une image de chaîne plus cohérente." },
                { icon: TrendingUp, label: "StreamScore", copy: "Lire les signaux Twitch sans dashboard brut." },
                { icon: Sparkles, label: "Live Studio", copy: "Préparer titres, planning et intentions de live." },
              ].map(({ icon: Icon, label, copy }) => (
                <div key={label} className="bg-[#0d1116] p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-base font-semibold text-foreground">{label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>
      </main>

      <LandingFooter />
    </div>
  );
};

export default SolutionsPage;
