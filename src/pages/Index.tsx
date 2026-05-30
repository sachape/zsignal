import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import AudienceValueSection from "@/components/landing/AudienceValueSection";
import PricingSection from "@/components/landing/PricingSection";
import ValueAnchorSection from "@/components/landing/ValueAnchorSection";
import FaqSection from "@/components/landing/FaqSection";
import ArticlesSection from "@/components/landing/ArticlesSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const HOMEPAGE_FAQ = [
  {
    q: "Faut-il connecter Twitch pour commencer ?",
    a: "Non. Entre simplement ton pseudo : Streamnco lit les signaux publics de ta chaîne pour générer un premier diagnostic. La connexion Twitch arrive seulement si tu veux le suivi complet.",
  },
  {
    q: "Quelles données sont analysées ?",
    a: "Streamnco analyse les signaux utiles de ta chaîne : régularité, progression vers l'objectif, dynamiques visibles et premiers indicateurs de performance. Le niveau de détail augmente avec le suivi complet.",
  },
  {
    q: "Puis-je essayer sans créer de compte ?",
    a: "Oui. Tu peux lancer un premier diagnostic sans compte. Le compte devient utile si tu veux sauvegarder ton analyse, la retrouver et aller plus loin.",
  },
  {
    q: "Que débloque la version complète ?",
    a: "Le suivi complet ajoute l'historique, une lecture plus riche de ta progression, davantage de contexte sur tes performances et un accompagnement plus utile dans le temps.",
  },
  {
    q: "Est-ce utile si je débute ?",
    a: "Oui. Streamnco n'est pas réservé aux grosses chaînes. L'outil est justement utile pour poser de bonnes bases, éviter les erreurs classiques et suivre une progression plus claire.",
  },
  {
    q: "Streamnco publie-t-il quoi que ce soit sur ma chaîne ?",
    a: "Non. Streamnco ne publie rien à ta place. Le diagnostic initial est en lecture seule.",
  },
  {
    q: "Pourrai-je suivre plusieurs chaînes plus tard ?",
    a: "Oui, c'est prévu pour les usages plus avancés. L'expérience actuelle est centrée sur l'analyse et le suivi de ta chaîne, avec une ouverture progressive vers le multi-chaînes.",
  },
];

const Index = () => {
  usePageMeta({
    title: "Streamnco — Analyse Twitch, StreamScore et plan d'action pour streamers",
    description:
      "Streamnco analyse ta chaîne Twitch, identifie ce qui bloque ta progression et génère un plan d'action clair pour progresser stream après stream.",
    ogTitle: "Streamnco — Analyse Twitch, StreamScore et plan d'action pour streamers",
    ogDescription:
      "Analyse ta chaîne Twitch, comprends ce qui bloque ta progression et obtiens un plan d'action clair.",
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
        alternateName: "Streamnco.fr",
        url: "https://streamnco.fr/",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Streamnco analyse les chaînes Twitch et aide les streamers à comprendre ce qui bloque leur progression.",
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
      {/* 1. Promesse */}
      <HeroSection />
      {/* 2. Preuve sociale */}
      <SocialProofSection />
      {/* 3. Aperçu du diagnostic */}
      <DemoPreviewSection />
      {/* 4. Fonctionnement */}
      <HowItWorksSection />
      {/* 5. Fonctionnalités */}
      <AudienceValueSection />
      {/* 6. Prix */}
      <PricingSection />
      {/* 7. Objections (au moment de la décision, juste après le prix) */}
      <FaqSection />
      {/* 8. Ancrage de valeur (dernière validation avant le CTA final) */}
      <ValueAnchorSection />
      {/* 9. Articles */}
      <ArticlesSection />
      {/* 10. Action finale */}
      <FinalCtaSection />
      {/* 11. Footer */}
      <LandingFooter />
    </div>
  );
};

export default Index;
