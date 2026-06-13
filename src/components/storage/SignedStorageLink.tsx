import { useSignedStorageUrl } from '@/hooks/useSignedStorageUrl';

interface SignedStorageLinkProps {
  bucket: string;
  pathOrUrl: string;
  label?: string;
  className?: string;
  ttlSeconds?: number;
}

/** Lien vers un objet storage privé (URL signée). */
export function SignedStorageLink({
  bucket,
  pathOrUrl,
  label = 'Voir le fichier',
  className = 'text-primary hover:underline',
  ttlSeconds,
}: SignedStorageLinkProps) {
  const { data: href, isLoading } = useSignedStorageUrl(bucket, pathOrUrl, ttlSeconds);

  if (isLoading) {
    return <span className="text-muted-foreground text-sm">Chargement…</span>;
  }

  if (!href) {
    return <span className="text-muted-foreground text-sm">Fichier indisponible</span>;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}
