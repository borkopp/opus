import "server-only";

import { cache } from "react";
import { fetchQuery } from "convex/nextjs";
import { headers } from "next/headers";
import { api } from "@/convex/_generated/api";
import { tenantSlugFromHost } from "@/lib/tenant-sites";

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
