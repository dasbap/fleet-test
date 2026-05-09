/**
 * Contenu à partager (texte, lien, pièces jointes).
 * Sur natif : `fileUrls` attend des URI `file://` (ex. fichier temporaire Caméra / Filesystem).
 * Sur le web : `files` utilise le Web Share API lorsque le navigateur le permet.
 */
export interface SharePayload {
  title?: string;
  /** Corps du message (obligatoire pour le presse-papiers de secours). */
  text: string;
  /** URL publique ou profonde (fiche, alerte, etc.). */
  url?: string;
  /** Android / iOS uniquement — chemins `file://` connus du plugin Share. */
  fileUrls?: string[];
  /** Web uniquement — partage de fichiers si `navigator.canShare` le permet. */
  files?: File[];
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

export interface ShareResult {
  outcome: ShareOutcome;
}
