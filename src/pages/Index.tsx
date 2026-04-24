import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PersonasSection from "@/components/landing/PersonasSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      {/* 1. Promesse */}
      <HeroSection />
      {/* 2. Preuve produit */}
      <DemoPreviewSection />
      {/* 3. Fonctionnement */}
      <HowItWorksSection />
      {/* 4. Identification */}
      <PersonasSection />
      {/* 5. Bénéfices */}
      <FeaturesSection />
      {/* 6. Preuve sociale */}
      <SocialProofSection />
      {/* 7. Prix */}
      <PricingSection />
      {/* 8. Objections */}
      <FaqSection />
      {/* 9. Action finale */}
      <FinalCtaSection />
      {/* 10. Footer */}
      <LandingFooter />
    </div>
  );
};

export default Index;
