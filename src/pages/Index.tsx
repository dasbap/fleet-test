import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ModulesSection from "@/components/landing/ModulesSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ModulesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
