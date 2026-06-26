import { Link } from "react-router-dom";
import { ArrowRight, Check, Clapperboard, Palette, Activity, Sparkles, Star } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import PlanCard from "@/components/site/PlanCard";
import DiagnosticForm from "@/components/site/DiagnosticForm";
import BrowserFrame from "@/components/site/BrowserFrame";
import PhoneFrame from "@/components/site/PhoneFrame";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import shotStudio from "@/assets/shot-studio-visuel.png";
import shotClip from "@/assets/shot-clip-vertical.png";
import avatar1 from "@/assets/avatar-gamer-1.jpg";
import avatar2 from "@/assets/avatar-gamer-2.jpg";
import avatar3 from "@/assets/avatar-gamer-3.jpg";

const HOMEPAGE_FAQ = [
  {
    q: "Que fait Streamnco aujourd'hui ?",
    a: "Streamnco aide les streamers à créer des clips verticaux, générer des visuels, organiser leurs contenus, analyser leur chaîne Twitch et préparer leurs prochains lives.",
  },
  {
    q: "Comment je publie mes clips et visuels sur les réseaux ?",
    a: "Tu récupères tes clips et visuels prêts à poster, optimisés pour TikTok, Reels et Shorts. Tu publies où tu veux, quand tu veux — tu gardes le contrôle total sur ce qui sort et sur ton calendrier.",
  },
  {
    q: "Quels types de clips puis-je transformer ?",
    a: "Tu peux partir d'un Clip Twitch, d'une VOD Twitch ou d'un upload vidéo. L'objectif est de produire un format vertical 9:16 avec facecam, gameplay, sous-titres et export téléchargeable.",
  },
  {
    q: "À quoi sert le Studio visuel ?",
    a: "Il sert à générer des visuels Twitch et réseaux sociaux aux bonnes dimensions : bannière, story verticale, post carré, annonce live, cover/header ou écran offline.",
  },
  {
    q: "Faut-il connecter Twitch pour commencer ?",
    a: "Non pour lancer un premier diagnostic public. La connexion Twitch devient utile pour les usages avancés et le suivi dans le temps.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Pas d'engagement, pas de frais de résiliation. Tu peux annuler depuis ton espace facturation en 1 clic.",
  },
];

const PILLARS = [
  {
    icon: Clapperboard,
    tint: "bg-el-peach",
    title: "Clips réseaux",
    body: "Tes meilleurs moments découpés en clips 9:16 prêts pour TikTok, Reels et Shorts — facecam, gameplay et sous-titres compris.",
  },
  {
    icon: Palette,
    tint: "bg-el-lavender",
    title: "Studio visuel",
    body: "Bannières, stories, annonces de live et posts, générés aux bonnes dimensions en quelques secondes. Plus jamais de Canva à 2h du matin.",
  },
  {
    icon: Activity,
    tint: "bg-el-mint",
    title: "StreamScore",
    body: "Un score clair de ta chaîne, ton blocage n°1 identifié, et un plan d'action concret chaque semaine pour progresser.",
  },
];

const STEPS = [
  {
    n: "01",
    tint: "bg-el-mint",
    title: "Colle ta VOD ou ton clip",
    body: "Une URL Twitch, une VOD ou un upload vidéo suffisent. Aucune installation, aucune config compliquée.",
  },
  {
    n: "02",
    tint: "bg-el-peach",
    title: "Streamnco produit tout",
    body: "Clips verticaux sous-titrés, visuels aux bons formats, et l'analyse de ta chaîne — pendant que tu fais autre chose.",
  },
  {
    n: "03",
    tint: "bg-el-lavender",
    title: "Télécharge et poste",
    body: "Tu récupères des fichiers prêts à publier. Tu gardes le contrôle total sur ce qui sort et sur ton calendrier.",
  },
];

