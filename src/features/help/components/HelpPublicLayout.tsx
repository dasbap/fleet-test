/**
 * En-tête minimal pour les pages publiques /help (navigation sans ancres landing).
 */
import { Link, Outlet } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthOptional } from "@/hooks/useAuth";
import { getAppEntryPath } from "@/navigation/appEntryPath";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export function HelpPublicLayout() {
  const auth = useAuthOptional();
  const user = auth?.user;
  const appEntry = getAppEntryPath(auth?.role);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 text-foreground hover:opacity-90"
            aria-label="Accueil E-Samba"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" aria-hidden />
            </span>
            <span className="truncate font-heading text-sm font-semibold">E-Samba</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Navigation aide">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to={ROUTE_PATHS.help}>Centre d&apos;aide</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              {user ? (
                <Link to={appEntry}>Mon espace</Link>
              ) : (
                <Link to={ROUTE_PATHS.auth}>Connexion</Link>
              )}
            </Button>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
