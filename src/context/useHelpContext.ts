import { useContext } from "react";
import { HelpContext } from "@/context/help.context.store";
import type { UseHelpReturn } from "@/hooks/useHelp";

export function useHelpContext(): UseHelpReturn {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelpContext must be used within HelpProvider");
  return ctx;
}

export function useHelpContextOptional(): UseHelpReturn | null {
  return useContext(HelpContext);
}
