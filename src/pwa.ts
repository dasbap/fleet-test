import { registerSW } from "virtual:pwa-register";

export const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    console.info("E-Samba est prêt pour un usage hors ligne.");
  },
  onNeedRefresh() {
    console.info("Une nouvelle version d'E-Samba sera utilisée au prochain chargement.");
  },
});
