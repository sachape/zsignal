import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import AudienceValueSection from "@/components/landing/AudienceValueSection";
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
      {/* 4. Pour qui + bénéfices (fusion Personas + Features) */}
      <AudienceValueSection />
      {/* 5. Prix */}
      <PricingSection />
      {/* 6. Objections */}
      <FaqSection />
      {/* 7. Action finale */}
      <FinalCtaSection />
      {/* 8. Footer */}
      <LandingFooter />
    </div>
  );
};

export default Index;
