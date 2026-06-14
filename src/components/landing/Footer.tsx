import { Link } from "react-router-dom";
import { Zap, Mail, Phone, MapPin } from "lucide-react";
import { FOOTER_PRODUCT_LINKS, FOOTER_SUPPORT_LINKS, CONTACT } from "@/config/navigation";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="mb-4 flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
              aria-label="Retour à l'accueil E-Samba"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" aria-hidden />
              </div>
              <span className="whitespace-nowrap font-heading text-xl font-bold">E-Samba</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              La plateforme de gestion de flotte intelligente conçue pour
              l&apos;Afrique francophone.
            </p>
            <div className="space-y-2">
              <a
                href={CONTACT.mailtoHref}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                {CONTACT.email}
              </a>
              <a
                href={CONTACT.telHref}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                {CONTACT.phoneDisplay}
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {CONTACT.city}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Produit</h4>
            <ul className="space-y-2">
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2">
              {[
                { name: "À propos", to: "/apropos" },
                { name: "Cas d'usage", to: "/use-case" },
                { name: "Carrières", to: "/carrieres" },
                { name: "Partenaires", to: "/partenaires" },
              ].map((link) => (
                <li key={link.name}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      rel="noopener noreferrer"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {FOOTER_SUPPORT_LINKS.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Légal</h4>
            <ul className="space-y-2">
              {[
                { name: "Confidentialité", to: "/confidentialite" },
                { name: "Conditions", to: "/conditions" },
                { name: "Cookies", to: "/cookies" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} E-Samba — Tous droits réservés.
          </p>
          <p className="text-sm text-muted-foreground">Made with ❤️ for Africa</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
