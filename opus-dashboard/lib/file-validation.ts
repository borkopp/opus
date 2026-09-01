export function validateImageFile(file: File, maxMb = 20): string | null {
  if (!file.type.startsWith("image/")) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `Image must be smaller than ${maxMb} MB.`;
  }
  return null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function readStorageId(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "storageId" in value &&
    typeof value.storageId === "string"
  ) {
    return value.storageId;
  }
  throw new Error("Upload response did not include a storage ID");
}

export function getImageStorageUrl(
  urlOrId?: string | null,
): string | undefined {
  if (!urlOrId) return undefined;
  if (
    urlOrId.startsWith("http://") ||
    urlOrId.startsWith("https://") ||
    urlOrId.startsWith("/") ||
    urlOrId.startsWith("blob:") ||
    urlOrId.startsWith("data:image/")
  ) {
    return urlOrId;
  }
  return undefined;
}
