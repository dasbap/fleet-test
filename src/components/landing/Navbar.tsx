import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { PUBLIC_NAV_LINKS, PUBLIC_DEMO_HREF } from "@/data/marketing/public-nav";
import { useAuthOptional } from "@/hooks/useAuth";
import { getAppEntryPath } from "@/navigation/appEntryPath";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useAuthOptional();
  const user = auth?.user;
  const role = auth?.role;
  const appEntry = getAppEntryPath(role);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="container mx-auto px-4">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 justify-self-start rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Retour à l'accueil E-Samba"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <span className="whitespace-nowrap font-heading text-xl font-bold text-foreground">
              E-Samba
            </span>
          </Link>

          {PUBLIC_NAV_LINKS.length > 0 ? (
            <div
              className="hidden items-center justify-center gap-6 md:flex lg:gap-8"
              aria-label="Navigation principale"
            >
              {PUBLIC_NAV_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    className="font-medium text-muted-foreground transition-colors hover:text-primary"
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.to}
                    className="font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                  </Link>
                ),
              )}
            </div>
          ) : (
            <span className="hidden md:block" aria-hidden />
          )}

          <div className="flex items-center justify-end gap-4 justify-self-end">
            <div className="hidden items-center gap-4 md:flex">
            {user ? (
              <Button variant="ghost" asChild>
                <Link to={appEntry}>Mon espace</Link>
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link to={ROUTE_PATHS.auth}>Connexion</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={PUBLIC_DEMO_HREF}>Demander une démo</Link>
            </Button>
            {!user ? (
              <Button asChild>
                <Link to={`${ROUTE_PATHS.auth}?mode=signup`}>Démarrer</Link>
              </Button>
            ) : null}
            </div>

            <button
            type="button"
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen ? (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {PUBLIC_NAV_LINKS.length > 0
                ? PUBLIC_NAV_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors font-medium py-2"
                    onClick={() => setIsOpen(false)}
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.to}
                    className="text-muted-foreground hover:text-primary transition-colors font-medium py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                ),
              )
                : null}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to={appEntry} onClick={() => setIsOpen(false)}>
                      Mon espace
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link to={ROUTE_PATHS.auth} onClick={() => setIsOpen(false)}>
                        Connexion
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link
                        to={`${ROUTE_PATHS.auth}?mode=signup`}
                        onClick={() => setIsOpen(false)}
                      >
                        Démarrer gratuitement
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
};

export default Navbar;
