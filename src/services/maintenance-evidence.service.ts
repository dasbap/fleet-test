import { MaintenanceEvidenceRepository } from '@/repositories/maintenance-evidence.repository';
import type { MaintenanceEvidenceRow } from '@/repositories/maintenance-evidence.repository';
import { extractStorageObjectPath } from '@/lib/storage/signedUrl';

const BUCKET = 'maintenance-evidence';

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

    try {
      return await this.repository.insertEvidence(job_id, kind, filePath, created_by);
    } catch (err) {
      await this.repository.removeFromStorage([filePath]);
      throw err;
    }
  }

  async resolveDisplayUrl(pathOrUrl: string): Promise<string | null> {
    return this.repository.getSignedUrl(pathOrUrl);
  }

  async deleteEvidence(id: string, file_path: string, job_id: string): Promise<{ id: string; job_id: string }> {
    const objectPath = extractStorageObjectPath(BUCKET, file_path) || file_path;
    if (objectPath) {
      await this.repository.removeFromStorage([objectPath]);
    }
    await this.repository.deleteEvidence(id);
    return { id, job_id };
  }
}
