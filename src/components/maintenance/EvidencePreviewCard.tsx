import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2 } from "lucide-react";

interface EvidencePreviewCardProps {
  /** URL de l’aperçu (blob) */
  previewUrl: string;
  /** Libellé du type (ex. "Avant", "Après") pour l’alt */
  kindLabel: string;
  /** Déclenche l’envoi */
  onUpload: () => void;
  /** Annule l’aperçu */
  onCancel: () => void;
  /** Désactive les boutons pendant l’envoi */
  isUploading?: boolean;
}

/**
 * Carte d’aperçu d’une photo avant envoi, avec actions Téléverser / Annuler.
 * Réutilisable partout où on affiche un aperçu avant upload.
 */
function EvidencePreviewCard({
  previewUrl,
  kindLabel,
  onUpload,
  onCancel,
  isUploading = false,
}: EvidencePreviewCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="relative">
          <img
            src={previewUrl}
            alt={`Aperçu de la photo ${kindLabel} à téléverser`}
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onCancel}
            disabled={isUploading}
            aria-label="Annuler et retirer l'aperçu"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={onUpload}
            disabled={isUploading}
            className="flex-1"
            aria-busy={isUploading}
            aria-label={isUploading ? "Envoi en cours" : "Téléverser la photo"}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                Envoi...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" aria-hidden />
                Téléverser
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
            aria-label="Annuler"
          >
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default EvidencePreviewCard;
