import { createContext } from "react";
import type { UseHelpReturn } from "@/hooks/useHelp";

export const HelpContext = createContext<UseHelpReturn | null>(null);
