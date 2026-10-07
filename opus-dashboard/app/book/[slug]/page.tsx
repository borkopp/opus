import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/public-site/BookingForm";
import { PublicSiteFrame } from "@/components/public-site/PublicSiteFrame";
import { getSharedBookingSite } from "@/lib/public-site-server";
import { promotionTimestamp } from "@/lib/promotions";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { RecoveryOfferBooking } from "@/components/public-site/RecoveryOfferBooking";
import { PublicBookingI18n } from "@/components/public-site/PublicBookingI18n";
import { resolveWebsiteLocale } from "../../../../shared/website-design";
import { getRequestLocale } from "@/lib/i18n/server";
import { websiteBookingContent } from "@/lib/website-booking-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Book an appointment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AccountBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const original = await getSharedBookingSite(slug);
  if (!original) notFound();
  const locale = original.design
    ? resolveWebsiteLocale(
        original.design,
        typeof query.lang === "string" ? query.lang : await getRequestLocale(),
      )
    : "mk";
  const site = websiteBookingContent(original, locale);
  return (
    <PublicBookingI18n locale={locale}>
      <PublicSiteFrame
        site={site}
        mode="booking"
        studioHref={`${tenantSiteUrl(
          site.slug,
          process.env.ROOT_DOMAIN || "opus.mk",
        )}?lang=${locale}`}
      >
        {typeof query.offer === "string" ? (
          <RecoveryOfferBooking
            site={site}
            token={query.offer}
            accountBooking
          />
        ) : (
          <BookingForm
            site={site}
            accountBooking
            initialServiceId={
              typeof query.service === "string" ? query.service : undefined
            }
            initialStaffId={
              typeof query.staff === "string" ? query.staff : undefined
            }
            initialDate={
              typeof query.date === "string" ? query.date : undefined
            }
            sharedOpeningStartAt={promotionTimestamp(
              typeof query.at === "string" ? query.at : undefined,
            )}
          />
        )}
      </PublicSiteFrame>
    </PublicBookingI18n>
  );
}
