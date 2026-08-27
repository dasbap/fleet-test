import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  compressDataUrl,
  compressImageFile,
  compressImageForOffline,
} from "@/services/image-compression.service";

class FakeImage {
  width = 1600;
  height = 800;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  private value = "";

  set src(value: string) {
    this.value = value;
    if (value.includes("broken")) this.onerror?.();
    else this.onload?.();
  }

  get src() {
    return this.value;
  }
}

class FakeFileReader {
  result: string | ArrayBuffer | null = null;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  fail = false;

  readAsDataURL(blob: Blob) {
    if (readerFailure) {
      this.onerror?.();
      return;
    }
    this.result = `data:${blob.type};base64,MOCK`;
    this.onload?.();
  }
}

let readerFailure = false;
let blobSizes: number[] = [];
let canvasContextAvailable = true;
let toBlobReturnsNull = false;
let drawImage: ReturnType<typeof vi.fn>;
let createElementSpy: ReturnType<typeof vi.spyOn>;
let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;

function blobOfSize(size: number) {
  return new Blob([new Uint8Array(size)], { type: "image/jpeg" });
}

function installCanvas() {
  drawImage = vi.fn();
  const original = document.createElement.bind(document);
  createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
    if (tagName !== "canvas") return original(tagName);
    return {
      width: 0,
      height: 0,
      getContext: vi.fn(() => (canvasContextAvailable ? { drawImage } : null)),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
        if (toBlobReturnsNull) {
          callback(null);
          return;
        }
        const size = blobSizes.length > 1 ? blobSizes.shift()! : (blobSizes[0] ?? 100);
        callback(blobOfSize(size));
      }),
    } as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
}

describe("image compression service", () => {
  beforeEach(() => {
    readerFailure = false;
    blobSizes = [100];
    canvasContextAvailable = true;
    toBlobReturnsNull = false;
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    vi.stubGlobal("FileReader", FakeFileReader as unknown as typeof FileReader);
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:mock") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    installCanvas();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL });
    } else {
      delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL });
    } else {
      delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
    }
  });

  it("compresse une data URL et redimensionne l'image", async () => {
    const result = await compressDataUrl("data:image/png;base64,AAAA", {
      maxWidth: 800,
      quality: 0.8,
      maxBytes: 1000,
    });
    expect(result).toEqual({
      dataUrl: "data:image/jpeg;base64,MOCK",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      width: 800,
      height: 400,
    });
    expect(drawImage).toHaveBeenCalledWith(expect.any(FakeImage), 0, 0, 800, 400);
  });

  it("ne grossit pas une petite image et garantit au moins un pixel", async () => {
    class TinyImage extends FakeImage {
      width = 0;
      height = 0;
    }
    vi.stubGlobal("Image", TinyImage as unknown as typeof Image);
    const result = await compressDataUrl("data:image/png;base64,TINY", { maxWidth: 800, maxBytes: 1000 });
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it("utilise les options par défaut", async () => {
    const result = await compressDataUrl("data:image/png;base64,DEFAULT");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.sizeBytes).toBe(100);
  });

  it("réduit progressivement la qualité jusqu'à respecter la taille", async () => {
    blobSizes = [2000, 1800, 900];
    const result = await compressDataUrl("data:image/png;base64,AAAA", {
      maxWidth: 1600,
      quality: 0.8,
      maxBytes: 1000,
    });
    expect(result.sizeBytes).toBe(900);
  });

  it("rejette une image encore trop volumineuse", async () => {
    blobSizes = [5000];
    await expect(
      compressDataUrl("data:image/png;base64,AAAA", { quality: 0.4, maxBytes: 1000 }),
    ).rejects.toThrow("Photo trop volumineuse après compression");
  });

  it("rejette si le canvas 2d est indisponible", async () => {
    canvasContextAvailable = false;
    await expect(compressDataUrl("data:image/png;base64,AAAA")).rejects.toThrow(
      "Canvas non disponible pour la compression.",
    );
  });

  it("rejette si canvas.toBlob ne produit rien", async () => {
    toBlobReturnsNull = true;
    await expect(compressDataUrl("data:image/png;base64,AAAA")).rejects.toThrow(
      "Échec de compression JPEG.",
    );
  });

  it("rejette une data URL non chargeable", async () => {
    await expect(compressDataUrl("broken:data-url")).rejects.toThrow("Impossible de charger l'image.");
  });

  it("rejette si le FileReader échoue", async () => {
    readerFailure = true;
    await expect(compressDataUrl("data:image/png;base64,AAAA")).rejects.toThrow(
      "Lecture du blob compressé impossible.",
    );
  });

  it("compresse un fichier et libère l'object URL", async () => {
    const file = new Blob(["image"], { type: "image/png" });
    const result = await compressImageFile(file, { maxWidth: 1000, maxBytes: 1000 });
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(result.width).toBe(1000);
    expect(result.height).toBe(500);
  });

  it("libère l'object URL si le fichier ne charge pas", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "broken:blob") });
    const file = new Blob(["image"], { type: "image/png" });
    await expect(compressImageFile(file)).rejects.toThrow("Impossible de charger l'image.");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("broken:blob");
  });

  it("route les sources string vers la compression data URL", async () => {
    await expect(compressImageForOffline("data:image/png;base64,AAAA", { maxBytes: 1000 })).resolves.toMatchObject({
      mimeType: "image/jpeg",
    });
  });

  it("route les blobs vers la compression fichier", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    await expect(compressImageForOffline(blob, { maxBytes: 1000 })).resolves.toMatchObject({ mimeType: "image/jpeg" });
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("retourne null sans document", async () => {
    createElementSpy.mockRestore();
    vi.stubGlobal("document", undefined);
    await expect(compressImageForOffline("data:image/png;base64,AAAA")).resolves.toBeNull();
  });
});
