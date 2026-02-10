import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Instance unique pour éviter réinitialisation du cache à chaque rendu. */
const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Regroupe tous les providers dépendant du client (thème, React Query, tooltips, toasts).
 * En cas de migration Next.js App Router, ce composant serait marqué "use client".
 */
const Providers = ({ children }: ProvidersProps) => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default Providers;
