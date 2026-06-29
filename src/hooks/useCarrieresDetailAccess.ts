import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isJobDetailUnlocked, unlockJobDetail } from "@/lib/carrieres-detail-access";

/** Gère le déblocage des fiches détaillées (CV envoyé ou lien ?fiche=). */
export function useCarrieresDetailAccess() {
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);

  const ficheFromUrl = searchParams.get("fiche");

  useEffect(() => {
    if (!ficheFromUrl) return;
    unlockJobDetail(ficheFromUrl);
    setRefreshKey((k) => k + 1);
  }, [ficheFromUrl]);

  const isUnlocked = useCallback(
    (postingId: string) => isJobDetailUnlocked(postingId),
    [refreshKey, ficheFromUrl],
  );

  const requestCvSend = useCallback((postingId: string) => {
    unlockJobDetail(postingId);
    setRefreshKey((k) => k + 1);
  }, []);

  return { isUnlocked, requestCvSend, ficheFromUrl };
}
