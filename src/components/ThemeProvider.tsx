import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={true}
  >
    {children}
  </NextThemesProvider>
);

export default ThemeProvider;
