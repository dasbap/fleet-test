import { Link } from "react-router-dom";
import { Zap, Mail, Phone, MapPin } from "lucide-react";
import { getMarketingUrl } from "@/lib/marketing-url";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl">E-Samba</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              La plateforme de gestion de flotte intelligente conçue pour
              l'Afrique francophone.
            </p>
            <div className="space-y-2">
              <a
                href="mailto:contact@e-samba.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                contact@e-samba.com
              </a>
              <a
                href="tel:+237641341857"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                +237 6 41 34 18 57
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                Douala, Cameroun
              </div>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Produit</h4>
            <ul className="space-y-2">
              {[
                { name: "Fonctionnalités", to: "/#features" },
                { name: "Modules", to: "/#modules" },
                { name: "Tarifs", to: "/#pricing" },
                { name: "Sécurité", to: "/securite" },
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

          {/* Entreprise */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2">
              {[
                { name: "À propos", to: "/apropos" },
                {
                  name: "Guides & ressources",
                  to: getMarketingUrl("/guides"),
                  external: true as const,
                },
                { name: "Cas d'usage", to: "/use-case" },
                { name: "Carrières", to: "/carrieres" },
                { name: "Partenaires", to: "/partenaires" },
              ].map((link) => (
                <li key={link.name}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.to}
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

          {/* Support */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {[
                { name: "Centre d'aide", to: "/help" },
                { name: "Documentation", to: "/documentation" },
                { name: "API", to: "/api" },
                { name: "Status", to: "/status" },
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

          {/* Légal */}
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

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} E-Samba — Tous droits réservés.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ for Africa
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
