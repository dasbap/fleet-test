import type { ReactNode } from "react";

/**
 * Enveloppe racine (extension future : contexte partagé du flux auth).
 * Pour l’instant : rend les enfants sans état additionnel.
 */
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
