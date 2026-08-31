const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BASE64_URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64Url(bytes: Uint8Array) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const value = (first << 16) | (second << 8) | third;

    result += BASE64_URL_ALPHABET[(value >> 18) & 63];
    result += BASE64_URL_ALPHABET[(value >> 12) & 63];
    if (index + 1 < bytes.length) {
      result += BASE64_URL_ALPHABET[(value >> 6) & 63];
    }
    if (index + 2 < bytes.length) {
      result += BASE64_URL_ALPHABET[value & 63];
    }
  }
  return result;
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid encrypted verification payload.");
  }

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of value) {
    const digit = BASE64_URL_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error("Invalid encrypted verification payload.");
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  return new Uint8Array(bytes);
}

function getBookingEmailSecret() {
  const value =
    process.env.BOOKING_OTP_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();
  if (!value) {
    throw new Error(
      "Booking email verification requires BOOKING_OTP_SECRET or BETTER_AUTH_SECRET.",
    );
  }
  return value;
}

function isLocalUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

async function encryptionKey() {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${getBookingEmailSecret()}:booking-email-encryption:v1`),
  );
  return await crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export function normalizeBookingEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidBookingEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function hashBookingOtp(email: string, otp: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getBookingEmailSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(
      `booking-email-otp:v1:${normalizeBookingEmail(email)}:${otp}`,
    ),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function encryptBookingOtp(otp: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    encoder.encode(otp),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(
    new Uint8Array(encrypted),
  )}`;
}

export async function decryptBookingOtp(payload: string) {
  const [version, encodedIv, encodedCiphertext, extra] = payload.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext || extra) {
    throw new Error("Invalid encrypted verification payload.");
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(encodedIv) },
    await encryptionKey(),
    base64UrlToBytes(encodedCiphertext),
  );
  return decoder.decode(decrypted);
}

export function constantTimeStringEqual(first: string, second: string) {
  const length = Math.max(first.length, second.length);
  let difference = first.length ^ second.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function generateBookingOtp() {
  const configuredOtp = process.env.AUTH_TEST_OTP?.trim();
  if (configuredOtp) {
    if (!isLocalUrl(process.env.SITE_URL)) {
      throw new Error("AUTH_TEST_OTP is only allowed for local sites.");
    }
    if (!/^\d{6}$/.test(configuredOtp)) {
      throw new Error("AUTH_TEST_OTP must be exactly six digits.");
    }
    return configuredOtp;
  }

  const maximum = 1_000_000;
  const upperBound = Math.floor(0x1_0000_0000 / maximum) * maximum;
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= upperBound);
  return String(random[0] % maximum).padStart(6, "0");
}
