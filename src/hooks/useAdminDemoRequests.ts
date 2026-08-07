import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { AdminDemoRequestRepository } from "@/repositories/admin-demo-request.repository";
import type { DemoRequestAutoDecision, DemoRequestStatus } from "@/types/demo-request";

const repository = new AdminDemoRequestRepository();

export function useAdminDemoRequests(includeProcessed = false) {
  return useQuery({
    queryKey: ["admin-demo-requests", includeProcessed],
    queryFn: () => repository.list(includeProcessed),
    staleTime: 30_000,
  });
}

export function useFinalizeDemoRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      status: DemoRequestStatus;
      reason?: string | null;
      provisionedUserId?: string | null;
      invitationUrl?: string | null;
    }) => repository.finalize(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-demo-requests"] });
      toast({ title: "Demande demo mise a jour" });
    },
    onError: (error) => {
      toast({
        title: "Erreur demande demo",
        description: error instanceof Error ? error.message : "Action impossible.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDemoRequestAutoMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { enabled: boolean; decision: DemoRequestAutoDecision }) =>
      repository.updateAutoMode(input.enabled, input.decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-demo-requests"] });
      toast({ title: "Automatisation demo mise a jour" });
    },
  });
}
