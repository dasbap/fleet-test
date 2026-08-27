import { beforeEach, describe, expect, it, vi } from "vitest";

const cameraMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getPhoto: vi.fn(),
}));

const lifecycleMock = vi.hoisted(() => ({
  started: vi.fn(),
  finished: vi.fn(),
}));

vi.mock("@capacitor/camera", () => ({
  Camera: cameraMock,
  CameraResultType: { DataUrl: "DataUrl" },
  CameraSource: { Camera: "Camera", Photos: "Photos" },
}));

vi.mock("@/lib/native/nativeLifecycleGuards", () => ({
  markNativeExternalActivityStarted: lifecycleMock.started,
  markNativeExternalActivityFinished: lifecycleMock.finished,
}));

import { CameraService, CameraServiceError } from "@/services/camera.service";

describe("CameraService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne les permissions courantes", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    const service = new CameraService();

    await expect(service.checkPermissions()).resolves.toEqual({ camera: "granted", photos: "granted" });
  });

  it("normalise les erreurs de permission", async () => {
    cameraMock.checkPermissions.mockRejectedValue(new Error("boom"));
    const service = new CameraService();

    await expect(service.checkPermissions()).rejects.toMatchObject({ code: "unknown", message: "boom" });
  });

  it("demande uniquement la permission caméra", async () => {
    cameraMock.requestPermissions.mockResolvedValue({ camera: "granted", photos: "prompt" });
    const service = new CameraService();

    await expect(service.requestCameraPermission()).resolves.toEqual({ camera: "granted", photos: "prompt" });
    expect(cameraMock.requestPermissions).toHaveBeenCalledWith({ permissions: ["camera"] });
  });

  it("refuse immédiatement une caméra déjà refusée", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "denied", photos: "granted" });
    const service = new CameraService();

    await expect(service.ensureCameraPermission()).rejects.toMatchObject({ code: "permission_denied" });
    expect(cameraMock.requestPermissions).not.toHaveBeenCalled();
  });

  it.each(["prompt", "limited"])("redemande la permission caméra depuis %s", async (camera) => {
    cameraMock.checkPermissions.mockResolvedValue({ camera, photos: "granted" });
    cameraMock.requestPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    const service = new CameraService();

    await expect(service.ensureCameraPermission()).resolves.toBeUndefined();
    expect(cameraMock.requestPermissions).toHaveBeenCalledWith({ permissions: ["camera"] });
  });

  it("refuse si la demande de permission caméra reste refusée", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "prompt", photos: "granted" });
    cameraMock.requestPermissions.mockResolvedValue({ camera: "denied", photos: "granted" });
    const service = new CameraService();

    await expect(service.ensureCameraPermission()).rejects.toMatchObject({ code: "permission_denied" });
  });

  it("capture une photo data URL avec les options demandées", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    cameraMock.getPhoto.mockResolvedValue({
      webPath: "blob:https://example/photo",
      dataUrl: "data:image/png;base64,AAAA",
      base64String: "AAAA",
      path: "file:///photo.png",
      format: "png",
    });
    const service = new CameraService();

    const result = await service.takePictureFromCamera({ quality: 70, maxWidth: 800, maxHeight: 600 });

    expect(cameraMock.getPhoto).toHaveBeenCalledWith({
      quality: 70,
      allowEditing: false,
      resultType: "DataUrl",
      source: "Camera",
      correctOrientation: true,
      width: 800,
      height: 600,
    });
    expect(result).toEqual({
      displayUrl: "blob:https://example/photo",
      uploadData: "data:image/png;base64,AAAA",
      format: "png",
      nativePath: "file:///photo.png",
      base64: "AAAA",
      dataUrl: "data:image/png;base64,AAAA",
    });
    expect(lifecycleMock.started).toHaveBeenCalledTimes(1);
    expect(lifecycleMock.finished).toHaveBeenCalledTimes(1);
  });

  it("utilise le base64 comme upload et aperçu de secours", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    cameraMock.getPhoto.mockResolvedValue({ base64String: "BBBB", format: "jpeg" });
    const service = new CameraService();

    await expect(service.takePictureFromCamera()).resolves.toEqual({
      displayUrl: "data:image/jpeg;base64,BBBB",
      uploadData: "BBBB",
      format: "jpeg",
      nativePath: undefined,
      base64: "BBBB",
      dataUrl: undefined,
    });
    expect(cameraMock.getPhoto).toHaveBeenCalledWith(expect.objectContaining({ quality: 85 }));
  });

  it("rejette une photo sans donnée exploitable", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    cameraMock.getPhoto.mockResolvedValue({ webPath: "blob:x", format: "jpeg" });
    const service = new CameraService();

    await expect(service.takePictureFromCamera()).rejects.toMatchObject({ code: "unavailable" });
    expect(lifecycleMock.finished).toHaveBeenCalledTimes(1);
  });

  it("normalise l'annulation et les erreurs inconnues de capture", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    const service = new CameraService();

    cameraMock.getPhoto.mockRejectedValueOnce(new Error("User cancelled photos app"));
    await expect(service.takePictureFromCamera()).rejects.toMatchObject({ code: "user_cancelled", message: "Capture annulée." });

    cameraMock.getPhoto.mockRejectedValueOnce({ reason: "native failure" });
    await expect(service.takePictureFromCamera()).rejects.toMatchObject({ code: "unknown", message: "[object Object]" });
    expect(lifecycleMock.finished).toHaveBeenCalledTimes(2);
  });

  it("préserve une CameraServiceError levée pendant la capture", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    const expected = new CameraServiceError("custom", "unavailable");
    cameraMock.getPhoto.mockRejectedValue(expected);
    const service = new CameraService();

    await expect(service.takePictureFromCamera()).rejects.toBe(expected);
  });

  it("refuse immédiatement une photothèque déjà refusée", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "denied" });
    const service = new CameraService();

    await expect(service.pickFromPhotos()).rejects.toMatchObject({ code: "permission_denied" });
    expect(cameraMock.getPhoto).not.toHaveBeenCalled();
  });

  it.each(["prompt", "limited"])("demande la permission photos depuis %s", async (photos) => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos });
    cameraMock.requestPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    cameraMock.getPhoto.mockResolvedValue({ dataUrl: "data:image/jpeg;base64,CCCC", format: "jpeg" });
    const service = new CameraService();

    await expect(service.pickFromPhotos({ quality: 60, maxWidth: 1000, maxHeight: 700 })).resolves.toMatchObject({
      uploadData: "data:image/jpeg;base64,CCCC",
      displayUrl: "data:image/jpeg;base64,CCCC",
    });
    expect(cameraMock.requestPermissions).toHaveBeenCalledWith({ permissions: ["photos"] });
    expect(cameraMock.getPhoto).toHaveBeenCalledWith({
      quality: 60,
      allowEditing: false,
      resultType: "DataUrl",
      source: "Photos",
      width: 1000,
      height: 700,
    });
  });

  it("refuse si la demande photos reste refusée", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "prompt" });
    cameraMock.requestPermissions.mockResolvedValue({ camera: "granted", photos: "denied" });
    const service = new CameraService();

    await expect(service.pickFromPhotos()).rejects.toMatchObject({ code: "permission_denied" });
  });

  it("normalise annulation, erreur inconnue et erreur service de la galerie", async () => {
    cameraMock.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    const service = new CameraService();

    cameraMock.getPhoto.mockRejectedValueOnce(new Error("cancelled"));
    await expect(service.pickFromPhotos()).rejects.toMatchObject({ code: "user_cancelled", message: "Sélection annulée." });

    cameraMock.getPhoto.mockRejectedValueOnce(new Error("gallery failure"));
    await expect(service.pickFromPhotos()).rejects.toMatchObject({ code: "unknown", message: "gallery failure" });

    const expected = new CameraServiceError("photo unavailable", "unavailable");
    cameraMock.getPhoto.mockRejectedValueOnce(expected);
    await expect(service.pickFromPhotos()).rejects.toBe(expected);
    expect(lifecycleMock.finished).toHaveBeenCalledTimes(3);
  });
});
