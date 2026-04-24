import LandingNav from "@/components/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import PersonasSection from "@/components/landing/PersonasSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <DemoPreviewSection />
      <PersonasSection />
      <FeaturesSection />
      <SocialProofSection />
      <PricingSection />
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
};

export default Index;
