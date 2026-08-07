import { registerSW } from "virtual:pwa-register";

export const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    console.info("E-Samba est pret pour un usage hors ligne.");
  },
  onNeedRefresh() {
    console.info("Nouvelle version E-Samba detectee, mise a jour immediate.");
    void updateSW(true);
  },
});
