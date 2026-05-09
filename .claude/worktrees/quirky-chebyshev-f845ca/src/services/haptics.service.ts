import { ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativePlatform } from "@/lib/platform";

let hapticsModule: typeof import("@capacitor/haptics") | null = null;

async function getHapticsModule(): Promise<typeof import("@capacitor/haptics") | null> {
  if (!isNativePlatform()) {
    return null;
  }
  if (hapticsModule) {
    return hapticsModule;
  }
  try {
    hapticsModule = await import("@capacitor/haptics");
    return hapticsModule;
  } catch {
    return null;
  }
}

export class HapticsService {
  async notifySuccess(): Promise<void> {
    const mod = await getHapticsModule();
    if (!mod) return;
    try {
      await mod.Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Ne bloque jamais le flux métier si le retour haptique échoue.
    }
  }

  async notifyError(): Promise<void> {
    const mod = await getHapticsModule();
    if (!mod) return;
    try {
      await mod.Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Ne bloque jamais le flux métier si le retour haptique échoue.
    }
  }

  async impactSoft(): Promise<void> {
    const mod = await getHapticsModule();
    if (!mod) return;
    try {
      await mod.Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Feedback optionnel.
    }
  }
}

export const hapticsService = new HapticsService();
