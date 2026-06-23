import { Link } from "react-router-dom";
import { ArrowRight, Check, Clapperboard, Compass, Palette, Sparkles, Target, TrendingUp } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { usePageMeta } from "@/hooks/usePageMeta";

const SOLUTIONS = [
  {
    id: "debutant",
    icon: Compass,
    label: "Débutant",
    title: "Savoir quoi améliorer et créer tes premiers contenus propres.",
    description: "Pas besoin d'un outil compliqué. Une méthode simple : comprendre ta chaîne, sortir tes premiers clips et visuels propres, et arriver en live avec plus d'intention.",
    focus: ["Premier diagnostic Twitch", "Premiers clips verticaux", "Visuels de base propres"],
    startingPoint: "Lancer un diagnostic puis créer un premier clip 9:16.",
  },
  {
    id: "intermediaire",
    icon: TrendingUp,
    label: "Intermédiaire",
    title: "Tu streams déjà et tu veux publier plus régulièrement.",
    description: "Le problème n'est plus de commencer, c'est de tenir le rythme. Streamnco transforme tes lives en assets, range tes brouillons et t'aide à tenir une cadence réaliste.",
    focus: ["Clips Twitch / VOD / upload", "File de contenu", "Studio visuel multi-formats"],
    startingPoint: "Mettre en place une file de contenu hebdomadaire.",
  },
  {
    id: "confirme",
    icon: Target,
    label: "Confirmé",
    title: "Professionnaliser ton image, suivre tes perfs, optimiser ta croissance.",
    description: "Tu as déjà des stats, des concurrents et une audience à comprendre. Streamnco devient ton centre de pilotage : création, benchmark, StreamScore, recommandations et préparation live.",
    focus: ["Benchmark concurrentiel", "Historique StreamScore", "Live Studio et plan d'action"],
    startingPoint: "Comparer ta chaîne, prioriser une action et produire les assets liés.",
  },
];

const MODULES = [
  { icon: Clapperboard, label: "Clipping", copy: "Transformer les moments Twitch en assets verticaux." },
  { icon: Palette, label: "Studio visuel", copy: "Maintenir une image de chaîne cohérente." },
  { icon: TrendingUp, label: "StreamScore", copy: "Lire les signaux Twitch sans dashboard brut." },
  { icon: Sparkles, label: "Live Studio", copy: "Préparer titres, planning et intentions de live." },
];

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
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />

      <section className="relative overflow-hidden pt-36 pb-12 md:pt-44 md:pb-16">
        <Orb color="bg-el-peach" className="left-[-6rem] top-12 h-[26rem] w-[26rem] opacity-50" />
        <Orb color="bg-el-mint" className="right-[-6rem] top-24 h-[24rem] w-[24rem] opacity-50" animate="fast" />
        <Container className="relative">
          <Reveal className="max-w-3xl">
            <Eyebrow>Solutions</Eyebrow>
            <h1 className="mt-5 font-el-display text-[clamp(2.4rem,5.5vw,4rem)] font-light leading-[1.05] tracking-[-0.03em] text-el-ink">
              Quel que soit ton niveau, Streamnco grandit avec toi.
            </h1>
            <p className="mt-5 max-w-2xl font-el-sans text-[17px] leading-[1.6] text-el-body">
              Ton besoin change selon ton niveau : poser les bases, tenir une cadence, ou professionnaliser ta chaîne. Streamnco met l'accent sur ce qui compte, au bon moment.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-8 flex flex-wrap gap-2">
            {SOLUTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="rounded-full border border-el-hairline bg-el-card px-4 py-2 font-el-sans text-[14px] text-el-body transition-colors hover:border-el-hairline-strong hover:text-el-ink">
                {s.label}
              </a>
            ))}
          </Reveal>
        </Container>
      </section>

      <main className="pb-24">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {SOLUTIONS.map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <section id={s.id} className="flex h-full scroll-mt-28 flex-col rounded-2xl border border-el-hairline bg-el-card p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-el-strong text-el-ink"><s.icon className="h-6 w-6" /></span>
                  <p className="mt-5 font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-muted">{s.label}</p>
                  <h2 className="mt-3 font-el-display text-[24px] font-light leading-[1.2] tracking-[-0.01em] text-el-ink">{s.title}</h2>
                  <p className="mt-4 font-el-sans text-[15px] leading-[1.6] text-el-body">{s.description}</p>
                  <div className="mt-6 border-t border-el-hairline pt-5">
                    <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-muted">À prioriser</p>
                    <div className="mt-3 space-y-2">
                      {s.focus.map((item) => (
                        <div key={item} className="flex items-center gap-2 rounded-lg border border-el-hairline bg-el-canvas px-3 py-2 text-[14px] text-el-ink">
                          <Check className="h-4 w-4 text-el-ink" /> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl bg-el-strong p-4">
                    <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-muted">Point de départ</p>
                    <p className="mt-2 font-el-sans text-[14px] leading-[1.55] text-el-ink">{s.startingPoint}</p>
                  </div>
                </section>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-14">
            <section className="grid overflow-hidden rounded-2xl bg-el-dark text-el-on-dark lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-white/10 p-8 md:p-10 lg:border-b-0 lg:border-r">
                <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-on-dark-soft">Parcours recommandé</p>
                <h2 className="mt-3 font-el-display text-[clamp(1.9rem,3.5vw,2.5rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-on-dark">
                  Créer, organiser, analyser, progresser.
                </h2>
                <p className="mt-4 font-el-sans text-[15px] leading-[1.6] text-el-on-dark-soft">
                  La bonne solution n'est pas une page par profil : c'est un produit qui met l'accent sur le bon module au bon moment.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => openAuthModal("signup")} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-el-on-dark px-6 font-el-sans text-[15px] font-medium text-el-ink transition-opacity hover:opacity-90">
                    Essayer gratuitement <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link to="/fonctionnalites" className="inline-flex h-11 items-center justify-center rounded-full border border-el-on-dark-soft/40 px-6 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-white/10">
                    Voir les fonctionnalités
                  </Link>
                </div>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                {MODULES.map(({ icon: Icon, label, copy }) => (
                  <div key={label} className="bg-el-dark p-6">
                    <Icon className="h-5 w-5 text-el-on-dark" />
                    <p className="mt-4 font-el-sans text-[16px] font-medium text-el-on-dark">{label}</p>
                    <p className="mt-2 font-el-sans text-[14px] leading-[1.6] text-el-on-dark-soft">{copy}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
};

export default SolutionsPage;
