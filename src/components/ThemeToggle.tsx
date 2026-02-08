import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMounted } from "@/hooks/useMounted";

/**
 * Bascule thème clair/sombre. Utilise next-themes (stockage localStorage).
 */
const ThemeToggle = () => {
  const mounted = useMounted();
  const { setTheme, resolvedTheme } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9" aria-hidden>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Passer en mode clair" : "Passer en mode sombre";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={label}
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
