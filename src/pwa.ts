import { registerSW } from "virtual:pwa-register";

export const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    console.info("E-Samba est prêt pour un usage hors ligne.");
  },
  onNeedRefresh() {
    // Recharge automatiquement pour éviter de rester bloqué sur une version SW obsolète.
    void updateSW(true);
  },
});
