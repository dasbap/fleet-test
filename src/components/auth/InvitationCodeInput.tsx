import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Ticket, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Réponse de la requête flotte_invitations + jointure flottes(name) */
interface InvitationRow {
  id: string;
  fleet_id: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  fleet: { name: string } | null;
}

interface InvitationCodeInputProps {
  onValidCode: (fleetId: string, fleetName: string, code: string) => void;
  onClear: () => void;
  onStatusChange?: (hasUnverifiedCode: boolean) => void;
}

type InvalidReason = "not_found" | "expired" | "max_uses" | "error";

const INVALID_MESSAGES: Record<InvalidReason, string> = {
  not_found: "Code invalide ou introuvable",
  expired: "Ce code d'invitation a expiré",
  max_uses: "Ce code a atteint le nombre maximum d'utilisations",
  error: "Erreur lors de la vérification. Réessayez.",
};

export function InvitationCodeInput({ onValidCode, onClear, onStatusChange }: InvitationCodeInputProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [fleetName, setFleetName] = useState("");
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null);

  // Notify parent when there's an unverified code
  const updateStatus = (newStatus: typeof status, newCode?: string) => {
    setStatus(newStatus);
    const codeValue = newCode !== undefined ? newCode : code;
    onStatusChange?.(codeValue.length > 0 && newStatus !== "valid");
  };

  const validateCode = async () => {
    if (!code.trim()) return;

    updateStatus("checking");

    try {
      const { data: rawData, error } = await supabase
        .from("flotte_invitations")
        .select(`
          id,
          fleet_id,
          expires_at,
          max_uses,
          current_uses,
          fleet:flottes(name)
        `)
        .eq("code", code.trim().toUpperCase())
        .maybeSingle();

      const data = rawData as InvitationRow | null;

      if (error || !data) {
        setInvalidReason("not_found");
        updateStatus("invalid");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setInvalidReason("expired");
        updateStatus("invalid");
        return;
      }

      if (data.max_uses != null && data.current_uses >= data.max_uses) {
        setInvalidReason("max_uses");
        updateStatus("invalid");
        return;
      }

      const name = data.fleet?.name || "Flotte";
      updateStatus("valid");
      setFleetName(name);
      onValidCode(data.fleet_id, name, code.trim().toUpperCase());
    } catch (err) {
      console.error("Error validating code:", err);
      setInvalidReason("error");
      updateStatus("invalid");
    }
  };

  const handleClear = () => {
    setCode("");
    setInvalidReason(null);
    updateStatus("idle", "");
    setFleetName("");
    onClear();
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setCode(upperValue);
    if (status !== "idle") {
      setInvalidReason(null);
      updateStatus("idle", upperValue);
    } else {
      onStatusChange?.(upperValue.length > 0);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="invitationCode">Code d'invitation (optionnel)</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="invitationCode"
            type="text"
            placeholder="Ex: FLOTTE-ABC123"
            className="pl-11 uppercase"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            disabled={status === "valid"}
            aria-invalid={status === "invalid"}
            aria-describedby={
              status === "valid"
                ? "invitationCode-valid"
                : status === "invalid"
                  ? "invitationCode-error"
                  : undefined
            }
          />
        </div>
        {status === "idle" && code.length > 0 && (
          <Button type="button" variant="secondary" onClick={validateCode}>
            Vérifier
          </Button>
        )}
        {status === "checking" && (
          <Button type="button" variant="secondary" disabled>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Vérification...
          </Button>
        )}
        {status === "valid" && (
          <Button type="button" variant="outline" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === "invalid" && (
          <Button type="button" variant="destructive" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {status === "valid" && (
        <p id="invitationCode-valid" className="text-sm text-chart-2 flex items-center gap-1">
          <Check className="h-4 w-4" />
          Vous rejoindrez la flotte "{fleetName}"
        </p>
      )}
      {status === "invalid" && (
        <p id="invitationCode-error" className="text-sm text-destructive">
          {invalidReason ? INVALID_MESSAGES[invalidReason] : "Code invalide ou expiré"}
        </p>
      )}
    </div>
  );
}
