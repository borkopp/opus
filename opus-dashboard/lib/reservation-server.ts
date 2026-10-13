import "server-only";
import { cache } from "react";
import { fetchQuery } from "convex/nextjs";
import { headers } from "next/headers";
import { api } from "@/convex/_generated/api";
import { tenantSlugFromHost } from "@/lib/tenant-sites";
import { clientAreaUrl } from "@/lib/client-account";
import { reservationPath } from "@/lib/reservation-format";

export const getReservationVenue = cache(async (slug: string) =>
  fetchQuery(api.reservationPublic.getVenue, {
    slug: slug.trim().toLowerCase(),
  }),
);

/** The internal tenant renderer is never a public central-host directory. */
export const getTenantReservationVenue = cache(async (slug: string) => {
  const requestHeaders = await headers();
  const requestedSlug = tenantSlugFromHost(
    requestHeaders.get("host"),
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk",
  );
  if (requestedSlug !== slug.trim().toLowerCase()) return null;
  return getReservationVenue(slug);
});

export async function centralReservationUrl(slug: string) {
  const host = (await headers()).get("host") || "localhost:3000";
  const local = new URL(`http://${host}`);
  local.hostname = "localhost";
  return clientAreaUrl(reservationPath(slug), local.origin);
}
