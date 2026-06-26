import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clapperboard,
  ListChecks,
  Palette,
  Radio,
  Target,
  Users,
} from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { usePageMeta } from "@/hooks/usePageMeta";

const NAV_ANCHORS = [
  { label: "Créer", href: "#creer" },
  { label: "Organiser", href: "#organiser" },
  { label: "Analyser", href: "#analyser" },
  { label: "Progresser", href: "#progresser" },
];

const CREATION_FEATURES = ["Clip Twitch, VOD ou upload", "Vertical 9:16", "Facecam + gameplay", "Sous-titres automatiques", "Styles de captions", "Téléchargement du clip"];

// Real aspect ratios so each format reads true (a square post is square,
// a banner is wide, a story is tall). wide = width-bound, else height-bound.
const VISUAL_FORMATS = [
  { label: "Bannière Twitch", dim: "1200 × 480", ratio: "1200 / 480", tint: "bg-el-mint", wide: true },
  { label: "Story / Reel", dim: "1080 × 1920", ratio: "1080 / 1920", tint: "bg-el-lavender", wide: false },
  { label: "Post carré", dim: "1080 × 1080", ratio: "1 / 1", tint: "bg-el-peach", wide: false },
  { label: "Annonce live", dim: "1920 × 1080", ratio: "1920 / 1080", tint: "bg-el-sky", wide: true },
  { label: "Cover / header", dim: "1500 × 500", ratio: "1500 / 500", tint: "bg-el-rose", wide: true },
  { label: "Écran offline", dim: "1920 × 1080", ratio: "1920 / 1080", tint: "bg-el-mint", wide: true },
];

