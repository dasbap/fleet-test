import {
  IMAGE_COMPRESS_MAX_WIDTH,
  IMAGE_COMPRESS_QUALITY,
  MAX_COMPRESSED_PHOTO_BYTES,
} from "@esamba/domain-validation";

export interface CompressImageOptions {
  maxWidth?: number;
  quality?: number;
  maxBytes?: number;
}

export interface CompressedImageResult {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = dataUrl;
  });
}

function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image."));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Échec de compression JPEG."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function compressLoadedImage(
  img: HTMLImageElement,
  options: CompressImageOptions,
): Promise<CompressedImageResult> {
  const maxWidth = options.maxWidth ?? IMAGE_COMPRESS_MAX_WIDTH;
  const quality = options.quality ?? IMAGE_COMPRESS_QUALITY;
  const maxBytes = options.maxBytes ?? MAX_COMPRESSED_PHOTO_BYTES;

  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas non disponible pour la compression.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  let currentQuality = quality;
  let blob = await canvasToJpegBlob(canvas, currentQuality);

  while (blob.size > maxBytes && currentQuality > 0.35) {
    currentQuality -= 0.1;
    blob = await canvasToJpegBlob(canvas, currentQuality);
  }

  if (blob.size > maxBytes) {
    throw new Error(
      `Photo trop volumineuse après compression (${Math.round(blob.size / 1024)} Ko).`,
    );
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du blob compressé impossible."));
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    mimeType: "image/jpeg",
    sizeBytes: blob.size,
    width,
    height,
  };
}

/** Compresse une data URL (ex. capture caméra). */
export async function compressDataUrl(
  dataUrl: string,
  options?: CompressImageOptions,
): Promise<CompressedImageResult> {
  const img = await loadImageFromDataUrl(dataUrl);
  return compressLoadedImage(img, options ?? {});
}

/** Compresse un fichier ou blob image. */
export async function compressImageFile(
  file: File | Blob,
  options?: CompressImageOptions,
): Promise<CompressedImageResult> {
  const img = await loadImageFromFile(file);
  return compressLoadedImage(img, options ?? {});
}

/** Compresse si possible ; sinon retourne la source inchangée (SSR). */
export async function compressImageForOffline(
  source: string | File | Blob,
  options?: CompressImageOptions,
): Promise<CompressedImageResult | null> {
  if (typeof document === "undefined") {
    return null;
  }
  if (typeof source === "string") {
    return compressDataUrl(source, options);
  }
  return compressImageFile(source, options);
}
