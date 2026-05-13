import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import AudienceValueSection from "@/components/landing/AudienceValueSection";
import PricingSection from "@/components/landing/PricingSection";
import ValueAnchorSection from "@/components/landing/ValueAnchorSection";
import FaqSection from "@/components/landing/FaqSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
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
      {/* 9. Action finale */}
      <FinalCtaSection />
      {/* 10. Footer */}
      <LandingFooter />
    </div>
  );
};

export default Index;
