import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/config/navigation";

const CLE_PREVIEW = "esamba_dev_preview";
const CODE_PREVIEW = "esamba2026dev";

interface AccesRestreintProps {
  children: React.ReactNode;
}

/**
 * Enveloppe les pages encore en développement.
 * Affiche une page de substitution pour les visiteurs normaux.
 * Accès super-admin : visiter la page avec ?preview=esamba2026dev
 * (le code est persisté en localStorage pour la session).
 * Pour révoquer : supprimer la clé "esamba_dev_preview" du localStorage.
 */
export function AccesRestreint({ children }: AccesRestreintProps) {
  const [searchParams] = useSearchParams();
  const [autorisé, setAutorisé] = useState(false);

  useEffect(() => {
    const codeUrl = searchParams.get("preview");
    const codeLocal = localStorage.getItem(CLE_PREVIEW);

    if (codeUrl === CODE_PREVIEW || codeLocal === CODE_PREVIEW) {
      if (codeUrl === CODE_PREVIEW) {
        localStorage.setItem(CLE_PREVIEW, CODE_PREVIEW);
      }
      setAutorisé(true);
    }
  }, [searchParams]);

  if (autorisé) return <>{children}</>;

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-3">
          Page en cours de développement
        </h1>
        <p className="text-muted-foreground mb-8">
          Cette section est en cours de finalisation et sera bientôt disponible.
          Contactez-nous si vous avez besoin d'un accès anticipé.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button asChild>
            <a href={CONTACT.mailtoHref}>
              <Mail className="w-4 h-4 mr-2" />
              Nous contacter
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
