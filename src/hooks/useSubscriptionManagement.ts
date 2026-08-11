import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SubscriptionManagementService } from "@/services/subscription-management.service";

const subscriptionManagementService = new SubscriptionManagementService();

export function useFleetSubscriptions(fleetId?: string) {
  return useQuery({
    queryKey: ["fleet-subscriptions", fleetId],
    queryFn: () => subscriptionManagementService.listFleetSubscriptions(fleetId ?? ""),
    enabled: !!fleetId,
    staleTime: 60_000,
  });
}

export function useTransferVehicleSubscription(fleetId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: string; targetSubscriptionId: string }) =>
      subscriptionManagementService.transferVehicleSubscription(
        input.vehicleId,
        input.targetSubscriptionId,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fleet-subscriptions", fleetId] });
      void queryClient.invalidateQueries({ queryKey: ["fleet-billing-context", fleetId] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

export function useTerminateSubscriptionEarly(fleetId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      subscriptionManagementService.terminateSubscriptionEarly(subscriptionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fleet-subscriptions", fleetId] });
      void queryClient.invalidateQueries({ queryKey: ["fleet-billing-context", fleetId] });
    },
  });
}
