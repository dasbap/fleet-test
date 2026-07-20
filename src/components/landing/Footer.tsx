import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-sm text-muted-foreground">
        <Link
          to={ROUTE_PATHS.home}
          className="font-heading font-semibold text-foreground transition-colors hover:text-primary"
        >
          E-Samba
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Liens essentiels">
          <Link to={ROUTE_PATHS.contact} className="transition-colors hover:text-primary">
            Contact
          </Link>
          <Link to="/confidentialite" className="transition-colors hover:text-primary">
            Confidentialite
          </Link>
          <Link to="/conditions" className="transition-colors hover:text-primary">
            Conditions
          </Link>
        </nav>

        <p>© {currentYear} E-Samba</p>
      </div>
    </footer>
  );
};

export default Footer;
