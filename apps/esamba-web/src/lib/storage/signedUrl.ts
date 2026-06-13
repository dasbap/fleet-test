import { createClient } from "@/lib/supabase/client";

const DEFAULT_TTL_SECONDS = 3600;

/** URL signée pour un objet Storage (bucket privé). */
export async function getSignedStorageUrl(
  bucket: string,
  pathOrUrl: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const objectPath = pathOrUrl
    .replace(/^\/+/, "")
    .split("?")[0]
    ?.trim();
  if (!objectPath) return null;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, ttlSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
