import { useEffect, useState } from "react";

/**
 * Retourne true uniquement après le premier montage client.
 * Utiliser pour éviter les faux états sur les composants qui lisent
 * le thème (useTheme) ou localStorage/document au premier rendu.
 *
 * Règle : tout composant qui lit le thème ou l'environnement client
 * (localStorage, document) doit s'appuyer sur useMounted() avant d'afficher
 * un état dérivé, ou afficher un état neutre (skeleton) en attendant.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
