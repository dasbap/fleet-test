import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import { OnboardingService } from '@/services/onboarding.service';
import type { OnboardingData, OnboardingProgress, OnboardingStep1Data } from '@/types/onboarding';

const onboardingRepository = new OnboardingRepository();
const onboardingService = new OnboardingService(onboardingRepository);

const onboardingProgressKey = (orgId: string) => ['onboarding-progress', orgId] as const;
const authFlowOnboardingCompletedKey = (orgId: string) =>
  ['auth-flow-onboarding-completed', orgId] as const;
const authFlowOnboardingCompletedRootKey = ['auth-flow-onboarding-completed'] as const;

export function useOnboarding(orgId?: string) {
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: orgId ? onboardingProgressKey(orgId) : ['onboarding-progress', orgId],
    queryFn: () => onboardingService.getProgress(orgId as string),
    enabled: Boolean(orgId),
  });

  const saveStepMutation = useMutation({
    mutationFn: async (params: { step: 1 | 2 | 3 | 4; data: Partial<OnboardingData>; completed?: boolean }) => {
      if (!orgId) {
        throw new Error("L'identifiant d'organisation est requis.");
      }
      return onboardingService.saveStep(orgId, params.step, params.data, Boolean(params.completed));
    },
    onSuccess: () => {
      if (!orgId) return;
      queryClient.invalidateQueries({ queryKey: onboardingProgressKey(orgId) });
      queryClient.invalidateQueries({ queryKey: authFlowOnboardingCompletedKey(orgId) });
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
      if (!orgId) return;

      queryClient.setQueryData(authFlowOnboardingCompletedKey(orgId), true);
      queryClient.setQueryData<OnboardingProgress | null | undefined>(
        onboardingProgressKey(orgId),
        current => {
          if (!current) return current;
          return {
            ...current,
            completed: true,
            step: Math.max(current.step ?? 4, 4) as OnboardingProgress['step'],
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: onboardingProgressKey(orgId) });
      queryClient.invalidateQueries({ queryKey: authFlowOnboardingCompletedRootKey });
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
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: onboardingProgressKey(orgId) });
        queryClient.invalidateQueries({ queryKey: authFlowOnboardingCompletedKey(orgId) });
      }
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-simple'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return {
    ...progressQuery,
    saveStep: async (step: 1 | 2 | 3 | 4, data: Partial<OnboardingData>, completed = false) =>
      saveStepMutation.mutateAsync({ step, data, completed }),
    saveStep1: (data: OnboardingStep1Data) => saveStep1Mutation.mutateAsync(data),
    complete: () => completeMutation.mutateAsync(),
    isSaving: saveStepMutation.isPending || saveStep1Mutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}
