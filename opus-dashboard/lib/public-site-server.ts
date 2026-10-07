import "server-only";

import { cache } from "react";
import { fetchQuery } from "convex/nextjs";
import { headers } from "next/headers";
import { api } from "@/convex/_generated/api";
import { tenantSlugFromHost } from "@/lib/tenant-sites";
import { clientAreaUrl, clientBookingPath } from "@/lib/client-account";

export const getPublicSite = cache(async (slug: string) => {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk";
  const requestedSlug = tenantSlugFromHost(
    (await headers()).get("host"),
    rootDomain,
  );
  const normalizedSlug = slug.trim().toLowerCase();
  if (requestedSlug !== normalizedSlug) return null;

  return await fetchQuery(api.publicSite.getBySlug, { slug: normalizedSlug });
});

/** Central /book/[slug] can resolve any published beauty studio by its public slug. */
export const getSharedBookingSite = cache(async (slug: string) =>
  fetchQuery(api.publicSite.getBySlug, { slug: slug.trim().toLowerCase() }),
);

/** One booking origin keeps the remembered client session shared across studios. */
export async function centralBookingUrl(
  slug: string,
  query: Record<string, string | string[] | undefined>,
) {
  const requestHeaders = await headers();
  const origin = new URL(
    `http://${requestHeaders.get("host") || "localhost:3000"}`,
  );
  if (
    origin.hostname.endsWith(".localhost") ||
    (!/^[\d.:[\]]+$/.test(origin.hostname) && origin.hostname !== "localhost")
  )
    origin.hostname = "localhost";
  return clientAreaUrl(clientBookingPath(slug, query), origin.origin);
}
