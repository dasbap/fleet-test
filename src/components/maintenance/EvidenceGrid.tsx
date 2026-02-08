import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface EvidenceItem {
  id: string;
  file_path: string;
  created_at: string;
}

interface EvidenceGridProps {
  /** Liste des preuves déjà enregistrées */
  items: EvidenceItem[];
  /** Libellé du type (ex. "Avant", "Après") pour les alt et aria-label */
  kindLabel: string;
  /** Masque le bouton de suppression */
  disabled?: boolean;
  /** Callback de suppression */
  onDelete: (evidenceId: string, filePath: string) => void;
  /** Désactive les boutons pendant une suppression */
  isDeleting?: boolean;
}

/**
 * Grille d’affichage des preuves existantes avec bouton de suppression.
 * Réutilisable dans tout écran affichant des preuves maintenance.
 */
function EvidenceGrid({
  items,
  kindLabel,
  disabled = false,
  onDelete,
  isDeleting = false,
}: EvidenceGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="list">
      {items.map((evidence) => (
        <div key={evidence.id} className="relative group aspect-video w-full" role="listitem">
          <img
            src={evidence.file_path}
            alt={`Preuve ${kindLabel}, enregistrée le ${new Date(evidence.created_at).toLocaleDateString("fr-FR")}`}
            className="w-full h-full object-cover rounded-lg border border-border"
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(evidence.id, evidence.file_path)}
              disabled={isDeleting}
              aria-label={`Supprimer la preuve ${kindLabel}`}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default EvidenceGrid;
