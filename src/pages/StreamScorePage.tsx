import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity, BarChart2, Calendar, Check,
  Clapperboard, Eye, ListChecks, TrendingUp,
} from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import DiagnosticForm from "@/components/site/DiagnosticForm";
import { usePageMeta } from "@/hooks/usePageMeta";

const AnimBar = ({ val, delay }: { val: number; delay: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-1.5 overflow-hidden rounded-full bg-el-strong">
      <motion.div
        className="h-full rounded-full bg-el-ink"
        initial={{ width: 0 }}
        animate={inView ? { width: `${val}%` } : {}}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      />
    </div>
  );
};

const ScoreRing = ({ score, size = 120 }: { score: number; size?: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div ref={ref} style={{ width: size, height: size }} className="relative shrink-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={size * 0.05} className="stroke-el-hairline" />
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          strokeWidth={size * 0.05} strokeLinecap="round" className="stroke-el-ink"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={inView ? { strokeDashoffset: circ * (1 - score / 100) } : {}}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-el-display font-light tabular-nums text-el-ink" style={{ fontSize: size * 0.26 }}>{score}</span>
        <span className="font-el-sans font-semibold uppercase tracking-widest text-el-muted" style={{ fontSize: size * 0.07 }}>/ 100</span>
      </div>
    </div>
  );
};

const DIMENSIONS = [
  { icon: Calendar, tint: "bg-el-mint", label: "Régularité", description: "Analyse la fréquence de tes streams, les jours actifs et la cohérence de ton planning.", detail: "Un streamer régulier construit une habitude chez ses viewers. Sans planning stable, la croissance reste aléatoire." },
  { icon: Clapperboard, tint: "bg-el-peach", label: "Contenu", description: "Analyse ta capacité à transformer tes lives en moments forts, clips et contenus réutilisables.", detail: "Un live ne dure que quelques heures. Un clip ou une VOD continue d'exister et d'attirer des viewers bien après." },
  { icon: Eye, tint: "bg-el-sky", label: "Visibilité", description: "Analyse les signaux qui peuvent aider ta chaîne à être plus facilement découverte.", detail: "La visibilité repose sur des signaux comme la stabilité de ta catégorie, tes titres et ta cohérence de positionnement." },
  { icon: TrendingUp, tint: "bg-el-lavender", label: "Progression", description: "Analyse les signaux d'évolution de ta chaîne pour comprendre si tu avances, stagnes ou régresses.", detail: "Un score de progression mesure la dynamique de la chaîne sur les 7 et 30 derniers jours — pas juste une photo figée." },
];

const OUTPUTS = [
  { icon: BarChart2, tint: "bg-el-mint", title: "Une note claire", body: "Pour savoir immédiatement où ta chaîne se situe — sans interpréter des dizaines de métriques." },
  { icon: Activity, tint: "bg-el-peach", title: "Un diagnostic par dimension", body: "Pour comprendre ce qui fonctionne et ce qui bloque, dimension par dimension." },
  { icon: ListChecks, tint: "bg-el-lavender", title: "Des recommandations concrètes", body: "Pour savoir quoi améliorer en priorité, avec le levier le plus impactant d'abord." },
  { icon: Check, tint: "bg-el-rose", title: "Un plan d'action", body: "Pour transformer l'analyse en prochaines étapes simples, actionnables dès aujourd'hui." },
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
  { q: "Le StreamScore est-il gratuit ?", a: "Oui, l'analyse de base peut être lancée gratuitement. Entre ton pseudo Twitch, Streamnco génère un premier diagnostic sans compte requis." },
  { q: "Comment le StreamScore m'aide à gagner des viewers ?", a: "Il met en lumière tes leviers de croissance prioritaires et te dit quoi améliorer en premier — régularité, contenu, positionnement." },
  { q: "Est-ce que Streamnco est connecté à Twitch ?", a: "Streamnco analyse les données disponibles de ta chaîne Twitch. Le diagnostic de base utilise les données publiques. Le suivi complet utilise les données authentifiées." },
  { q: "À quelle fréquence vérifier son StreamScore ?", a: "Idéalement après plusieurs streams ou chaque semaine, pour suivre l'évolution de ta régularité, de ton contenu et de ta progression." },
  { q: "Un mauvais StreamScore veut dire que ma chaîne est mauvaise ?", a: "Non. Un score faible indique surtout qu'il existe des axes d'amélioration clairs. C'est un point de départ, pas un jugement." },
];

