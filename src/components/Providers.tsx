import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import ThemeProvider from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logError } from "@/lib/logging";
import { initAnalytics } from "@/lib/analytics";
import { getQueryPersister } from "@/lib/query/persistQueryClient";

/** Instance unique pour éviter réinitialisation du cache à chaque rendu. */
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logError("Erreur de requête React Query", error, {
        source: "react-query",
        queryKey: query.queryKey,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      logError("Erreur de mutation React Query", error, {
        source: "react-query",
        mutationKey: mutation.options.mutationKey,
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});
const queryPersister = getQueryPersister();

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Regroupe tous les providers dépendant du client (thème, React Query, tooltips, toasts).
 * En cas de migration Next.js App Router, ce composant serait marqué "use client".
 */
function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}

const Providers = ({ children }: ProvidersProps) => (
  <ThemeProvider>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister ?? undefined,
        maxAge: 1000 * 60 * 60 * 12,
      }}
    >
      <AnalyticsInit />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </PersistQueryClientProvider>
  </ThemeProvider>
);

export default Providers;
