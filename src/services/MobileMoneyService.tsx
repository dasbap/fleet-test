import { useMemo, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  useConfirmMobileMoneyPayment,
  useStartMobileMoneyPayment,
} from "@/hooks/useMobileMoney";
import type { PaymentProvider } from "@/repositories/payment-transaction.repository";
import { toast } from "@/hooks/use-toast";

interface UpgradePlan {
  name: string;
  priceXAF: number;
}

interface MerchantCodes {
  orange?: string;
  mtn?: string;
}

interface MobileMoneyUpgradeButtonProps {
  plan: UpgradePlan;
  merchantCodes: MerchantCodes;
  onSuccess?: () => void;
}

export function MobileMoneyUpgradeButton({
  plan,
  merchantCodes,
  onSuccess,
}: MobileMoneyUpgradeButtonProps) {
  const { activeTenantContext } = useAuth();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>("orange");
  const [phoneNumber, setPhoneNumber] = useState("");

  const startMutation = useStartMobileMoneyPayment();
  const confirmMutation = useConfirmMobileMoneyPayment();

  const merchantCode = useMemo(() => {
    return provider === "orange" ? merchantCodes.orange : merchantCodes.mtn;
  }, [merchantCodes.mtn, merchantCodes.orange, provider]);

  const isSubmitting = startMutation.isPending || confirmMutation.isPending;

  const handleSubmit = async () => {
    if (!activeTenantContext?.fleetId) {
      toast({
        title: "Flotte introuvable",
        description: "Sélectionnez d'abord une flotte avant de payer.",
        variant: "destructive",
      });
      return;
    }

    if (!merchantCode) {
      toast({
        title: "Configuration incomplète",
        description: "Code marchand Mobile Money manquant pour ce fournisseur.",
        variant: "destructive",
      });
      return;
    }

    const transaction = await startMutation.mutateAsync({
      fleetId: activeTenantContext.fleetId,
      provider,
      amountXaf: plan.priceXAF,
      phoneNumber,
      merchantCode,
    });

    await confirmMutation.mutateAsync({ transactionId: transaction.id, success: true });

    toast({
      title: "Paiement confirmé",
      description: `Le plan ${plan.name} a été activé avec succès.`,
    });
    setOpen(false);
    setPhoneNumber("");
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          <Smartphone className="h-4 w-4" />
          Payer via Mobile Money
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paiement Mobile Money</DialogTitle>
          <DialogDescription>
            Plan {plan.name} - {plan.priceXAF.toLocaleString("fr-FR")} XAF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Fournisseur</Label>
            <Select
              value={provider}
              onValueChange={(value: PaymentProvider) => setProvider(value)}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Choisir un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orange">Orange Money</SelectItem>
                <SelectItem value="mtn">MTN MoMo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Numéro Mobile Money</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="6XXXXXXXX"
              inputMode="numeric"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Traitement..." : "Confirmer le paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