const StreamScorePage = () => {
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
        mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  });

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
          <Orb color="bg-el-mint" className="left-1/4 top-12 h-[26rem] w-[26rem] opacity-50" />
          <Orb color="bg-el-sky" className="right-[-4rem] top-24 h-[24rem] w-[24rem] opacity-50" animate="fast" />
          <Container className="relative text-center">
            <Reveal>
              <Eyebrow className="justify-center"><Activity className="h-3.5 w-3.5" /> Concept Streamnco</Eyebrow>
              <h1 className="mx-auto mt-5 max-w-3xl font-el-display text-[clamp(2rem,5.2vw,3.75rem)] font-light leading-[1.06] tracking-[-0.03em] text-el-ink">
                StreamScore : le score de progression de ta chaîne Twitch
              </h1>
              <p className="mx-auto mt-5 max-w-xl font-el-sans text-[17px] leading-[1.6] text-el-body">
                Streamnco analyse ta chaîne et génère un StreamScore pour comprendre où tu en es, ce qui bloque ta progression et quelles actions prioriser.
              </p>
            </Reveal>
            <Reveal delay={120} className="mt-8">
              <DiagnosticForm />
              <p className="mt-4 font-el-sans text-[14px] text-el-muted">
                Gratuit · sans compte · résultat en 60 s —{" "}
                <a href="#comment" className="text-el-ink underline underline-offset-4 hover:opacity-80">voir comment ça marche</a>
              </p>
            </Reveal>
            <Reveal delay={220} className="relative mt-14 flex justify-center">
              <Orb color="bg-el-peach" className="left-1/2 top-1/2 h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 opacity-60" />
              <div className="relative">
                <ScoreRing score={74} size={170} />
              </div>
            </Reveal>
          </Container>
        </section>

        {/* Définition */}
        <section className="border-t border-el-hairline bg-el-canvas-soft py-20 md:py-28">
          <Container className="max-w-3xl">
            <Reveal>
              <Eyebrow>Définition</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">
                Qu'est-ce que le StreamScore ?
              </h2>
              <div className="mt-6 space-y-4 font-el-sans text-[17px] leading-[1.65] text-el-body">
                <p>Le StreamScore est un score généré par Streamnco pour mesurer la <span className="text-el-ink">santé globale d'une chaîne Twitch</span>.</p>
                <p>Il ne sert pas seulement à donner une note. Il transforme les données de ta chaîne en <span className="text-el-ink">diagnostic clair</span>, puis en <span className="text-el-ink">plan d'action concret</span>.</p>
                <p>L'objectif : t'aider à progresser stream après stream, sans te perdre dans des statistiques brutes.</p>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* 4 dimensions */}
        <section className="py-20 md:py-28">
          <Container>
            <Reveal className="mb-12 text-center">
              <h2 className="font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light tracking-[-0.02em] text-el-ink">Les dimensions analysées</h2>
              <p className="mx-auto mt-3 max-w-md font-el-sans text-[16px] text-el-body">Quatre axes complémentaires pour une lecture complète de ta progression.</p>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2">
              {DIMENSIONS.map((d, i) => (
                <Reveal key={d.label} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-el-hairline bg-el-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-el-hairline-strong hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${d.tint} text-el-ink`}><d.icon className="h-5 w-5" /></span>
                      <h3 className="font-el-sans text-[18px] font-medium text-el-ink">{d.label}</h3>
                    </div>
                    <p className="mt-4 font-el-sans text-[15px] font-medium text-el-ink">{d.description}</p>
                    <p className="mt-2 font-el-sans text-[14px] leading-[1.6] text-el-body">{d.detail}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Méthodologie */}
        <section id="comment" className="border-t border-el-hairline bg-el-canvas-soft py-20 md:py-28">
          <Container className="max-w-3xl">
            <Reveal>
              <Eyebrow>Méthodologie</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">Comment est calculé le StreamScore ?</h2>
              <p className="mt-5 font-el-sans text-[17px] leading-[1.6] text-el-body">Le StreamScore est calculé à partir de plusieurs signaux issus de ta chaîne Twitch. Streamnco observe notamment :</p>
              <ul className="mt-5 space-y-3">
                {SIGNALS.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 font-el-sans text-[15px] text-el-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-el-ink text-[11px] font-bold text-el-on-dark">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-el-sans text-[14px] leading-[1.6] text-el-muted">
                Quand un signal est manquant, il est neutralisé plutôt qu'artificiellement gonflé — pour garantir un score honnête.
              </p>
            </Reveal>
          </Container>
        </section>

        {/* Ce que tu obtiens */}
        <section className="py-20 md:py-28">
          <Container>
            <Reveal className="mb-12 text-center">
              <h2 className="font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light tracking-[-0.02em] text-el-ink">Ce que tu obtiens après ton analyse</h2>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {OUTPUTS.map((o, i) => (
                <Reveal key={o.title} delay={i * 70}>
                  <div className="h-full rounded-2xl border border-el-hairline bg-el-card p-6 transition-colors hover:border-el-hairline-strong">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${o.tint} text-el-ink`}><o.icon className="h-5 w-5" /></span>
                    <h3 className="mt-4 font-el-sans text-[16px] font-medium text-el-ink">{o.title}</h3>
                    <p className="mt-2 font-el-sans text-[14px] leading-[1.6] text-el-body">{o.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Exemple de lecture */}
        <section className="border-t border-el-hairline bg-el-canvas-soft py-20 md:py-28">
          <Container className="max-w-3xl">
            <Reveal>
              <Eyebrow>Exemple concret</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light tracking-[-0.02em] text-el-ink">Exemple de lecture</h2>
            </Reveal>
            <Reveal delay={100} className="mt-8">
              <div className="rounded-2xl border border-el-hairline bg-el-card p-6 md:p-8">
                <div className="flex items-center gap-5 border-b border-el-hairline pb-6">
                  <ScoreRing score={48} size={100} />
                  <div>
                    <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-el-muted">StreamScore global</p>
                    <p className="mt-1 font-el-display text-[28px] font-light text-el-ink">48 / 100</p>
                    <p className="mt-1 font-el-sans text-[15px] text-el-body">En construction — des axes clairs à améliorer.</p>
                  </div>
                </div>
                <div className="mt-6 space-y-5">
                  {[
                    { label: "Régularité", score: 72, comment: "Tu streams souvent, mais ton planning manque encore de cohérence." },
                    { label: "Contenu", score: 34, comment: "Tes lives existent, mais tes meilleurs moments ne sont pas assez transformés en contenu." },
                    { label: "Visibilité", score: 41, comment: "Ta chaîne manque de signaux qui facilitent la découverte." },
                  ].map((d, i) => (
                    <div key={d.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-el-sans text-[15px] font-medium text-el-ink">{d.label}</span>
                        <span className="font-el-sans text-[15px] font-semibold tabular-nums text-el-ink">{d.score}/100</span>
                      </div>
                      <AnimBar val={d.score} delay={0.3 + i * 0.1} />
                      <p className="mt-1.5 font-el-sans text-[13px] leading-[1.55] text-el-body">{d.comment}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-start gap-3 rounded-xl bg-el-dark p-4 text-el-on-dark">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-el-mint" />
                  <div>
                    <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-el-on-dark-soft">Priorité recommandée</p>
                    <p className="mt-1 font-el-sans text-[15px] leading-[1.55] text-el-on-dark">
                      Commencer par clipper et republier tes meilleurs moments pour créer plus de points d'entrée vers ta chaîne.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* Pourquoi utile */}
        <section className="py-20 md:py-28">
          <Container className="max-w-3xl">
            <Reveal>
              <h2 className="font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light tracking-[-0.02em] text-el-ink">Pourquoi le StreamScore est utile ?</h2>
              <p className="mt-4 font-el-sans text-[17px] leading-[1.6] text-el-body">Beaucoup de streamers savent qu'ils doivent progresser, mais ne savent pas exactement où agir.</p>
            </Reveal>
            <Reveal delay={100} className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-el-hairline bg-el-card p-6">
                <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-el-muted">Sans StreamScore</p>
                <p className="mt-2 font-el-display text-[22px] font-light leading-snug text-el-ink">« Je dois faire mieux. »</p>
                <p className="mt-2 font-el-sans text-[15px] text-el-body">Vague. Pas actionnable. Tu ne sais pas par où commencer.</p>
              </div>
              <div className="rounded-2xl bg-el-dark p-6 text-el-on-dark">
                <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-el-on-dark-soft">Avec StreamScore</p>
                <p className="mt-2 font-el-display text-[22px] font-light leading-snug text-el-on-dark">« J'améliore ma régularité, j'exploite mes clips, je structure mon planning. »</p>
                <p className="mt-2 font-el-sans text-[15px] text-el-on-dark-soft">Précis. Priorisé. Actionnable dès aujourd'hui.</p>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* FAQ */}
        <section className="border-t border-el-hairline bg-el-canvas-soft py-20 md:py-28">
          <Container className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-4 font-el-display text-[clamp(1.9rem,3.5vw,2.5rem)] font-light tracking-[-0.02em] text-el-ink">Questions fréquentes</h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="divide-y divide-el-hairline border-t border-el-hairline">
                {FAQ.map((item) => (
                  <details key={item.q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-el-sans text-[17px] font-medium text-el-ink">
                      {item.q}
                      <span className="text-el-muted transition-transform group-open:rotate-45">＋</span>
                    </summary>
                    <p className="mt-3 font-el-sans text-[15px] leading-[1.65] text-el-body">{item.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </Container>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden bg-el-dark py-24">
          <Orb color="bg-el-mint" className="left-[-6rem] top-0 h-[24rem] w-[24rem] opacity-25" />
          <Orb color="bg-el-peach" className="bottom-[-8rem] right-0 h-[26rem] w-[26rem] opacity-20" animate="fast" />
          <Container className="relative text-center">
            <Reveal>
              <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-el-on-dark-soft">Gratuit · sans compte</p>
              <h2 className="mx-auto mt-3 max-w-2xl font-el-display text-[clamp(2.2rem,4.5vw,3.25rem)] font-light leading-[1.08] tracking-[-0.02em] text-el-on-dark">
                Découvre ton StreamScore
              </h2>
              <p className="mx-auto mt-4 max-w-md font-el-sans text-[17px] leading-[1.6] text-el-on-dark-soft">
                Entre ton pseudo Twitch et obtiens une analyse claire de ta chaîne en quelques secondes.
              </p>
              <DiagnosticForm tone="dark" className="mt-8" />
              <p className="mt-4 font-el-sans text-[14px] text-el-on-dark-soft">
                Gratuit · sans compte —{" "}
                <Link to="/fonctionnalites" className="text-el-on-dark underline underline-offset-4 hover:opacity-80">voir les fonctionnalités</Link>
              </p>
            </Reveal>
          </Container>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
};

export default StreamScorePage;
