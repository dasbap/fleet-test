import { useEffect } from "react";
import { BookOpen } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getMarketingUrl } from "@/lib/marketing-url";

const REDIRECT_TARGET = getMarketingUrl("/guides");

/**
 * Ancienne route /blog — redirection vers le hub marketing (guides flotte).
 * Un redirect 301 est aussi configuré dans vercel.json.
 */
export default function BlogPage() {
  useEffect(() => {
    window.location.replace(REDIRECT_TARGET);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-24">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">
            Redirection vers les guides
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Le blog a été remplacé par notre hub de guides flotte et transport CEMAC.
          </p>
          <a
            href={REDIRECT_TARGET}
            className="text-primary font-medium hover:underline"
          >
            Continuer vers les guides →
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