const FeaturePanel = ({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  tint = "bg-el-strong",
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  tint?: string;
}) => (
  <section id={id} className="scroll-mt-28 rounded-2xl border border-el-hairline bg-el-card p-6 md:p-8">
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div className="max-w-xl">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint} text-el-ink`}>
            <Icon className="h-5 w-5" />
          </span>
          <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-muted">{eyebrow}</p>
        </div>
        <h3 className="mt-4 font-el-display text-[26px] font-light leading-[1.18] tracking-[-0.01em] text-el-ink">{title}</h3>
        <p className="mt-3 font-el-sans text-[15px] leading-[1.6] text-el-body">{description}</p>
      </div>
      {children ? <div className="w-full md:max-w-sm">{children}</div> : null}
    </div>
  </section>
);

const GroupHead = ({ kicker, title, lead }: { kicker: string; title: string; lead: string }) => (
  <Reveal>
    <div className="mb-7 grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
      <div>
        <Eyebrow>{kicker}</Eyebrow>
        <h2 className="mt-3 font-el-display text-[clamp(1.9rem,3.5vw,2.5rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">{title}</h2>
      </div>
      <p className="font-el-sans text-[16px] leading-[1.6] text-el-body">{lead}</p>
    </div>
  </Reveal>
);

const FeaturesPage = () => {
  const { openAuthModal } = useAuthModal();

  usePageMeta({
    title: "Fonctionnalités — Streamnco",
    description:
      "Clipping 9:16, visuels prêts à poster et suivi de progression : tout ce qu'il faut pour faire grandir ta chaîne Twitch.",
    canonical: "https://streamnco.fr/fonctionnalites",
    ogUrl: "https://streamnco.fr/fonctionnalites",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-12 md:pt-44 md:pb-16">
        <Orb color="bg-el-lavender" className="left-[-6rem] top-12 h-[26rem] w-[26rem] opacity-50" />
        <Orb color="bg-el-sky" className="right-[-6rem] top-24 h-[26rem] w-[26rem] opacity-50" animate="fast" />
        <Container className="relative">
          <Reveal className="max-w-3xl">
            <Eyebrow>Fonctionnalités</Eyebrow>
            <h1 className="mt-5 font-el-display text-[clamp(2rem,5.5vw,4rem)] font-light leading-[1.05] tracking-[-0.03em] text-el-ink">
              Tout ce qu'il faut pour faire grandir ta chaîne.
            </h1>
            <p className="mt-5 max-w-2xl font-el-sans text-[17px] leading-[1.6] text-el-body">
              Des clips prêts à poster, des visuels en un clic et une vision claire de ta progression — plus tout ce qui t'aide à publier vite et régulièrement.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {NAV_ANCHORS.map((a) => (
                <a key={a.href} href={a.href} className="rounded-full border border-el-hairline bg-el-card px-4 py-2 font-el-sans text-[14px] text-el-body transition-colors hover:border-el-hairline-strong hover:text-el-ink">
                  {a.label}
                </a>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => openAuthModal("signup")} className="inline-flex h-11 items-center gap-2 rounded-full bg-el-ink px-6 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
                Essayer gratuitement <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/pricing" className="inline-flex h-11 items-center rounded-full border border-el-hairline-strong px-6 font-el-sans text-[15px] font-medium text-el-ink transition-colors hover:bg-el-strong">
                Voir les tarifs
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <main className="pb-24">
        <Container className="space-y-20">
          {/* Créer */}
          <section id="creer" className="scroll-mt-28">
            <GroupHead kicker="Créer" title="Des assets propres, sans repartir de zéro." lead="Une source réelle, un format clair, un export prêt à poster que tu publies où tu veux, quand tu veux." />
            <div className="grid gap-4">
              <Reveal>
                <FeaturePanel tint="bg-el-peach" icon={Clapperboard} eyebrow="Clipping" title="Transforme tes moments Twitch en vidéos verticales 9:16." description="Tu pars d'un Clip Twitch, d'une VOD ou d'un upload. Streamnco assemble un format vertical avec facecam, gameplay, sous-titres et styles de captions, puis te laisse télécharger le résultat.">
                  <div className="flex items-stretch gap-3">
                    {/* 9:16 clip mock */}
                    <div className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-xl bg-el-dark shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-el-lavender/40 to-el-sky/30" />
                      <span className="absolute right-2 top-2 h-7 w-7 rounded-full bg-el-peach ring-2 ring-white/70" />
                      <div className="absolute inset-x-2 bottom-2 space-y-1">
                        <div className="h-2 w-3/4 rounded-full bg-white/85" />
                        <div className="h-2 w-1/2 rounded-full bg-el-mint" />
                      </div>
                      <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
                        <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-el-ink" />
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
                      {CREATION_FEATURES.map((f) => (
                        <div key={f} className="flex items-center gap-2 rounded-lg border border-el-hairline bg-el-canvas px-3 py-1.5 text-[12.5px] text-el-body">
                          <Check className="h-3.5 w-3.5 shrink-0 text-el-ink" /> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </FeaturePanel>
              </Reveal>
              <Reveal delay={80}>
                <FeaturePanel tint="bg-el-lavender" icon={Palette} eyebrow="Studio visuel" title="Génère des visuels Twitch et sociaux aux bonnes dimensions." description="Le Studio visuel produit plusieurs variantes par génération, sur les formats pensés pour l'écosystème streamer : live, profil, réseaux, covers et écrans.">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {VISUAL_FORMATS.map((f) => (
                      <div key={f.label} className="group rounded-xl border border-el-hairline bg-el-canvas p-3 transition-colors hover:border-el-hairline-strong">
                        <div className="flex h-20 items-center justify-center">
                          <div
                            className={`${f.wide ? "w-full" : "h-full"} max-h-full max-w-full rounded-md ${f.tint} shadow-[0_4px_12px_-4px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.05] transition-transform duration-300 group-hover:scale-[1.05]`}
                            style={{ aspectRatio: f.ratio }}
                          />
                        </div>
                        <p className="mt-2.5 text-[12.5px] font-medium leading-tight text-el-ink">{f.label}</p>
                        <p className="text-[11px] tabular-nums text-el-muted">{f.dim}</p>
                      </div>
                    ))}
                  </div>
                </FeaturePanel>
              </Reveal>
            </div>
          </section>

          {/* Organiser */}
          <section id="organiser" className="scroll-mt-28">
            <GroupHead kicker="Organiser" title="Une file claire avant publication." lead="Tes contenus prêts, tes brouillons et tes exports restent visibles au même endroit — prêts à télécharger et publier en un clic." />
            <div className="grid gap-4 lg:grid-cols-2">
              <Reveal>
                <FeaturePanel tint="bg-el-sky" icon={ListChecks} eyebrow="File de contenu" title="Retrouve clips, visuels et brouillons au même endroit." description="Un clip généré ou un visuel préparé n'est pas perdu dans un dossier. Il rejoint une file où tu distingues ce qui est prêt, ce qui demande une vérification et ce qui reste en brouillon.">
                  <div className="space-y-2">
                    {["Clip vertical prêt", "Visuel annonce live", "Brouillon de publication"].map((item, i) => (
                      <div key={item} className="flex items-center justify-between rounded-lg border border-el-hairline bg-el-canvas px-3 py-2">
                        <span className="text-[13px] text-el-ink">{item}</span>
                        <span className="text-[11px] text-el-muted">0{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </FeaturePanel>
              </Reveal>
              <Reveal delay={80}>
                <FeaturePanel tint="bg-el-rose" icon={Radio} eyebrow="Export & publication" title="Prêt à poster, partout où tu es présent." description="Tes clips et visuels s'exportent aux bons formats pour TikTok, Reels, Shorts, Twitch et X. Tu télécharges et tu publies où tu veux — tu gardes le contrôle total.">
                  <div className="grid grid-cols-2 gap-2">
                    {["TikTok", "Reels", "Shorts", "Twitch", "X / Twitter", "Discord"].map((d) => (
                      <div key={d} className="flex items-center gap-2 rounded-lg border border-el-hairline bg-el-canvas px-3 py-2 text-[13px] text-el-ink">
                        <Check className="h-3.5 w-3.5 text-el-ink" /> {d}
                      </div>
                    ))}
                  </div>
                </FeaturePanel>
              </Reveal>
            </div>
          </section>

          {/* Analyser */}
          <section id="analyser" className="scroll-mt-28">
            <GroupHead kicker="Analyser" title="Des données Twitch transformées en priorités." lead="Tes stats Twitch deviennent des priorités claires : tu sais exactement quoi faire au prochain live pour progresser." />
            <div className="grid gap-4 lg:grid-cols-2">
              <Reveal>
                <FeaturePanel tint="bg-el-mint" icon={Activity} eyebrow="StreamScore" title="Un score global, des dimensions et une progression." description="Analyse une chaîne Twitch, comprends ses dimensions de progression, consulte l'historique et transforme le diagnostic en recommandations concrètes.">
                  <div className="rounded-xl border border-el-hairline bg-el-canvas p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-el-display text-[48px] font-light leading-none text-el-ink">73</p>
                        <p className="mt-1 text-[13px] text-el-muted">Score global</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {["Régularité", "Contenu", "Positionnement"].map((label, i) => (
                        <div key={label}>
                          <div className="mb-1 flex justify-between text-[11px] text-el-muted">
                            <span>{label}</span>
                            <span>{[78, 54, 69][i]}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-el-strong">
                            <div className="h-full rounded-full bg-el-ink" style={{ width: `${[78, 54, 69][i]}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FeaturePanel>
              </Reveal>
              <Reveal delay={80}>
                <FeaturePanel tint="bg-el-peach" icon={Users} eyebrow="Benchmark" title="Compare ta chaîne à d'autres streamers." description="Le benchmark aide à identifier les écarts visibles : catégorie, rythme, contenus, positionnement. L'objectif est de repérer des opportunités, pas de copier.">
                  <div className="space-y-2">
                    {[{ rank: "#1", name: "Streamer A", score: 82 }, { rank: "#2", name: "Ta chaîne", score: 73 }, { rank: "#3", name: "Streamer B", score: 68 }].map((row) => (
                      <div key={row.name} className="flex items-center justify-between rounded-lg border border-el-hairline bg-el-canvas px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[13px] font-bold text-el-ink">{row.rank}</span>
                          <span className="text-[13px] text-el-body">{row.name}</span>
                        </div>
                        <span className="text-[13px] font-semibold text-el-muted">{row.score}</span>
                      </div>
                    ))}
                  </div>
                </FeaturePanel>
              </Reveal>
            </div>
          </section>

          {/* Progresser */}
          <section id="progresser" className="scroll-mt-28">
            <GroupHead kicker="Progresser" title="Prépare le prochain live avec plus d'intention." lead="Les recommandations, le plan d'action, les titres et le planning transforment l'analyse en prochaine action." />
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <Reveal>
                <FeaturePanel tint="bg-el-lavender" icon={CalendarDays} eyebrow="Live Studio" title="Titres, planning et setup live dans un espace plus calme." description="Prépare tes prochains lives avec des titres, un planning, des checklists et des intentions de contenu. Le but : arriver en live avec une direction claire.">
                  <div className="space-y-2">
                    {["Générateur de titres", "Planning", "Setup live", "Moments à provoquer"].map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-lg border border-el-hairline bg-el-canvas px-3 py-2 text-[13px] text-el-ink">
                        <Target className="h-3.5 w-3.5 text-el-ink" /> {item}
                      </div>
                    ))}
                  </div>
                </FeaturePanel>
              </Reveal>
              <Reveal delay={80}>
                <section className="h-full rounded-2xl bg-el-dark p-7 text-el-on-dark md:p-8">
                  <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-el-on-dark-soft">Plan d'action</p>
                  <h3 className="mt-3 font-el-display text-[26px] font-light leading-[1.18] tracking-[-0.01em] text-el-on-dark">
                    Une recommandation ne vaut que si elle devient une tâche.
                  </h3>
                  <p className="mt-3 font-el-sans text-[15px] leading-[1.6] text-el-on-dark-soft">
                    Streamnco relie les signaux Twitch à des actions concrètes : produire un clip, retravailler un titre, stabiliser un créneau, tester une catégorie ou préparer un visuel.
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {["Recommandations", "Plan d'action", "Titres", "Planning"].map((item) => (
                      <div key={item} className="rounded-lg bg-el-dark-elevated px-3 py-2 text-[14px] text-el-on-dark">{item}</div>
                    ))}
                  </div>
                </section>
              </Reveal>
            </div>
          </section>

          {/* Summary CTA */}
          <Reveal>
            <section className="relative overflow-hidden rounded-2xl bg-el-dark p-10 text-center md:p-14">
              <Orb color="bg-el-sky" className="right-[-4rem] top-[-4rem] h-[18rem] w-[18rem] opacity-25" />
              <p className="relative font-el-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-el-on-dark-soft">Résumé</p>
              <h2 className="relative mx-auto mt-3 max-w-2xl font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.1] tracking-[-0.02em] text-el-on-dark">
                Crée plus vite, publie plus souvent, vois ta chaîne grandir.
              </h2>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={() => openAuthModal("signup")} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-el-on-dark px-7 font-el-sans text-[16px] font-medium text-el-ink transition-opacity hover:opacity-90">
                  Essayer gratuitement <ArrowRight className="h-4 w-4" />
                </button>
                <Link to="/solutions" className="inline-flex h-12 items-center justify-center rounded-full border border-el-on-dark-soft/40 px-7 font-el-sans text-[16px] font-medium text-el-on-dark transition-colors hover:bg-white/10">
                  Voir les solutions
                </Link>
              </div>
            </section>
          </Reveal>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
};

export default FeaturesPage;
