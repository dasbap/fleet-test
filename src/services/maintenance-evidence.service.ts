import { MaintenanceEvidenceRepository } from '@/repositories/maintenance-evidence.repository';
import type { MaintenanceEvidenceRow } from '@/repositories/maintenance-evidence.repository';

export interface UploadEvidenceInput {
  job_id: string;
  kind: 'before' | 'after';
  file: File;
  created_by: string;
}

export class MaintenanceEvidenceService {
  constructor(private repository: MaintenanceEvidenceRepository) {}

  async uploadEvidence(input: UploadEvidenceInput): Promise<MaintenanceEvidenceRow> {
    const { job_id, kind, file, created_by } = input;
    const fileExt = file.name.split('.').pop();
    const fileName = `${job_id}/${kind}_${Date.now()}.${fileExt}`;
    const filePath = `maintenance/${fileName}`;

    await this.repository.uploadFile(filePath, file, false);
    const publicUrl = this.repository.getPublicUrl(filePath);

    try {
      return await this.repository.insertEvidence(job_id, kind, publicUrl, created_by);
    } catch (err) {
      await this.repository.removeFromStorage([filePath]);
      throw err;
    }
  }

  async deleteEvidence(id: string, file_path: string, job_id: string): Promise<{ id: string; job_id: string }> {
    const urlParts = file_path.split('/maintenance-evidence/');
    if (urlParts.length > 1) {
      await this.repository.removeFromStorage([urlParts[1]]);
    }
    await this.repository.deleteEvidence(id);
    return { id, job_id };
  }
}