const Index = () => {
  const { openAuthModal } = useAuthModal();
  const signup = () => openAuthModal("signup");

  usePageMeta({
    title: "Streamnco — Transforme tes lives en clips, visuels et croissance",
    description:
      "Streamnco découpe tes lives Twitch en clips verticaux prêts à poster, génère tes visuels et mesure ta croissance. Crée ton compte gratuit.",
    ogTitle: "Streamnco — Le cockpit créatif des streamers",
    ogDescription:
      "Clips 9:16, Studio visuel et StreamScore pour transformer chaque live en vues et abonnés.",
    canonical: "https://streamnco.fr/",
    ogUrl: "https://streamnco.fr/",
    robots: "index, follow",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Streamnco",
        url: "https://streamnco.fr/",
        logo: "https://streamnco.fr/favicon.ico",
        sameAs: ["https://www.instagram.com/streamnco.fr/"],
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Streamnco",
        url: "https://streamnco.fr/",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Cockpit créatif et stratégique pour streamers : clips verticaux, visuels, analyse Twitch et préparation live.",
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: HOMEPAGE_FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  });

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
        <Orb color="bg-el-mint" className="left-[-6rem] top-10 h-[26rem] w-[26rem]" />
        <Orb color="bg-el-peach" className="right-[-8rem] top-24 h-[30rem] w-[30rem]" animate="fast" />
        <Orb color="bg-el-lavender" className="bottom-[-10rem] left-1/3 h-[28rem] w-[28rem]" />

        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow className="justify-center">
                <Sparkles className="h-3.5 w-3.5" /> Le cockpit créatif des streamers
              </Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-el-display text-[clamp(2.1rem,6vw,4.25rem)] font-light leading-[1.04] tracking-[-0.03em] text-el-ink">
                Transforme chaque live en clips, vues et abonnés.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl font-el-sans text-[17px] leading-[1.6] tracking-[0.01em] text-el-body">
                Streamnco découpe tes lives en clips verticaux prêts à poster,
                génère tes visuels Twitch et mesure ta croissance — pendant que
                tu streames.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <DiagnosticForm className="mt-9" />
            </Reveal>
            <Reveal delay={320}>
              <p className="mt-4 font-el-sans text-[14px] text-el-muted">
                Gratuit · sans compte · résultat en 60 s —{" "}
                <button onClick={signup} className="text-el-ink underline underline-offset-4 hover:opacity-80">
                  ou crée ton compte
                </button>
              </p>
            </Reveal>
          </div>

          {/* Product showcase — screenshot in a premium browser frame on a
              pastel pedestal, with floating accent cards */}
          <Reveal delay={200} className="relative mx-auto mt-16 max-w-5xl md:mt-20">
            <Orb color="bg-el-peach" className="left-[12%] top-8 h-[20rem] w-[40%] opacity-60" />
            <Orb color="bg-el-sky" className="right-[10%] top-16 h-[18rem] w-[36%] opacity-50" animate="fast" />
            <div className="relative">
              <BrowserFrame src={shotStudio} alt="Aperçu du Studio visuel Streamnco" url="streamnco.fr/studio-visuel" float />

              {/* Floating accent cards */}
              <div className="absolute -left-4 top-12 hidden animate-el-float rounded-2xl border border-el-hairline bg-el-card/95 px-4 py-3 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.3)] backdrop-blur-sm md:block">
                <p className="font-el-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-el-muted">StreamScore</p>
                <p className="font-el-display text-[28px] font-light leading-none text-el-ink">74<span className="text-[14px] text-el-muted"> / 100</span></p>
              </div>
              <div className="absolute -right-4 bottom-12 hidden animate-el-float-slow items-center gap-2.5 rounded-2xl border border-el-hairline bg-el-card/95 px-4 py-3 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.3)] backdrop-blur-sm md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-el-peach"><Clapperboard className="h-4 w-4 text-el-ink" /></span>
                <div>
                  <p className="font-el-sans text-[13px] font-medium text-el-ink">Clip prêt à poster</p>
                  <p className="font-el-sans text-[11px] text-el-muted">9:16 · sous-titré</p>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────── */}
      <section className="border-y border-el-hairline bg-el-canvas-soft py-9">
        <Container className="flex flex-col items-center justify-center gap-6 text-center sm:flex-row sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[avatar1, avatar2, avatar3].map((a, i) => (
                <img key={i} src={a} alt="" className="h-10 w-10 rounded-full border-2 border-el-canvas-soft object-cover" loading="lazy" />
              ))}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-el-ink text-el-ink" />
                ))}
              </div>
              <span className="mt-1 font-el-sans text-[13px] text-el-muted">Adopté par les premiers fondateurs</span>
            </div>
          </div>
          <span className="hidden h-9 w-px bg-el-hairline-strong sm:block" />
          <p className="font-el-sans text-[15px] text-el-body">
            <span className="font-medium text-el-ink">Offre fondateur</span> — prix bloqués pour les 150 premiers streamers.
          </p>
        </Container>
      </section>

      {/* ── 3 PILIERS ─────────────────────────────────────────────────── */}
      <section id="piliers" className="relative overflow-hidden py-24 md:py-32">
        <Orb color="bg-el-sky" className="right-[-6rem] top-20 h-[24rem] w-[24rem] opacity-50" />
        <Container className="relative">
          <Reveal className="max-w-2xl">
            <Eyebrow>Tout-en-un</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">
              Trois leviers de croissance, un seul outil.
            </h2>
            <p className="mt-4 max-w-xl font-el-sans text-[17px] leading-[1.6] text-el-body">
              Arrête de jongler entre dix logiciels. Streamnco réunit la création,
              le visuel et la stratégie au même endroit.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="group relative h-full overflow-hidden rounded-[20px] border border-el-hairline bg-el-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-el-hairline-strong hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.22)]">
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${p.tint} opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-90`} />
                  <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl ${p.tint} text-el-ink`}>
                    <p.icon className="h-5 w-5" />
                  </span>
                  <h3 className="relative mt-5 font-el-display text-[22px] font-light tracking-[-0.01em] text-el-ink">
                    {p.title}
                  </h3>
                  <p className="relative mt-2.5 font-el-sans text-[15px] leading-[1.6] text-el-body">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── DEEP DIVE 1 — CLIPS ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-el-hairline bg-el-canvas-soft py-24 md:py-32">
        <Orb color="bg-el-peach" className="left-[-8rem] top-1/4 h-[26rem] w-[26rem] opacity-60" />
        <Container className="relative grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal>
            <Eyebrow>Clips réseaux</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(1.9rem,3.6vw,2.5rem)] font-light leading-[1.14] tracking-[-0.02em] text-el-ink">
              Un live de 4 heures. Dix clips qui tournent.
            </h2>
            <p className="mt-4 font-el-sans text-[17px] leading-[1.6] text-el-body">
              Colle ta VOD ou ton clip Twitch. Streamnco repère les moments forts,
              recadre en 9:16, ajoute facecam et sous-titres, et te sort des vidéos
              prêtes pour TikTok, Reels et Shorts.
            </p>
            <ul className="mt-6 space-y-3">
              {["Format vertical 9:16 avec facecam + gameplay", "Sous-titres automatiques et styles de captions", "Export téléchargeable, prêt à poster"].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-el-ink" />
                  <span className="font-el-sans text-[15px] text-el-body">{f}</span>
                </li>
              ))}
            </ul>
            <button onClick={signup} className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-el-ink px-6 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
              Créer mon premier clip <ArrowRight className="h-4 w-4" />
            </button>
          </Reveal>
          <Reveal delay={120} className="relative flex justify-center">
            <Orb color="bg-el-mint" className="left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 opacity-70" />
            <PhoneFrame src={shotClip} alt="Clip vertical 9:16 généré par Streamnco" className="relative animate-el-float-slow" />
          </Reveal>
        </Container>
      </section>

      {/* ── DEEP DIVE 2 — VISUELS ─────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Orb color="bg-el-lavender" className="right-[-8rem] top-1/4 h-[26rem] w-[26rem] opacity-60" />
        <Container className="relative grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal className="relative order-2 flex justify-center md:order-1">
            <Orb color="bg-el-rose" className="left-1/2 top-1/2 h-[20rem] w-[70%] -translate-x-1/2 -translate-y-1/2 opacity-60" />
            <BrowserFrame src={shotStudio} alt="Studio visuel Streamnco" url="streamnco.fr/studio-visuel" className="relative" />
          </Reveal>
          <Reveal delay={120} className="order-1 md:order-2">
            <Eyebrow>Studio visuel</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(1.9rem,3.6vw,2.5rem)] font-light leading-[1.14] tracking-[-0.02em] text-el-ink">
              Des visuels pro, sans ouvrir Photoshop.
            </h2>
            <p className="mt-4 font-el-sans text-[17px] leading-[1.6] text-el-body">
              Bannière Twitch, écran offline, story, annonce de live, post carré —
              choisis un format, Streamnco génère un visuel propre aux bonnes
              dimensions en quelques secondes.
            </p>
            <ul className="mt-6 space-y-3">
              {["Tous les formats Twitch + réseaux sociaux", "Dimensions exactes, zéro recadrage à la main", "Des déclinaisons en un clic"].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-el-ink" />
                  <span className="font-el-sans text-[15px] text-el-body">{f}</span>
                </li>
              ))}
            </ul>
            <button onClick={signup} className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-el-ink px-6 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
              Générer un visuel <ArrowRight className="h-4 w-4" />
            </button>
          </Reveal>
        </Container>
      </section>

      {/* ── COMMENT ÇA MARCHE ─────────────────────────────────────────── */}
      <section id="comment" className="border-t border-el-hairline bg-el-canvas-soft py-24 md:py-32">
        <Container>
          <Reveal className="max-w-2xl">
            <Eyebrow>Comment ça marche</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">
              Trois étapes. Zéro friction.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative pt-7">
                  <span className={`absolute left-0 top-0 h-[3px] w-14 rounded-full ${s.tint}`} />
                  <span className="font-el-display text-[44px] font-light leading-none tracking-[-0.02em] text-el-ink">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-el-display text-[22px] font-light tracking-[-0.01em] text-el-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 font-el-sans text-[15px] leading-[1.6] text-el-body">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── TARIFS ────────────────────────────────────────────────────── */}
      <section id="tarifs" className="relative overflow-hidden py-24 md:py-32">
        <Orb color="bg-el-mint" className="left-1/4 top-10 h-[24rem] w-[24rem] opacity-40" />
        <Container className="relative">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">Tarifs</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.75rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">
              Commence gratuitement. Passe au niveau supérieur quand tu veux.
            </h2>
            <p className="mt-4 font-el-sans text-[16px] text-el-body">
              Offre fondateur en cours — prix bloqués pour les 150 premiers.
            </p>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-5xl items-start gap-5 md:grid-cols-3">
            <Reveal>
              <PlanCard
                name="Gratuit"
                price="0 €"
                onCta={signup}
                features={[
                  "StreamScore calculé instantanément",
                  "5 visuels et 3 clips par mois",
                  "Ton blocage n°1 identifié",
                  "Téléchargement de tes clips et visuels",
                  "Sans carte bancaire",
                ]}
              />
            </Reveal>
            <Reveal delay={90}>
              <PlanCard
                name="Pro"
                price="7,99 €"
                future="12,99 €"
                featured
                badge="Le plus choisi"
                onCta={signup}
                features={[
                  "Tout le plan Gratuit",
                  "100 visuels et 30 clips par mois",
                  "Évolution sur 30, 60 et 90 jours",
                  "Plan d'action personnalisé chaque semaine",
                  "Sous-titres, file de contenu, benchmark",
                ]}
              />
            </Reveal>
            <Reveal delay={180}>
              <PlanCard
                name="Growth"
                price="14,99 €"
                future="24,99 €"
                onCta={signup}
                features={[
                  "Tout le plan Pro",
                  "300 visuels et 200 clips par mois",
                  "Jusqu'à 3 chaînes Twitch",
                  "Benchmark et watchlist avancés",
                  "Support prioritaire + accès anticipé",
                ]}
              />
            </Reveal>
          </div>
          <p className="mt-8 text-center font-el-sans text-[14px] text-el-muted">
            <Link to="/pricing" className="underline-offset-4 hover:underline">Voir le détail des tarifs</Link>
          </p>
        </Container>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-el-hairline bg-el-canvas-soft py-24 md:py-32">
        <Container className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-el-display text-[clamp(2rem,4vw,2.5rem)] font-light leading-[1.12] tracking-[-0.02em] text-el-ink">
              Les questions qu'on nous pose.
            </h2>
            <p className="mt-4 font-el-sans text-[16px] text-el-body">
              Une autre question ?{" "}
              <button onClick={signup} className="text-el-ink underline underline-offset-4">
                Crée ton compte
              </button>{" "}
              et teste par toi-même.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="divide-y divide-el-hairline border-t border-el-hairline">
              {HOMEPAGE_FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-el-sans text-[17px] font-medium text-el-ink">
                    {item.q}
                    <span className="text-el-muted transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-3 font-el-sans text-[15px] leading-[1.65] text-el-body">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-el-dark py-24 md:py-32">
        <Orb color="bg-el-lavender" className="left-[-6rem] top-0 h-[24rem] w-[24rem] opacity-30" />
        <Orb color="bg-el-sky" className="bottom-[-8rem] right-0 h-[26rem] w-[26rem] opacity-25" animate="fast" />
        <Container className="relative text-center">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-el-display text-[clamp(2.2rem,4.5vw,3.25rem)] font-light leading-[1.08] tracking-[-0.02em] text-el-on-dark">
              Ton prochain live mérite mieux qu'une VOD oubliée.
            </h2>
            <p className="mx-auto mt-5 max-w-lg font-el-sans text-[17px] leading-[1.6] text-el-on-dark-soft">
              Crée ton compte gratuit et transforme ton premier live en clips et
              visuels dès aujourd'hui.
            </p>
            <DiagnosticForm tone="dark" className="mt-9" />
            <p className="mt-4 font-el-sans text-[14px] text-el-on-dark-soft">
              Gratuit · sans compte · résultat en 60 s —{" "}
              <button onClick={signup} className="text-el-on-dark underline underline-offset-4 hover:opacity-80">
                ou crée ton compte
              </button>
            </p>
          </Reveal>
        </Container>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
