/** Validate raw OS links before Expo Router's tolerant URI decoder sees them. */
export function safeNativePath(path: string): string {
  if (!path || path.length > 4096 || /[\u0000-\u001f]/.test(path)) return "/";
  try {
    // Native links must have valid UTF-8 escapes; malformed URLs return safely home.
    decodeURIComponent(path);
    const url = new URL(path, "opus-studio://app");
    if (!["opus-studio:", "exp:", "exps:"].includes(url.protocol)) return "/";
    if (url.hostname === "expo-development-client") return "/";
    return path;
  } catch { return "/"; }
}
