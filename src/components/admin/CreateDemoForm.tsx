/**
 * CreateDemoForm - formulaire de creation d'un acces demo E-Samba.
 *
 * Un compte demo n'est pas rattache a une flotte globale a la creation.
 * La flotte demo doit ensuite venir d'un organisateur demo.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MAX_DEMO_TRIAL_DAYS } from "@/services/admin-demo.service";
import type { CreateDemoPayload } from "@/hooks/useAdminDemoAccounts";

interface CreateDemoFormProps {
  onSubmit: (
    payload: CreateDemoPayload
  ) => Promise<{
    ok: boolean;
    user_id?: string;
    magic_url?: string;
    error?: string;
  }>;
  onSuccess?: () => void;
  canCreatePermanentAccess?: boolean;
}

const DEFAULT_TRIAL_DAYS: Record<string, number> = {
  investor: 2,
  prospect: 7,
  internal: 30,
  dev: 30,
};

const ACCOUNT_TYPE_LABELS = {
  investor: "Investisseur (48h)",
  prospect: "Prospect (7j)",
  internal: "Interne (30j)",
  dev: "Dev (30j)",
};

export function CreateDemoForm({
  onSubmit,
  onSuccess,
  canCreatePermanentAccess = false,
}: CreateDemoFormProps) {
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [accountType, setAccountType] = useState<string>("prospect");
  const [trialDays, setTrialDays] = useState(7);
  const [label, setLabel] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [permanentAccess, setPermanentAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicUrl, setMagicUrl] = useState<string | null>(null);

  function handleTypeChange(type: string) {
    setAccountType(type);
    setTrialDays(DEFAULT_TRIAL_DAYS[type] ?? 7);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast({ title: "Email requis", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const result = await onSubmit({
      email: email.trim(),
      company_name: companyName.trim() || undefined,
      account_type: accountType as CreateDemoPayload["account_type"],
      trial_days: trialDays,
      label: label.trim() || undefined,
      send_email: sendEmail,
      permanent_access: canCreatePermanentAccess && permanentAccess,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      toast({
        title: "Erreur creation",
        description: result.error ?? "Erreur inconnue",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Acces demo cree" });

    if (result.magic_url) {
      setMagicUrl(result.magic_url);
    } else {
      resetForm();
      onSuccess?.();
    }
  }

  function resetForm() {
    setEmail("");
    setCompanyName("");
    setAccountType("prospect");
    setTrialDays(7);
    setLabel("");
    setSendEmail(false);
    setPermanentAccess(false);
    setMagicUrl(null);
  }

  function copyLink() {
    if (!magicUrl) return;
    void navigator.clipboard.writeText(magicUrl);
    toast({ title: "Lien copie" });
  }

  if (magicUrl) {
    return (
      <Dialog
        open
        onOpenChange={() => {
          resetForm();
          onSuccess?.();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Acces demo cree</DialogTitle>
            <DialogDescription>
              Transmets ce lien au prospect. Il expire selon la duree configuree
              et authentifie automatiquement l'utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted p-3 break-all font-mono text-sm">
              {magicUrl}
            </div>

            <div className="flex gap-2">
              <Button onClick={copyLink} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copier le lien
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(magicUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                resetForm();
                onSuccess?.();
              }}
            >
              Creer un autre acces
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="demo-email">Email *</Label>
        <Input
          id="demo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prospect@entreprise.com"
          required
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-company">Entreprise</Label>
        <Input
          id="demo-company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Transport Mokolo SA"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Type de compte</Label>
        <Select value={accountType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-days">Duree d'essai (jours)</Label>
        <Input
          id="demo-days"
          type="number"
          min={1}
          max={MAX_DEMO_TRIAL_DAYS}
          value={trialDays}
          disabled={canCreatePermanentAccess && permanentAccess}
          onChange={(e) => setTrialDays(Number(e.target.value))}
        />
      </div>

      {canCreatePermanentAccess && (
        <div className="flex items-center gap-3">
          <Switch
            id="demo-permanent-access"
            checked={permanentAccess}
            onCheckedChange={setPermanentAccess}
          />
          <Label htmlFor="demo-permanent-access" className="cursor-pointer">
            Acces permanent
          </Label>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="demo-label">Label (interne)</Label>
        <Input
          id="demo-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="RDV Salon Transport Abidjan 2026"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="demo-send-email"
          checked={sendEmail}
          onCheckedChange={setSendEmail}
        />
        <Label htmlFor="demo-send-email" className="cursor-pointer">
          Envoyer le lien par email automatiquement
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creation en cours...
          </>
        ) : (
          "Creer l'acces demo"
        )}
      </Button>
    </form>
  );
}
