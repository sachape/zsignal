import { useRef, useState, useEffect, type CSSProperties } from "react";
import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import PreviewSection from "@/components/PreviewSection";
import ForWhoSection from "@/components/ForWhoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import FinalCtaSection from "@/components/FinalCtaSection";
import FooterSection from "@/components/FooterSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ── Marquee data ─────────────────────────────────────────────────────
const SIGNALS_ROW1 = [
  "Cadence de stream",
  "Titres de stream",
  "Catégories jouées",
  "Clips & moments forts",
  "Régularité hebdomadaire",
  "Positionnement de niche",
  "Heure de diffusion",
];
const SIGNALS_ROW2 = [
  "Signaux de croissance",
  "Engagement du chat",
  "Durée des sessions",
  "Progression d'affiliation",
  "Qualité du stream",
  "Analyse de niche",
  "Score de fidélisation",
];

// ── FAQ data ──────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Est-ce que je dois connecter mon compte Twitch ?",
    a: "Non. L'aperçu gratuit fonctionne uniquement à partir de ton nom d'utilisateur public. Aucune connexion, aucune autorisation requise.",
  },
  {
    q: "Est-ce que ça marche si je débute ?",
    a: "Oui. L'outil est conçu pour les streamers de tous niveaux. Si tu streames depuis moins de 3 mois, il t'aide à poser des bases solides avant de chercher à croître.",
  },
  {
    q: "Est-ce que c'est réservé à Twitch ?",
    a: "Pour l'instant, StreamPulse analyse les chaînes Twitch. Le support d'autres plateformes est en cours de développement.",
  },
  {
    q: "Combien de temps ça prend ?",
    a: "L'analyse complète prend moins de 60 secondes. Ton plan d'action est disponible immédiatement après.",
  },
  {
    q: "Est-ce que StreamPulse publie ou modifie quelque chose sur ma chaîne ?",
    a: "Non. L'outil est 100 % en lecture seule. Il n'écrit, ne publie et n'interagit jamais en ton nom.",
  },
];

// ── Inline CSS animations ─────────────────────────────────────────────
const CSS = `
  @keyframes idx-in {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes idx-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
`;

function useVisible(threshold = 0.2) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible: v };
}

function anim(vis: boolean, delay = 0): CSSProperties {
  return vis
    ? { animation: `idx-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }
    : { opacity: 0 };
}

// ── Signals marquee ───────────────────────────────────────────────────
function SignalsSection() {
  const { ref, visible } = useVisible(0.1);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-border/50 py-24"
    >
      <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-12 text-center" style={anim(visible, 0)}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{ animation: "idx-pulse 2s ease-in-out infinite" }}
            />
            Sous le capot
          </span>
          <h2 className="mx-auto mt-4 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Ce que l'outil analyse
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            StreamPulse croise plusieurs signaux pour te donner un diagnostic
            complet et actionnable de ta chaîne.
          </p>
        </div>
      </div>

      {/* Edge-to-edge marquee */}
      <div className="mt-2 space-y-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex gap-3">
          <div className="flex shrink-0 animate-marquee gap-3 whitespace-nowrap">
            {[...SIGNALS_ROW1, ...SIGNALS_ROW1].map((signal, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex shrink-0 animate-marquee-reverse gap-3 whitespace-nowrap">
            {[...SIGNALS_ROW2, ...SIGNALS_ROW2].map((signal, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary/80"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ section ───────────────────────────────────────────────────────
function FaqSection() {
  const { ref, visible } = useVisible();

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-border/50 py-28"
    >
      <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-12 text-center" style={anim(visible, 0)}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{ animation: "idx-pulse 2s ease-in-out infinite" }}
            />
            FAQ
          </span>
          <h2 className="mx-auto mt-4 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Questions fréquentes
          </h2>
        </div>

        <div
          className="mx-auto max-w-2xl"
          style={anim(visible, 100)}
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline hover:text-primary">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

// ── Page orchestrator ─────────────────────────────────────────────────
const Index = () => (
  <div className="min-h-screen overflow-x-hidden bg-background">
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    <LandingNav />
    <HeroSection />
    <FeaturesSection />
    <PreviewSection />
    <SignalsSection />
    <ForWhoSection />
    <TestimonialsSection />
    <PricingSection />
    <FaqSection />
    <FinalCtaSection />
    <FooterSection />
  </div>
);

export default Index;
