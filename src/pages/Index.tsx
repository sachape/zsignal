import { Link } from "react-router-dom";
import { ArrowRight, Check, Clapperboard, Palette, Activity, Sparkles } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import PlanCard from "@/components/site/PlanCard";
import DiagnosticForm from "@/components/site/DiagnosticForm";
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
    title: "Clips réseaux",
    body: "Tes meilleurs moments découpés en clips 9:16 prêts pour TikTok, Reels et Shorts — facecam, gameplay et sous-titres compris.",
  },
  {
    icon: Palette,
    title: "Studio visuel",
    body: "Bannières, stories, annonces de live et posts, générés aux bonnes dimensions en quelques secondes. Plus jamais de Canva à 2h du matin.",
  },
  {
    icon: Activity,
    title: "StreamScore",
    body: "Un score clair de ta chaîne, ton blocage n°1 identifié, et un plan d'action concret chaque semaine pour progresser.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Colle ta VOD ou ton clip",
    body: "Une URL Twitch, une VOD ou un upload vidéo suffisent. Aucune installation, aucune config compliquée.",
  },
  {
    n: "02",
    title: "Streamnco produit tout",
    body: "Clips verticaux sous-titrés, visuels aux bons formats, et l'analyse de ta chaîne — pendant que tu fais autre chose.",
  },
  {
    n: "03",
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
              <h1 className="mt-6 font-el-display text-[clamp(2.6rem,6.2vw,4.25rem)] font-light leading-[1.04] tracking-[-0.03em] text-el-ink">
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

          {/* Product showcase */}
          <Reveal delay={200} className="relative mx-auto mt-16 max-w-5xl md:mt-20">
            <div className="overflow-hidden rounded-2xl border border-el-hairline bg-el-card shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)]">
              <div className="flex h-9 items-center gap-1.5 border-b border-el-hairline bg-el-canvas-soft px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-el-hairline-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-el-hairline-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-el-hairline-strong" />
              </div>
              <img src={shotStudio} alt="Aperçu du Studio visuel Streamnco" className="block w-full" loading="lazy" />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────── */}
      <section className="border-y border-el-hairline bg-el-canvas-soft py-10">
        <Container className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-6">
          <div className="flex -space-x-3">
            {[avatar1, avatar2, avatar3].map((a, i) => (
              <img
                key={i}
                src={a}
                alt=""
                className="h-10 w-10 rounded-full border-2 border-el-canvas-soft object-cover"
                loading="lazy"
              />
            ))}
          </div>
          <p className="font-el-sans text-[15px] text-el-body">
            Rejoint par les streamers fondateurs qui veulent percer —{" "}
            <span className="font-medium text-el-ink">offre fondateur, 150 places.</span>
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
                <div className="group h-full rounded-2xl border border-el-hairline bg-el-card p-7 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.18)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-el-strong text-el-ink">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-el-sans text-[20px] font-medium tracking-[-0.01em] text-el-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 font-el-sans text-[15px] leading-[1.6] text-el-body">
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
          <Reveal delay={120} className="flex justify-center">
            <div className="overflow-hidden rounded-2xl border border-el-hairline bg-el-card p-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35)]">
              <img src={shotClip} alt="Clip vertical 9:16 généré par Streamnco" className="block w-full max-w-[300px] rounded-xl" loading="lazy" />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── DEEP DIVE 2 — VISUELS ─────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Orb color="bg-el-lavender" className="right-[-8rem] top-1/4 h-[26rem] w-[26rem] opacity-60" />
        <Container className="relative grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal className="order-2 flex justify-center md:order-1">
            <div className="overflow-hidden rounded-2xl border border-el-hairline bg-el-card shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35)]">
              <img src={shotStudio} alt="Studio visuel Streamnco" className="block w-full" loading="lazy" />
            </div>
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
                <div className="border-t border-el-hairline-strong pt-6">
                  <span className="font-el-display text-[40px] font-light leading-none tracking-[-0.02em] text-el-muted-soft">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-el-sans text-[20px] font-medium tracking-[-0.01em] text-el-ink">
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
