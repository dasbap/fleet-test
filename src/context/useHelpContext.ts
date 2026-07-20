import { useContext } from "react";
import { DEFAULT_HELP_CONTEXT, HelpContext } from "@/context/help.context.store";
import type { UseHelpReturn } from "@/hooks/useHelp";

export function useHelpContext(): UseHelpReturn {
  return useContext(HelpContext);
}

/** Retourne null si seul le contexte par défaut (no-op) est actif — hors HelpProvider. */
export function useHelpContextOptional(): UseHelpReturn | null {
  const ctx = useContext(HelpContext);
  return ctx === DEFAULT_HELP_CONTEXT ? null : ctx;
}
