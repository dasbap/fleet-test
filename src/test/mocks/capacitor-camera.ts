/**
 * Mock @capacitor/camera pour Vitest (résolution sans plugin natif / CI minimal).
 * Le build applicatif utilise toujours le package réel via vite.config.ts.
 */

export const CameraResultType = {
  Uri: "uri",
  Base64: "base64",
  DataUrl: "dataUrl",
} as const;

export const CameraSource = {
  Camera: "CAMERA",
  Photos: "PHOTOS",
  Prompt: "PROMPT",
} as const;

export type PermissionStatus = {
  camera: "prompt" | "granted" | "denied" | "limited";
  photos: "prompt" | "granted" | "denied" | "limited";
};

export interface Photo {
  path?: string;
  webPath?: string;
  format?: string;
  base64String?: string;
  dataUrl?: string;
}

export const Camera = {
  async checkPermissions(): Promise<PermissionStatus> {
    return { camera: "granted", photos: "granted" };
  },
  async requestPermissions(_opts?: {
    permissions?: ("camera" | "photos")[];
  }): Promise<PermissionStatus> {
    return { camera: "granted", photos: "granted" };
  },
  async getPhoto(_options?: {
    quality?: number;
    allowEditing?: boolean;
    resultType?: string;
    source?: string;
    correctOrientation?: boolean;
    width?: number;
    height?: number;
  }): Promise<Photo> {
    throw new Error("Mock Camera : utiliser vi.mock dans le test ciblé.");
  },
};
