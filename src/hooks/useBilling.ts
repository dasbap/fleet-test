import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { BillingRepository } from "@/repositories/billing.repository";
import { BillingService } from "@/services/billing.service";

const billingRepository = new BillingRepository();
const billingService = new BillingService(billingRepository);

export function useBilling(orgId?: string | null, fleetId?: string | null) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["billing-snapshot", orgId, fleetId, Boolean(session?.access_token)],
    queryFn: () =>
      billingService.getBillingSnapshot(orgId as string, fleetId as string, {
        accessToken: session?.access_token,
      }),
    enabled: Boolean(orgId && fleetId),
    staleTime: 60 * 1000,
  });
}
