import { useEffect, useState } from "react";

/**
 * Retourne true uniquement après le premier montage client.
 * Utiliser pour éviter les faux états sur les composants qui lisent l'environnement
 * client (localStorage, document, ou le thème via useTheme si un switch est réintroduit).
 *
 * Règle : tout composant qui lit l'environnement client doit s'appuyer sur
 * useMounted() avant d'afficher un état dérivé, ou afficher un état neutre (skeleton).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
