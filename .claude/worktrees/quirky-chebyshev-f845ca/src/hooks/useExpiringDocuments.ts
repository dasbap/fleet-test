import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DriverLicenseRepository, type DriverLicense } from "@/repositories/driver-license.repository";

const repo = new DriverLicenseRepository();

export interface ExpiringDocument {
  id: string;
  driverUserId: string;
  licenseNumber: string;
  licenseCategory: string;
  expiresAt: string;
  isExpired: boolean;
  daysUntilExpiry: number;
}

function toExpiringDocument(license: DriverLicense): ExpiringDocument {
  const expiresAt = license.expires_at ?? "";
  const expDate = new Date(expiresAt).getTime();
  const now = Date.now();
  const daysUntilExpiry = Math.ceil((expDate - now) / 86_400_000);

  return {
    id: license.id,
    driverUserId: license.driver_user_id,
    licenseNumber: license.license_number,
    licenseCategory: license.license_category,
    expiresAt,
    isExpired: daysUntilExpiry < 0,
    daysUntilExpiry,
  };
}

/**
 * Permis conducteurs expirant dans les prochains `withinDays` jours (ou déjà expirés).
 * Utilisé pour les alertes documents dans le tableau de bord et la page alertes.
 */
export function useExpiringDocuments(withinDays = 30) {
  const { userFleetId } = useAuth();

  const query = useQuery({
    queryKey: ["expiring-documents", userFleetId, withinDays],
    queryFn: () =>
      userFleetId ? repo.findExpiringByFleet(userFleetId, withinDays) : [],
    enabled: !!userFleetId,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    select: (data) => data.map(toExpiringDocument),
  });

  const documents = query.data ?? [];
  const expired = documents.filter((d) => d.isExpired);
  const expiringSoon = documents.filter((d) => !d.isExpired && d.daysUntilExpiry <= 7);
  const expiringLater = documents.filter((d) => !d.isExpired && d.daysUntilExpiry > 7);

  return {
    documents,
    expired,
    expiringSoon,
    expiringLater,
    totalCount: documents.length,
    criticalCount: expired.length + expiringSoon.length,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
