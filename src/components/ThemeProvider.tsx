import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="dark"
    forcedTheme="dark"
    enableSystem={false}
  >
    {children}
  </NextThemesProvider>
);

export default ThemeProvider;
