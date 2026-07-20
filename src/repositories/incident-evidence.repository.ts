import { supabase } from "@/integrations/supabase/client";
import { getSignedStorageUrl, invalidateSignedStorageUrl } from "@/lib/storage/signedUrl";

const BUCKET = "incident-evidence";

function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const trimmed = dataUrl.trim();
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(trimmed);
  if (m) {
    return { mimeType: m[1], base64: m[2].replace(/\s/g, "") };
  }
  return { mimeType: "image/jpeg", base64: trimmed };
}

/**
 * Stockage des photos d'incident (bucket privé, URLs signées à l'affichage).
 */
export class IncidentEvidenceRepository {
  /**
   * Téléverse une image et retourne le chemin objet à persister dans incidents.evidence_path.
   */
  async uploadFromDataUrl(
    fleetId: string,
    vehicleId: string,
    dataUrl: string,
  ): Promise<string> {
    const { base64, mimeType } = parseDataUrl(dataUrl);
    let binary: Uint8Array;
    try {
      binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    } catch {
      throw new Error("Image illisible. Reprenez la photo.");
    }
    const ext = mimeType.includes("png") ? "png" : "jpeg";
    const objectPath = `${fleetId}/${vehicleId}/${crypto.randomUUID()}.${ext}`;
    const blob = new Blob([binary], { type: mimeType });

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, blob, { cacheControl: "3600", upsert: false });

    if (error) {
      if (error.message.includes("Bucket not found")) {
        throw new Error(
          'Le bucket de stockage « incident-evidence » est absent. Créez-le dans Supabase Storage.',
        );
      }
      throw new Error(error.message);
    }

    invalidateSignedStorageUrl(BUCKET, objectPath);
    return objectPath;
  }

  async getSignedUrl(pathOrUrl: string): Promise<string | null> {
    return getSignedStorageUrl(BUCKET, pathOrUrl);
  }
}
