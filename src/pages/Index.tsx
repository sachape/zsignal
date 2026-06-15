import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import WowFeaturesSection from "@/components/landing/WowFeaturesSection";
import StreamScoreShowcaseSection from "@/components/landing/StreamScoreShowcaseSection";
import ContentQueueShowcaseSection from "@/components/landing/ContentQueueShowcaseSection";
import AudienceValueSection from "@/components/landing/AudienceValueSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import ValueAnchorSection from "@/components/landing/ValueAnchorSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import ArticlesSection from "@/components/landing/ArticlesSection";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

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

const Index = () => {
  usePageMeta({
    title: "Streamnco — Cockpit créatif et stratégique pour streamers",
    description:
      "Crée des clips verticaux, génère des visuels Twitch, organise tes contenus et analyse ta progression avec Streamnco.",
    ogTitle: "Streamnco — Le cockpit créatif des streamers",
    ogDescription:
      "Clips 9:16, Studio visuel, file de contenu, StreamScore, benchmark et Live Studio pour créer, organiser et progresser.",
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
        "@type": "WebSite",
        name: "Streamnco",
        url: "https://streamnco.fr/",
        inLanguage: "fr-FR",
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Streamnco",
        url: "https://streamnco.fr/",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Cockpit créatif et stratégique pour streamers : clips verticaux, visuels, organisation de contenus, analyse Twitch et préparation live.",
        sameAs: ["https://www.instagram.com/streamnco.fr/"],
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
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* 1. Hook + promesse de croissance + CTA principal */}
      <HeroSection />

      {/* 2. Preuve sociale immédiate — crédibilité */}
      <SocialProofSection />

      {/* 3. Les 3 piliers — vue d'ensemble de la proposition de valeur */}
      <AudienceValueSection />

      {/* 4. Pilier 1 + 2 en profondeur — Clips réseaux + Studio visuel */}
      <WowFeaturesSection />

      {/* 5. Pilier 3 en profondeur — Progression + récap après live */}
      <StreamScoreShowcaseSection />

      {/* 6. Et tout ce qui va autour — file de contenu incluse */}
      <ContentQueueShowcaseSection />

      {/* 7. Comment ça marche — réduction de friction */}
      <HowItWorksSection />

      {/* 8. Aperçu du produit — voir avant de s'engager */}
      <DemoPreviewSection />

      {/* 9. Comparaison vs alternatives — justifier la valeur AVANT le prix */}
      <ValueAnchorSection />

      {/* 10. Tarifs */}
      <PricingSection />

      {/* 11. FAQ — traiter les objections au moment de la décision */}
      <FaqSection />

      {/* 12. CTA final — dernière conversion */}
      <FinalCtaSection />

      {/* 13. Articles — pour ceux qui veulent en savoir plus */}
      <ArticlesSection />

      <LandingFooter />
    </div>
  );
};

export default Index;
