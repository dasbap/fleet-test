import { useEffect, useState } from "react";

/**
 * Retourne true uniquement après le premier montage client.
 * Utiliser pour éviter les faux états sur les composants qui lisent
 * le thème (useTheme) ou localStorage/document au premier rendu.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
