import { useQuery } from '@tanstack/react-query';
import { getSignedStorageUrl } from '@/lib/storage/signedUrl';

/** URL signée pour affichage / téléchargement d'un objet storage privé. */
export function useSignedStorageUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  ttlSeconds: number = 3600,
) {
  return useQuery({
    queryKey: ['signed-storage-url', bucket, pathOrUrl ?? '', ttlSeconds],
    queryFn: () => getSignedStorageUrl(bucket, pathOrUrl!, ttlSeconds),
    enabled: Boolean(pathOrUrl?.trim()),
    staleTime: Math.max(0, (ttlSeconds - 300) * 1000),
  });
}
