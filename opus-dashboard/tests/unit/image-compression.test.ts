import { describe, expect, it, vi } from "vitest";
import {
  calculateTargetDimensions,
  getOutputFilename,
  IMAGE_PRESETS,
  compressImage,
  uploadCompressedImage,
} from "../../lib/image-compression";
import {
  validateImageFile,
  readStorageId,
  getErrorMessage,
  getImageStorageUrl,
} from "../../lib/file-validation";

describe("calculateTargetDimensions", () => {
  it("keeps original dimensions if within maximum bounds", () => {
    expect(calculateTargetDimensions(800, 600, 1920, 1920)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("scales down landscape images proportionally when width exceeds max", () => {
    // 3840x2160 -> max 1920x1920 -> 1920x1080
    expect(calculateTargetDimensions(3840, 2160, 1920, 1920)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it("scales down portrait images proportionally when height exceeds max", () => {
    // 1000x3000 -> max 1000x1500 -> 500x1500
    expect(calculateTargetDimensions(1000, 3000, 1000, 1500)).toEqual({
      width: 500,
      height: 1500,
    });
  });

  it("scales down when both dimensions exceed max", () => {
    // 4000x4000 -> max 800x800 -> 800x800
    expect(calculateTargetDimensions(4000, 4000, 800, 800)).toEqual({
      width: 800,
      height: 800,
    });
  });

  it("handles edge cases with zero or negative dimensions safely", () => {
    expect(calculateTargetDimensions(0, 0, 800, 800)).toEqual({
      width: 1,
      height: 1,
    });
    expect(calculateTargetDimensions(-100, -50, 800, 800)).toEqual({
      width: 1,
      height: 1,
    });
  });
});

describe("getOutputFilename", () => {
  it("changes .jpg and .png extensions to .webp", () => {
    expect(getOutputFilename("photo.jpg", "image/webp")).toBe("photo.webp");
    expect(getOutputFilename("profile.picture.png", "image/webp")).toBe(
      "profile.picture.webp",
    );
    expect(getOutputFilename("avatar.jpeg", "image/webp")).toBe("avatar.webp");
  });

  it("preserves name without extension", () => {
    expect(getOutputFilename("uploadedfile", "image/webp")).toBe(
      "uploadedfile.webp",
    );
  });

  it("supports target format extensions", () => {
    expect(getOutputFilename("photo.png", "image/jpeg")).toBe("photo.jpg");
    expect(getOutputFilename("photo.jpg", "image/png")).toBe("photo.png");
  });
});

describe("validateImageFile", () => {
  it("allows valid image files under size limit", () => {
    const file = new File(["dummy content"], "photo.jpg", {
      type: "image/jpeg",
    });
    expect(validateImageFile(file, 20)).toBeNull();
  });

  it("rejects non-image files", () => {
    const file = new File(["dummy content"], "doc.pdf", {
      type: "application/pdf",
    });
    expect(validateImageFile(file)).toBe("Choose a JPEG, PNG, or WebP image.");
  });

  it("rejects oversized image files", () => {
    const largeBlob = new Uint8Array(6 * 1024 * 1024);
    const file = new File([largeBlob], "large.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file, 5)).toBe("Image must be smaller than 5 MB.");
  });
});

describe("readStorageId", () => {
  it("extracts storageId string from valid response", () => {
    expect(readStorageId({ storageId: "12345abc" })).toBe("12345abc");
  });

  it("throws error for missing or invalid storageId", () => {
    expect(() => readStorageId({})).toThrow(
      "Upload response did not include a storage ID",
    );
    expect(() => readStorageId(null)).toThrow(
      "Upload response did not include a storage ID",
    );
    expect(() => readStorageId({ storageId: 123 })).toThrow(
      "Upload response did not include a storage ID",
    );
  });
});

describe("getErrorMessage", () => {
  it("extracts error message from Error instance", () => {
    expect(getErrorMessage(new Error("Network failed"), "Fallback")).toBe(
      "Network failed",
    );
  });

  it("returns fallback for non-Error values", () => {
    expect(getErrorMessage("unexpected", "Fallback")).toBe("Fallback");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});

describe("getImageStorageUrl", () => {
  it("returns undefined for null or empty input", () => {
    expect(getImageStorageUrl(undefined)).toBeUndefined();
    expect(getImageStorageUrl(null)).toBeUndefined();
    expect(getImageStorageUrl("")).toBeUndefined();
  });

  it("returns full HTTP URLs as-is", () => {
    expect(getImageStorageUrl("https://example.com/image.jpg")).toBe(
      "https://example.com/image.jpg",
    );
    expect(getImageStorageUrl("http://example.com/image.jpg")).toBe(
      "http://example.com/image.jpg",
    );
  });

  it("does not guess a URL for an unresolved Convex storage ID", () => {
    expect(getImageStorageUrl("kg2345678")).toBeUndefined();
  });

  it("returns browser-safe local image sources as-is", () => {
    expect(getImageStorageUrl("/avatar.png")).toBe("/avatar.png");
    expect(getImageStorageUrl("blob:http://localhost/avatar")).toBe(
      "blob:http://localhost/avatar",
    );
    expect(getImageStorageUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
  });
});

describe("compressImage and presets", () => {
  it("defines standard presets for avatars, services, logos, covers, and galleries", () => {
    expect(IMAGE_PRESETS.avatar).toEqual({
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85,
      format: "image/webp",
    });
    expect(IMAGE_PRESETS.service).toEqual({
      maxWidth: 1440,
      maxHeight: 1440,
      quality: 0.82,
      format: "image/webp",
    });
    expect(IMAGE_PRESETS.logo).toEqual({
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.9,
      format: "image/webp",
    });
    expect(IMAGE_PRESETS.cover).toEqual({
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.82,
      format: "image/webp",
    });
    expect(IMAGE_PRESETS.gallery).toEqual({
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.82,
      format: "image/webp",
    });
  });

  it("passes through vector SVGs without modification", async () => {
    const svgFile = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"><circle /></svg>'],
      "icon.svg",
      { type: "image/svg+xml" },
    );
    const result = await compressImage(svgFile);
    expect(result).toBe(svgFile);
  });

  it("passes through non-image files", async () => {
    const txtFile = new File(["hello"], "file.txt", { type: "text/plain" });
    const result = await compressImage(txtFile);
    expect(result).toBe(txtFile);
  });
});

describe("uploadCompressedImage", () => {
  it("validates file before calling upload functions", async () => {
    const invalidFile = new File(["test"], "file.txt", { type: "text/plain" });
    const getUploadUrl = vi.fn();

    await expect(
      uploadCompressedImage({ file: invalidFile, getUploadUrl }),
    ).rejects.toThrow("Choose a JPEG, PNG, or WebP image.");

    expect(getUploadUrl).not.toHaveBeenCalled();
  });

  it("uploads successfully and returns storageId", async () => {
    const file = new File(["image-bytes"], "photo.jpg", {
      type: "image/jpeg",
    });
    const getUploadUrl = vi
      .fn()
      .mockResolvedValue("https://storage.example.com/upload");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ storageId: "storage_abc123" }),
    });
    global.fetch = fetchMock;

    const storageId = await uploadCompressedImage({
      file,
      getUploadUrl,
      options: IMAGE_PRESETS.avatar,
    });

    expect(getUploadUrl).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://storage.example.com/upload",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(storageId).toBe("storage_abc123");
  });

  it("throws error when upload response is not ok", async () => {
    const file = new File(["image-bytes"], "photo.jpg", {
      type: "image/jpeg",
    });
    const getUploadUrl = vi
      .fn()
      .mockResolvedValue("https://storage.example.com/upload");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = fetchMock;

    await expect(
      uploadCompressedImage({ file, getUploadUrl }),
    ).rejects.toThrow("Upload failed");
  });
});
