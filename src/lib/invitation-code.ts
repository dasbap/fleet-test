/** Caractères sans ambiguïté visuelle (0/O, 1/I/L exclus). */
const INVITATION_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Génère un code d'invitation flotte aléatoire (format INV-XXXXXX).
 */
export function generateInvitationCode(): string {
  let code = "INV-";
  for (let i = 0; i < 6; i++) {
    code += INVITATION_CODE_CHARS.charAt(
      Math.floor(Math.random() * INVITATION_CODE_CHARS.length),
    );
  }
  return code;
}
