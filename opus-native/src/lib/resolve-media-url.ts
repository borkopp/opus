import { getConvexUrl } from '@/lib/convex-url';

const LOCALHOSTS = new Set(['127.0.0.1', 'localhost']);
const STORAGE_MARKER = '/api/storage/';

function fixDoubleStoragePath(url: string): string {
  return url.replace('/api/storage/api/storage/', '/api/storage/');
}

function isLocalDevOrigin(hostname: string, port: string): boolean {
  if (LOCALHOSTS.has(hostname)) return true;
  if (hostname === '10.0.2.2') return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  return port === '3210' || port === '3211';
}

/**
 * Base URL for Convex file storage.
 * Local dev serves `/api/storage/*` on the deployment URL (3210), not the site URL (3211).
 * Cloud serves files on `*.convex.site`.
 */
export function getMediaBaseUrl(): string {
  const siteEnv = process.env.EXPO_PUBLIC_CONVEX_SITE_URL?.trim();
  const deployment = getConvexUrl();

  try {
    const parsed = new URL(deployment);

    if (isLocalDevOrigin(parsed.hostname, parsed.port)) {
      return deployment.replace(/\/$/, '');
    }

    if (parsed.hostname.endsWith('.convex.cloud')) {
      parsed.hostname = parsed.hostname.replace('.convex.cloud', '.convex.site');
      return parsed.toString().replace(/\/$/, '');
    }

    if (siteEnv) {
      return siteEnv.replace(/\/$/, '');
    }

    return deployment.replace(/\/$/, '');
  } catch {
    return deployment.replace(/\/$/, '');
  }
}

function extractStoragePath(value: string): string | null {
  if (value.includes(STORAGE_MARKER)) {
    const idx = value.indexOf(STORAGE_MARKER);
    return value.slice(idx);
  }
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return `${STORAGE_MARKER}${value}`;
  }
  return null;
}

/**
 * Resolves Convex storage IDs or stored URLs to fetchable image URLs.
 * Always uses the same origin as `getConvexUrl()` in local dev (required for Expo Go on device).
 */
export function resolveMediaUrl(
  pathOrUrl?: string | null,
): string | undefined {
  if (!pathOrUrl?.trim()) {
    return undefined;
  }

  const value = fixDoubleStoragePath(pathOrUrl.trim());

  const storagePath = extractStoragePath(value);
  if (!storagePath) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return undefined;
  }

  return `${getMediaBaseUrl()}${storagePath}`;
}
