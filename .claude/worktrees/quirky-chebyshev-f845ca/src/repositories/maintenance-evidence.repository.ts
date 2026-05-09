import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'maintenance-evidence';

export interface MaintenanceEvidenceRow {
  id: string;
  job_id: string;
  kind: string;
  file_path: string;
  created_by: string;
  created_at: string;
}

export class MaintenanceEvidenceRepository {
  async uploadFile(filePath: string, file: File, upsert: boolean = false): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert });
    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error(
          'Le bucket de stockage "maintenance-evidence" n\'existe pas. Veuillez le créer dans Supabase Storage.'
        );
      }
      throw new Error(error.message);
    }
  }

  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async removeFromStorage(paths: string[]): Promise<void> {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  async insertEvidence(job_id: string, kind: string, file_path: string, created_by: string): Promise<MaintenanceEvidenceRow> {
    const { data, error } = await supabase
      .from('preuves_maintenance')
      .insert({ job_id, kind, file_path, created_by })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MaintenanceEvidenceRow;
  }

  async deleteEvidence(id: string): Promise<void> {
    const { error } = await supabase.from('preuves_maintenance').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
