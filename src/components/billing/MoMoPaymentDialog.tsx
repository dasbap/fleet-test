import { useState } from "react";
import { CheckCircle2, Copy, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMoMoPayment, type MoMoPaymentResult } from "@/hooks/useMoMoPayment";
import type { MoMoProvider } from "@/services/mobile-money.service";
import { toast } from "@/hooks/use-toast";

interface MoMoPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  planCode: string;
  planName: string;
  vehicleCount: number;
  amountXaf: number;
}

function InstructionsView({
  result,
  onClose,
}: {
  result: MoMoPaymentResult;
  onClose: () => void;
}) {
  const { instructions } = result;

  const copyRef = () => {
    navigator.clipboard.writeText(result.reference).catch(() => {});
    toast({ title: "Référence copiée", description: result.reference });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Paiement initié
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Suivez les étapes ci-dessous pour finaliser.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
        <code className="flex-1 text-sm font-mono font-bold">{result.reference}</code>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyRef}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Étapes {instructions.providerLabel}
        </p>
        <ol className="space-y-2">
          {instructions.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-xs text-muted-foreground">
        Montant :{" "}
        <strong>{instructions.amountXaf.toLocaleString("fr-FR")} FCFA</strong> · L'abonnement sera
        activé sous 24 h après confirmation de réception.
      </p>

      <DialogFooter>
        <Button onClick={onClose} className="w-full">
          Fermer
        </Button>
      </DialogFooter>
    </div>
  );
}

export function MoMoPaymentDialog({
  open,
  onClose,
  planCode,
  planName,
  vehicleCount,
  amountXaf,
}: MoMoPaymentDialogProps) {
  const [provider, setProvider] = useState<MoMoProvider>("orange_money");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<MoMoPaymentResult | null>(null);
  const { mutateAsync, isPending } = useMoMoPayment();

  const handleClose = () => {
    setResult(null);
    setPhone("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await mutateAsync({
      provider,
      phoneNumber: phone,
      amountXaf,
      planCode,
      vehicleCount,
    });
    setResult(r);
  };

  const isPhoneValid = /^\+?[0-9\s]{8,15}$/.test(phone.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-orange-500" />
            Payer par Mobile Money
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <InstructionsView result={result} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-muted px-4 py-3 text-sm">
              <p className="font-medium">
                Plan {planName} · {vehicleCount} véhicule{vehicleCount > 1 ? "s" : ""}
              </p>
              <p className="text-muted-foreground text-lg font-bold">
                {amountXaf.toLocaleString("fr-FR")} FCFA / mois
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Opérateur</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as MoMoProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Numéro Mobile Money *</Label>
              <Input
                type="tel"
                placeholder="Ex : +237 6XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Numéro utilisé pour le paiement.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!isPhoneValid || isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isPending ? "Initiation…" : "Initier le paiement"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
