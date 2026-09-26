// Keep the encoded action argument below Convex's 1 MiB argument limit.
export async function prepareServicePhoto(file: File): Promise<string> {
  if (
    !/^image\/(jpeg|png|webp)$/.test(file.type) ||
    file.size > 20 * 1024 * 1024
  ) {
    throw new Error("Choose a JPG, PNG or WebP photo under 20 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      2200 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "This photo could not be read. Try a JPG, PNG or WebP photo.",
      );
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65, 0.5]) {
      const encoded = canvas.toDataURL("image/jpeg", quality);
      if (encoded.length <= 900_000) return encoded;
    }
    throw new Error("Choose a smaller JPG, PNG or WebP photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
