import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ModulesSection from "@/components/landing/ModulesSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";
import { useEffect } from "react";

const Index = () => {
  // Enable dark mode by default for E-Samba
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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
