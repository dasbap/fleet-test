import type { ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

interface PublicPageLayoutProps {
  children: ReactNode;
  showWhatsApp?: boolean;
}

/** Coque commune des pages marketing publiques www. */
export function PublicPageLayout({ children, showWhatsApp = true }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {showWhatsApp ? <WhatsAppButton /> : null}
    </div>
  );
}
