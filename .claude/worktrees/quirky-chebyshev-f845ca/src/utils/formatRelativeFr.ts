import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale/fr";

/** Texte relatif en français (ex. « il y a 3 minutes »). */
export function formatRelativeFr(isoDate: string): string {
  try {
    return formatDistanceToNow(new Date(isoDate), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return "—";
  }
}
