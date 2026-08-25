/** Caractères sans ambiguïté visuelle (0/O, 1/I/L exclus). */
const INVITATION_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITATION_RANDOM_LENGTH = 10;
const RANDOM_BYTE_LIMIT = Math.floor(256 / INVITATION_CODE_CHARS.length) * INVITATION_CODE_CHARS.length;

/**
 * Génère un code d'invitation flotte avec un CSPRNG (format INV-XXXXXXXXXX).
 * Dix caractères sur un alphabet de 31 symboles donnent environ 49,5 bits d'entropie.
 */
export function generateInvitationCode(): string {
  let code = "INV-";

  while (code.length < 4 + INVITATION_RANDOM_LENGTH) {
    const bytes = new Uint8Array(INVITATION_RANDOM_LENGTH);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= RANDOM_BYTE_LIMIT) continue;

      code += INVITATION_CODE_CHARS[byte % INVITATION_CODE_CHARS.length];
      if (code.length === 4 + INVITATION_RANDOM_LENGTH) break;
    }
  }

  return code;
}
