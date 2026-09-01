import {
  readStorageId,
  validateImageFile,
} from "./file-validation";

export interface CompressImageOptions {
  /** Maximum output width in pixels. Default: 1920 */
  maxWidth?: number;
  /** Maximum output height in pixels. Default: 1920 */
  maxHeight?: number;
  /** Quality between 0 and 1. Default: 0.82 */
  quality?: number;
  /** Target MIME type. Default: "image/webp" */
  format?: "image/webp" | "image/jpeg" | "image/png";
  /** If true, return original file if compressed is larger or equal in size. Default: true */
  fallbackToOriginalIfLarger?: boolean;
}

export const IMAGE_PRESETS = {
  avatar: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    format: "image/webp" as const,
  },
  service: {
    maxWidth: 1440,
    maxHeight: 1440,
    quality: 0.82,
    format: "image/webp" as const,
  },
  logo: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.9,
    format: "image/webp" as const,
  },
  cover: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.82,
    format: "image/webp" as const,
  },
  gallery: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.82,
    format: "image/webp" as const,
  },
  default: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.82,
    format: "image/webp" as const,
  },
} as const;

export function calculateTargetDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return {
      width: Math.max(1, Math.round(width || 1)),
      height: Math.max(1, Math.round(height || 1)),
    };
  }
  if (width <= maxWidth && height <= maxHeight) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function getOutputFilename(
  originalName: string,
  targetFormat: string,
): string {
  const extensionMap: Record<string, string> = {
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/png": ".png",
  };
  const targetExt = extensionMap[targetFormat] ?? ".webp";
  const dotIndex = originalName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${originalName}${targetExt}`;
  }
  return `${originalName.slice(0, dotIndex)}${targetExt}`;
}

interface DecodedImage {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup: () => void;
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  // Use createImageBitmap if available for high-speed off-thread decoding and auto-orientation
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement
    }
  }

  if (
    typeof Image !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function"
  ) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
          cleanup: () => URL.revokeObjectURL(objectUrl),
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to decode image file."));
      };
      img.src = objectUrl;
    });
  }

  throw new Error("Image decoding is not supported in the current environment.");
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => resolve(blob),
        format,
        quality,
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Compresses an image file in the browser using HTML5 Canvas / ImageBitmap.
 * Scales down dimensions if they exceed maxWidth/maxHeight, converts to modern
 * WebP format (or specified format), and applies lossy compression.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  // Non-image files or SVGs (vector graphics) should not be rasterized or compressed
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  // If running in a non-browser environment without canvas, return original file
  if (
    typeof document === "undefined" ||
    typeof document.createElement !== "function"
  ) {
    return file;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    format = "image/webp",
    fallbackToOriginalIfLarger = true,
  } = options;

  let decoded: DecodedImage | null = null;
  try {
    decoded = await decodeImage(file);
    const { width: targetWidth, height: targetHeight } =
      calculateTargetDimensions(
        decoded.width,
        decoded.height,
        maxWidth,
        maxHeight,
      );

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    decoded.draw(ctx, targetWidth, targetHeight);

    let blob = await canvasToBlob(canvas, format, quality);

    // Fallback if browser canvas does not support requested format
    if (!blob && format !== "image/jpeg") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob && format !== "image/png") {
      blob = await canvasToBlob(canvas, "image/png", 1);
    }

    if (!blob) {
      return file;
    }

    // Keep original if the compressed blob is larger and dimensions didn't change
    if (
      fallbackToOriginalIfLarger &&
      blob.size >= file.size &&
      decoded.width <= maxWidth &&
      decoded.height <= maxHeight
    ) {
      return file;
    }

    const outputName = getOutputFilename(file.name, blob.type);
    return new File([blob], outputName, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Image compression failed, using original file:", error);
    return file;
  } finally {
    decoded?.cleanup();
  }
}

export interface UploadCompressedImageParams {
  file: File;
  getUploadUrl: () => Promise<string>;
  options?: CompressImageOptions;
  maxInitialMb?: number;
}

/**
 * Validates, compresses, and uploads an image to Convex storage.
 * Returns the storageId.
 */
export async function uploadCompressedImage({
  file,
  getUploadUrl,
  options,
  maxInitialMb = 20,
}: UploadCompressedImageParams): Promise<string> {
  const validationError = validateImageFile(file, maxInitialMb);
  if (validationError) {
    throw new Error(validationError);
  }

  const compressed = await compressImage(file, options);
  const postUrl = await getUploadUrl();

  const response = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": compressed.type },
    body: compressed,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = (await response.json()) as unknown;
  return readStorageId(data);
}
