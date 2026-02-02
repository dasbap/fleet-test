import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, FileText, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProofType = 'photo' | 'momo_ref' | 'doc';

interface ProofUploadProps {
  proofType: ProofType;
  onProofTypeChange: (type: ProofType) => void;
  proofValue: string;
  onProofValueChange: (value: string) => void;
  proofFile: File | null;
  onProofFileChange: (file: File | null) => void;
}

const proofTypes = [
  { value: 'photo' as const, label: 'Photo', icon: Camera, description: 'Prendre une photo du reçu' },
  { value: 'momo_ref' as const, label: 'Réf. MoMo', icon: Smartphone, description: 'Référence de transaction Mobile Money' },
  { value: 'doc' as const, label: 'Document', icon: FileText, description: 'Télécharger un document' },
];

const ProofUpload = ({
  proofType,
  onProofTypeChange,
  proofValue,
  onProofValueChange,
  proofFile,
  onProofFileChange,
}: ProofUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onProofFileChange(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleRemoveFile = () => {
    onProofFileChange(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCapturePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Preuve de recette
      </h3>

      {/* Proof Type Selection */}
      <div className="grid grid-cols-3 gap-3">
        {proofTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = proofType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                onProofTypeChange(type.value);
                onProofValueChange('');
                handleRemoveFile();
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                isSelected 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Proof Input based on type */}
      {proofType === 'photo' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {proofFile && previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preuve"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-32 flex flex-col gap-2"
              onClick={handleCapturePhoto}
            >
              <Camera className="w-8 h-8" />
              <span>Prendre une photo</span>
            </Button>
          )}
        </div>
      )}

      {proofType === 'momo_ref' && (
        <div className="space-y-2">
          <Label htmlFor="momo-ref">Référence de transaction</Label>
          <Input
            id="momo-ref"
            type="text"
            placeholder="Ex: TXN123456789"
            value={proofValue}
            onChange={(e) => onProofValueChange(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Entrez la référence de votre transaction Mobile Money (MoMo ou Orange Money)
          </p>
        </div>
      )}

      {proofType === 'doc' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {proofFile ? (
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{proofFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(proofFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6" />
              <span>Télécharger un document</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProofUpload;
