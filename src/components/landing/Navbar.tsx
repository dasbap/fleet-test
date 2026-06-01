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
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">
              E-Samba
            </span>
          </Link>

          {PUBLIC_NAV_LINKS.length > 0 ? (
          <div className="hidden md:flex items-center gap-8">
            {PUBLIC_NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  rel="noopener noreferrer"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.to}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  {link.name}
                </Link>
              ),
            )}
          </div>
          ) : null}

          <div className="hidden md:flex items-center gap-4 ml-auto">
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
