import { getCanonicalUrlFromPath } from "@/lib/seo";
import { buildMailtoHref, DEPARTMENT_EMAILS } from "@/config/navigation";
import type { JobPosting } from "@/types/carrieres";

const STORAGE_PREFIX = "esamba-carrieres-unlock:";

/** Lien direct vers la fiche détaillée (envoyé dans le corps du mail candidature). */
export function getJobDetailAccessUrl(postingId: string): string {
  const base = getCanonicalUrlFromPath("/carrieres").replace(/\/$/, "");
  return `${base}?fiche=${encodeURIComponent(postingId)}`;
}

export function isJobDetailUnlocked(postingId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}${postingId}`) === "1";
  } catch {
    return false;
  }
}

export function unlockJobDetail(postingId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${postingId}`, "1");
  } catch {
    /* quota / mode privé */
  }
}

export function buildJobCvMailtoHref(posting: JobPosting): string {
  const detailUrl = getJobDetailAccessUrl(posting.id);
  const body = [
    "Bonjour,",
    "",
    `Je souhaite postuler au poste : ${posting.title}`,
    "",
    "Nom :",
    "Téléphone :",
    "Ville :",
    "",
    "Je joins mon CV à cet e-mail.",
    "",
    "Lien d'accès à la fiche détaillée du poste :",
    detailUrl,
    "",
    "Cordialement,",
  ].join("\n");

  return buildMailtoHref(DEPARTMENT_EMAILS.rh, {
    subject: `Candidature — ${posting.title}`,
    body,
  });
}
