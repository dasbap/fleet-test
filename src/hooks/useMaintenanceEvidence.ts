import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface EvidenceUpload {
  job_id: string;
  kind: 'before' | 'after';
  file: File;
  created_by: string;
}

// Upload evidence photo to Supabase Storage
export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ job_id, kind, file, created_by }: EvidenceUpload) => {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${job_id}/${kind}_${Date.now()}.${fileExt}`;
      const filePath = `maintenance/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('maintenance-evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Check if bucket doesn't exist
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error(
            'Le bucket de stockage "maintenance-evidence" n\'existe pas. Veuillez le créer dans Supabase Storage.'
          );
        }
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('maintenance-evidence')
        .getPublicUrl(filePath);

      // Save reference in database
      const { data, error: dbError } = await supabase
        .from('maintenance_evidence')
        .insert({
          job_id,
          kind,
          file_path: urlData.publicUrl,
          created_by,
        })
        .select()
        .single();

      if (dbError) {
        // Try to delete the uploaded file if DB insert fails
        await supabase.storage.from('maintenance-evidence').remove([filePath]);
        throw new Error(dbError.message);
      }

      return data;
    },
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

// Delete evidence
export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file_path, job_id }: { id: string; file_path: string; job_id: string }) => {
      // Extract file path from URL for deletion
      const urlParts = file_path.split('/maintenance-evidence/');
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage.from('maintenance-evidence').remove([storagePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('maintenance_evidence')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      return { id, job_id };
    },
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
