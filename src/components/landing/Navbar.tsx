import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, Zap } from "lucide-react";
import {
  AUTH_NAV,
  isPublicNavActive,
  PUBLIC_NAV,
  type PublicNavItem,
} from "@/config/navigation";
import { useAuthOptional } from "@/hooks/useAuth";
import { getAppEntryPath } from "@/navigation/appEntryPath";
import { handlePublicAnchorNav } from "@/lib/navigation/publicNavScroll";
import { cn } from "@/lib/utils";

function NavLinkItem({
  item,
  pathname,
  onNavigate,
  className,
  isActive,
}: {
  item: PublicNavItem;
  pathname: string;
  onNavigate?: () => void;
  className: string;
  isActive: boolean;
}) {
  const navigate = useNavigate();
  const activeClass = cn(className, isActive && "text-primary font-semibold");

  const handleClick = (event: React.MouseEvent) => {
    if (item.type === "anchor") {
      event.preventDefault();
      handlePublicAnchorNav(item.href, pathname, navigate);
      onNavigate?.();
      return;
    }
    onNavigate?.();
  };

  if (item.type === "external") {
    return (
      <a
        href={item.href}
        className={activeClass}
        onClick={onNavigate}
        rel="noopener noreferrer"
        target="_blank"
        aria-current={isActive ? "page" : undefined}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      to={item.href}
      className={activeClass}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const auth = useAuthOptional();
  const user = auth?.user;
  const role = auth?.role;
  const appEntry = getAppEntryPath(role);

  const connexionNav = AUTH_NAV.find((item) => item.label === "Connexion");
  const demoNav = AUTH_NAV.find((item) => item.label === "Demander une démo");
  const primaryAuthNav = AUTH_NAV.find((item) => item.primary);

  const closeMenu = () => setIsOpen(false);
  const navLinkClass =
    "font-medium text-muted-foreground transition-colors hover:text-primary";
  const mobileNavLinkClass = `${navLinkClass} py-2 min-h-[44px] flex items-center`;

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

          {PUBLIC_NAV.length > 0 ? (
            <div
              className="hidden items-center justify-center gap-4 md:flex lg:gap-8"
              aria-label="Navigation principale"
            >
              {PUBLIC_NAV.map((link) => (
                <NavLinkItem
                  key={link.label}
                  item={link}
                  pathname={location.pathname}
                  className={navLinkClass}
                  isActive={isPublicNavActive(link, location.pathname, location.hash)}
                />
              ))}
            </div>
          ) : (
            <span className="hidden md:block" aria-hidden />
          )}

          <div className="flex items-center justify-end gap-2 md:gap-4 justify-self-end">
            {/* Desktop : menu complet · Tablette : 1 CTA principal */}
            <div className="hidden items-center gap-2 md:flex lg:gap-4">
              {user ? (
                <Button variant="ghost" asChild>
                  <Link to={appEntry}>Mon espace</Link>
                </Button>
              ) : connexionNav ? (
                <Button variant="ghost" asChild className="hidden lg:inline-flex">
                  <Link to={connexionNav.href}>{connexionNav.label}</Link>
                </Button>
              ) : null}
              {demoNav ? (
                <Button variant="outline" asChild className="hidden lg:inline-flex">
                  <Link to={demoNav.href}>{demoNav.label}</Link>
                </Button>
              ) : null}
              {!user && primaryAuthNav ? (
                <Button asChild>
                  <Link to={primaryAuthNav.href}>{primaryAuthNav.label}</Link>
                </Button>
              ) : null}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setIsOpen(true)}
              aria-expanded={isOpen}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            {PUBLIC_NAV.map((link) => (
              <NavLinkItem
                key={link.label}
                item={link}
                pathname={location.pathname}
                onNavigate={closeMenu}
                className={mobileNavLinkClass}
                isActive={isPublicNavActive(link, location.pathname, location.hash)}
              />
            ))}

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {user ? (
                <Button variant="ghost" asChild className="justify-start min-h-[44px]">
                  <Link to={appEntry} onClick={closeMenu}>
                    Mon espace
                  </Link>
                </Button>
              ) : (
                <>
                  {connexionNav ? (
                    <Button variant="ghost" asChild className="justify-start min-h-[44px]">
                      <Link to={connexionNav.href} onClick={closeMenu}>
                        {connexionNav.label}
                      </Link>
                    </Button>
                  ) : null}
                  {demoNav ? (
                    <Button variant="outline" asChild className="justify-start min-h-[44px]">
                      <Link to={demoNav.href} onClick={closeMenu}>
                        {demoNav.label}
                      </Link>
                    </Button>
                  ) : null}
                  {primaryAuthNav ? (
                    <Button asChild className="min-h-[44px]">
                      <Link to={primaryAuthNav.href} onClick={closeMenu}>
                        {primaryAuthNav.label}
                      </Link>
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default Navbar;
