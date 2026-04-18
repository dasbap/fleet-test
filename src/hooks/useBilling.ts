import { useQuery } from "@tanstack/react-query";
import { BillingRepository } from "@/repositories/billing.repository";
import { BillingService } from "@/services/billing.service";

const billingRepository = new BillingRepository();
const billingService = new BillingService(billingRepository);

export function useBilling(orgId?: string | null, fleetId?: string | null) {
  return useQuery({
    queryKey: ["billing-snapshot", orgId, fleetId],
    queryFn: () => billingService.getBillingSnapshot(orgId as string, fleetId as string),
    enabled: Boolean(orgId && fleetId),
    staleTime: 60 * 1000,
  });
}
