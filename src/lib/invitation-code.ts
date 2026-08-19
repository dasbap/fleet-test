/** Caractères sans ambiguïté visuelle (0/O, 1/I/L exclus). */
const INVITATION_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_RANDOM_LENGTH = 10;

/**
 * Génère un code d'invitation flotte avec un CSPRNG (format INV-XXXXXXXXXX).
 * Dix caractères sur un alphabet de 32 symboles donnent 50 bits d'entropie.
 */
export function generateInvitationCode(): string {
  const bytes = new Uint8Array(INVITATION_RANDOM_LENGTH);
  crypto.getRandomValues(bytes);

  let code = "INV-";
  for (const byte of bytes) {
    code += INVITATION_CODE_CHARS[byte & 31];
  }
  return code;
}
