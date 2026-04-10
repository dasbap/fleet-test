import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import { OnboardingService } from '@/services/onboarding.service';
import type { OnboardingData, OnboardingStep1Data } from '@/types/onboarding';

const onboardingRepository = new OnboardingRepository();
const onboardingService = new OnboardingService(onboardingRepository);

export function useOnboarding(orgId?: string) {
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ['onboarding-progress', orgId],
    queryFn: () => onboardingService.getProgress(orgId as string),
    enabled: Boolean(orgId),
  });

  const saveStepMutation = useMutation({
    mutationFn: async (params: { step: 1 | 2 | 3; data: Partial<OnboardingData>; completed?: boolean }) => {
      if (!orgId) {
        throw new Error("L'identifiant d'organisation est requis.");
      }
      return onboardingService.saveStep(orgId, params.step, params.data, Boolean(params.completed));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', orgId] });
      queryClient.invalidateQueries({ queryKey: ['route-access'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) {
        throw new Error("L'identifiant d'organisation est requis.");
      }
      await onboardingService.markCompleted(orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', orgId] });
      queryClient.invalidateQueries({ queryKey: ['route-access'] });
    },
  });

  const saveStep1Mutation = useMutation({
    mutationFn: async (data: OnboardingStep1Data) => {
      if (!orgId) {
        throw new Error("L'identifiant d'organisation est requis.");
      }
      await onboardingService.saveStep1(orgId, data);
      return onboardingService.createFirstVehicleForOrg(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', orgId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-simple'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return {
    ...progressQuery,
    saveStep: async (step: 1 | 2 | 3, data: Partial<OnboardingData>, completed = false) =>
      saveStepMutation.mutateAsync({ step, data, completed }),
    saveStep1: (data: OnboardingStep1Data) => saveStep1Mutation.mutateAsync(data),
    complete: () => completeMutation.mutateAsync(),
    isSaving: saveStepMutation.isPending || saveStep1Mutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}
