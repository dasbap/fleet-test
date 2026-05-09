import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { MaintenanceEvidenceService } from '@/services/maintenance-evidence.service';
import { MaintenanceEvidenceRepository } from '@/repositories/maintenance-evidence.repository';

const maintenanceEvidenceRepository = new MaintenanceEvidenceRepository();
const maintenanceEvidenceService = new MaintenanceEvidenceService(maintenanceEvidenceRepository);

export interface EvidenceUpload {
  job_id: string;
  kind: 'before' | 'after';
  file: File;
  created_by: string;
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EvidenceUpload) => maintenanceEvidenceService.uploadEvidence(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-job', data.job_id] });
      toast({
        title: 'Photo téléchargée',
        description: `La photo ${data.kind === 'before' ? 'avant' : 'après'} a été enregistrée.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur de téléchargement',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file_path, job_id }: { id: string; file_path: string; job_id: string }) =>
      maintenanceEvidenceService.deleteEvidence(id, file_path, job_id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-job', data.job_id] });
      toast({
        title: 'Photo supprimée',
        description: 'La preuve a été supprimée.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
