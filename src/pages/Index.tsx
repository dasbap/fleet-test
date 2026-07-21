import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
      </main>
    </div>
  );
};

export default Index;
