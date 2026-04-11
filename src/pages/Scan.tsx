import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Search, Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useScan } from "@/hooks/useScan";

export default function Scan() {
  const navigate = useNavigate();
  const { resolveScan, scanFromCamera, isLoading, error } = useScan();
  const [rawValue, setRawValue] = useState("");

  const handleResolve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await resolveScan(rawValue);
      toast({
        title: "Code détecté",
        description: `${result.label} ouvert.`,
      });
      navigate(result.route);
    } catch (e) {
      toast({
        title: "Scan impossible",
        description: e instanceof Error ? e.message : "Code invalide.",
        variant: "destructive",
      });
    }
  };

  const handleCameraScan = async () => {
    try {
      const result = await scanFromCamera();
      toast({
        title: "Scan caméra réussi",
        description: `${result.label} ouvert.`,
      });
      navigate(result.route);
    } catch (e) {
      toast({
        title: "Lecture caméra indisponible",
        description: e instanceof Error ? e.message : "Utilisez la saisie manuelle.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-heading font-bold md:text-3xl">
          <QrCode className="h-7 w-7" />
          Scan véhicule / pièce
        </h1>
        <p className="mt-1 text-muted-foreground">
          Scannez un QR/code-barres ou saisissez un identifiant manuellement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scanner rapide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleResolve} className="space-y-3">
            <Input
              value={rawValue}
              onChange={(event) => setRawValue(event.target.value)}
              placeholder="Ex: https://www.e-samba.com/vehicule/{id}, esamba://vehicle/{id}, VEH:AB-123-CD"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isLoading || !rawValue.trim()}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Ouvrir la fiche
              </Button>
              <Button type="button" variant="outline" onClick={handleCameraScan} disabled={isLoading}>
                <Camera className="mr-2 h-4 w-4" />
                Scanner avec caméra
              </Button>
            </div>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

