import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { GeneratedQr, QrScanResult } from "@/server/domain/billing/vehicleLicenseEngine";

export type { GeneratedQr, QrScanResult };

// ─── helpers fetch BFF ──────────────────────────────────────

async function bffPost<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `Erreur ${res.status}`;
    try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { if (text) msg = text; }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── useGenerateVehicleQr ───────────────────────────────────

export function useGenerateVehicleQr() {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (args: {
      vehicleId: string;
      subscriptionId: string;
      expiresHours?: number;
      maxUses?: number;
    }): Promise<GeneratedQr> => {
      if (!session?.access_token) throw new Error("Session expirée.");
      return bffPost<GeneratedQr>("/billing/qr/vehicle", args, session.access_token);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur génération QR", description: err.message, variant: "destructive" });
    },
  });
}

// ─── useGenerateFleetLotQr ──────────────────────────────────

export function useGenerateFleetLotQr() {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (args: {
      fleetId: string;
      vehicleIds: string[];
      subscriptionId: string;
      expiresHours?: number;
    }): Promise<GeneratedQr> => {
      if (!session?.access_token) throw new Error("Session expirée.");
      return bffPost<GeneratedQr>("/billing/qr/fleet-lot", args, session.access_token);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur génération QR lot", description: err.message, variant: "destructive" });
    },
  });
}

// ─── useScanActivationQr ────────────────────────────────────

export function useScanActivationQr() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<QrScanResult> => {
      if (!session?.access_token) throw new Error("Session expirée.");
      return bffPost<QrScanResult>("/billing/qr/scan", { code }, session.access_token);
    },
    onSuccess: (result) => {
      if (result.status === "success") {
        toast({ title: "Véhicule activé", description: result.message });
        void queryClient.invalidateQueries({ queryKey: ["billing-snapshot"] });
        void queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      } else {
        toast({ title: "Activation refusée", description: result.message, variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erreur scan QR", description: err.message, variant: "destructive" });
    },
  });
}
