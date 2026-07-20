/** Détecte une annulation utilisateur (textes variables selon OS). */
export function isUserCancellationMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("cancel") ||
    m.includes("cancelled") ||
    m.includes("canceled") ||
    m.includes("user denied") ||
    m.includes("no image picked")
  );
}
