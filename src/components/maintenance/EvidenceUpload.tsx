import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useUploadEvidence, useDeleteEvidence } from "@/hooks/useMaintenanceEvidence";
import { cn } from "@/lib/utils";

interface EvidenceUploadProps {
  jobId: string;
  kind: 'before' | 'after';
  existingEvidence: Array<{
    id: string;
    file_path: string;
    created_at: string;
  }>;
  userId: string;
  disabled?: boolean;
}

const EvidenceUpload = ({ 
  jobId, 
  kind, 
  existingEvidence, 
  userId,
  disabled = false 
}: EvidenceUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useUploadEvidence();
  const deleteMutation = useDeleteEvidence();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({
        job_id: jobId,
        kind,
        file: selectedFile,
        created_by: userId,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (evidenceId: string, filePath: string) => {
    await deleteMutation.mutateAsync({ id: evidenceId, file_path: filePath, job_id: jobId });
  };

  const cancelPreview = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const kindLabel = kind === 'before' ? 'Avant' : 'Après';
  const kindColor = kind === 'before' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={kindColor}>
          Photos {kindLabel}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {existingEvidence.length} photo(s)
        </span>
      </div>

      {/* Existing Evidence Grid */}
      {existingEvidence.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {existingEvidence.map((evidence) => (
            <div key={evidence.id} className="relative group">
              <img
                src={evidence.file_path}
                alt={`Preuve ${kindLabel}`}
                className="w-full h-24 object-cover rounded-lg border border-border"
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(evidence.id, evidence.file_path)}
                  disabled={deleteMutation.isPending}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Preview */}
      {previewUrl && (
        <Card>
          <CardContent className="pt-4">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={cancelPreview}
                disabled={uploadMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Télécharger
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={cancelPreview}
                disabled={uploadMutation.isPending}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {!previewUrl && !disabled && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            "hover:border-primary/50 hover:bg-primary/5",
            "border-border"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Ajouter une photo {kindLabel.toLowerCase()}</p>
            <p className="text-xs text-muted-foreground">
              Cliquez ou utilisez l'appareil photo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceUpload;
