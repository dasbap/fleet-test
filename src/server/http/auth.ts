export function getBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const t = header.slice(7).trim();
  return t.length ? t : null;
}
