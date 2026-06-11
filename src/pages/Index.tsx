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
    q: "Faut-il connecter Twitch pour commencer ?",
    a: "Non. Entre simplement ton pseudo Twitch — Streamnco lit les signaux publics de ta chaîne et génère ton diagnostic en moins d'une minute. Pas de token, pas de permission, pas de compte requis.",
  },
  {
    q: "Quelles données sont analysées ?",
    a: "Streamnco analyse 6 dimensions : ta régularité de stream, la structure de tes sessions, ta production de clips, ton positionnement en catégorie, ton momentum récent et ta progression vers l'affiliation. Chaque dimension génère un score et un levier d'action concret.",
  },
  {
    q: "Pourquoi Streamnco plutôt que TwitchTracker ou SullyGnome ?",
    a: "Ces outils te donnent des statistiques brutes. Streamnco te dit ce qu'elles signifient pour toi, identifie ton blocage principal et génère un plan d'action personnalisé. Ce n'est pas un dashboard, c'est un diagnostic.",
  },
  {
    q: "Est-ce utile si je débute ?",
    a: "Oui. C'est même là que Streamnco est le plus utile. Un débutant sans méthode peut passer des mois sur des axes secondaires. Streamnco identifie ce qui compte vraiment dès le départ.",
  },
  {
    q: "Que débloque la version complète ?",
    a: "Le plan Pro ajoute l'historique de progression (30/60/90 jours), le suivi live automatique après chaque stream, le benchmark de tes concurrents directs et le plan d'action hebdomadaire vérifié automatiquement.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Pas d'engagement, pas de frais de résiliation. Tu peux annuler depuis ton espace facturation en 1 clic.",
  },
];

const Index = () => {
  usePageMeta({
    title: "Streamnco — Crée tout le contenu autour de ton stream",
    description:
      "Génère des clips verticaux avec facecam et sous-titres, crée tes visuels Twitch et réseaux sociaux, puis suis ta progression avec ton StreamScore — depuis un seul cockpit.",
    ogTitle: "Streamnco — Le cockpit créatif des streamers",
    ogDescription:
      "Clips réseaux, Studio visuel et StreamScore : crée, organise et améliore tout le contenu autour de ton stream.",
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
          "Diagnostic Twitch instantané. Streamnco analyse ta chaîne, identifie ton blocage principal et génère un plan d'action personnalisé — sans connexion Twitch requise.",
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

      {/* 1. Hook + CTA principal */}
      <HeroSection />

      {/* 2. Preuve sociale immédiate — crédibilité */}
      <SocialProofSection />

      {/* 3. Wow features — Clips réseaux + Studio visuel (contrast surface) */}
      <WowFeaturesSection />

      {/* 4. StreamScore — comprendre quoi améliorer (deep surface) */}
      <StreamScoreShowcaseSection />

      {/* 5. File de contenu — organiser et publier (contrast surface) */}
      <ContentQueueShowcaseSection />

      {/* 6. Différenciateurs — pourquoi pas les autres outils */}
      <AudienceValueSection />

      {/* 7. Comment ça marche — réduction de friction */}
      <HowItWorksSection />

      {/* 5. Aperçu du produit — voir avant de s'engager */}
      <DemoPreviewSection />

      {/* 6. Comparaison vs alternatives — justifier la valeur AVANT le prix */}
      <ValueAnchorSection />

      {/* 7. Tarifs */}
      <PricingSection />

      {/* 8. FAQ — traiter les objections au moment de la décision */}
      <FaqSection />

      {/* 9. CTA final — dernière conversion */}
      <FinalCtaSection />

      {/* 10. Articles — pour ceux qui veulent en savoir plus */}
      <ArticlesSection />

      <LandingFooter />
    </div>
  );
};

export default Index;
