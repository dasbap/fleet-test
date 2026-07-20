import { Hash, Image, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useClosureProofSignedUrl } from "@/hooks/useFleetValidation";
import type { ModeRenduPreuve } from "@/types/fleet-validation";

interface ApercuPreuveClotureProps {
  modeRendu: ModeRenduPreuve;
  valeur: string | null;
  type: string | null;
  registration: string;
}

export function ApercuPreuveCloture({
  modeRendu,
  valeur,
  type,
  registration,
}: ApercuPreuveClotureProps) {
  const { data: urlSigne, isPending } = useClosureProofSignedUrl(modeRendu, valeur);

  if (!valeur || modeRendu === "inconnu") {
    return <span className="text-xs italic text-muted-foreground">Aucune preuve</span>;
  }

  if (modeRendu === "reference") {
    return (
      <div className="flex items-center gap-1 text-xs text-primary">
        <Hash className="h-3.5 w-3.5" aria-hidden />
        <span className="font-mono">{valeur}</span>
        <Badge variant="outline" className="ml-1 text-xs">
          {type === "momo_ref" ? "MoMo" : (type ?? "Réf")}
        </Badge>
      </div>
    );
  }

  const src = modeRendu === "base64" ? valeur : urlSigne;
  if (!src) {
    return <Clock className="mx-auto h-4 w-4 animate-pulse text-muted-foreground" aria-hidden />;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
        >
          <Image className="h-4 w-4" aria-hidden />
          <span>Voir photo</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Preuve d&apos;encaissement — {registration}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isPending && modeRendu === "storage" ? (
            <Clock className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <img
              src={src}
              alt={`Preuve encaissement ${registration}`}
              className="max-h-96 w-full rounded-lg object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
