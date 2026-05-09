import type { FirebaseApp } from "firebase/app";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { MessagePayload, Messaging } from "firebase/messaging";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { isNativePlatform } from "@/lib/platform";
import { pushNotificationService } from "@/services/push-notification.service";

type NotificationPlatform = "web" | "ios" | "android";

interface RequestTokenOptions {
  platform?: NotificationPlatform;
}

type ForegroundMessageCallback = (payload: MessagePayload) => void;

function getFirebaseConfigFromEnv(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
} {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId || !vapidKey) {
    throw new Error(
      "La configuration Firebase est incomplète. Merci de vérifier les variables VITE_FIREBASE_* dans votre fichier .env.local.",
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    vapidKey,
  };
}

function ensureWindow(): void {
  if (typeof window === "undefined") {
    throw new Error("Les notifications web ne sont pas disponibles dans cet environnement.");
  }
}

class NotificationsClientService {
  private firebaseApp: FirebaseApp | null = null;
  private messaging: Messaging | null = null;

  private ensureFirebase(): { app: FirebaseApp; messaging: Messaging; vapidKey: string } {
    ensureWindow();

    const config = getFirebaseConfigFromEnv();

    if (!this.firebaseApp) {
      if (getApps().length > 0) {
        this.firebaseApp = getApp();
      } else {
        this.firebaseApp = initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        });
      }
    }

    if (!this.messaging) {
      this.messaging = getMessaging(this.firebaseApp);
    }

    return { app: this.firebaseApp, messaging: this.messaging, vapidKey: config.vapidKey };
  }

  /**
   * Demande la permission de notification et retourne le token FCM.
   * - Web : utilise Firebase Messaging.
   * - Mobile (Capacitor) : utilise le service push natif existant.
   */
  async requestPermissionAndGetToken(options: RequestTokenOptions = {}): Promise<string | null> {
    const platform: NotificationPlatform = options.platform ?? (isNativePlatform() ? "android" : "web");

    if (platform === "web" && !isNativePlatform()) {
      return this.requestWebToken();
    }

    if (platform === "ios" || platform === "android" || isNativePlatform()) {
      return this.requestNativeToken();
    }

    // Cas de repli : si la plateforme n'est pas reconnue, on tente le web.
    return this.requestWebToken();
  }

  /**
   * Souscrit aux messages reçus en avant-plan (web uniquement).
   * Retourne une fonction de désinscription.
   */
  async subscribeToForegroundMessages(callback: ForegroundMessageCallback): Promise<() => void> {
    if (isNativePlatform()) {
      // La gestion foreground native est déjà couverte par pushNotificationService.
      return () => {};
    }

    ensureWindow();

    const supported = await isSupported();
    if (!supported) {
      throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
    }

    const { messaging } = this.ensureFirebase();

    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });

    return unsubscribe;
  }

  private async requestWebToken(): Promise<string | null> {
    ensureWindow();

    if (!("Notification" in window)) {
      throw new Error("Les notifications ne sont pas supportées par ce navigateur.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      throw new Error("Firebase Messaging n'est pas supporté par ce navigateur.");
    }

    const { messaging, vapidKey } = this.ensureFirebase();

    try {
      const token = await getToken(messaging, {
        vapidKey,
      });

      if (!token) {
        return null;
      }

      return token;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Impossible de récupérer le token de notifications : ${error.message}`
          : "Impossible de récupérer le token de notifications.",
      );
    }
  }

  private async requestNativeToken(): Promise<string | null> {
    // Si on a déjà démarré le service push et qu'un token est disponible, on le réutilise.
    const existingToken = pushNotificationService.getLastToken();
    if (existingToken) {
      return existingToken;
    }

    try {
      await pushNotificationService.start({
        onRegistration: () => {
          // Le token sera lu après démarrage via getLastToken.
        },
        onRegistrationError: (err) => {
          throw new Error(
            `Erreur lors de l'enregistrement des notifications push : ${err.error}`,
          );
        },
      });
      return pushNotificationService.getLastToken();
    } catch (error) {
      throw error instanceof Error
        ? new Error(
            `Erreur lors de l'initialisation des notifications push : ${error.message}`,
          )
        : new Error("Erreur lors de l'initialisation des notifications push.");
    }
  }
}

export const notificationsClientService = new NotificationsClientService();

