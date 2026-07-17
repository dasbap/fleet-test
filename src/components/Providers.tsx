import type { ReactNode } from "react";
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
import { getQueryPersister } from "@/lib/query/persistQueryClient";
import { shouldRefetchOnWindowFocus } from "@/lib/query/refetchPolicy";

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
      // Sert le cache persisté même hors ligne (évite l'état "paused" offline)
      networkMode: "offlineFirst",
      // Évite les re-fetch inutiles pendant 5 min (réseau instable Afrique)
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: shouldRefetchOnWindowFocus(),
    },
  },
});
const queryPersister = getQueryPersister();

interface ProvidersProps {
  children: ReactNode;
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </PersistQueryClientProvider>
  </ThemeProvider>
);

export default Providers;
