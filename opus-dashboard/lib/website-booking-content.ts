import type { PublicSite } from "@/components/public-site/types";
import type { Locale } from "../../shared/i18n/locale";
import { translatedWebsiteText } from "../../shared/website-design";

/** Display-only copy; booking IDs, availability, prices and staff eligibility stay canonical. */
export function websiteBookingContent(
  site: PublicSite,
  locale: Locale,
): PublicSite {
  const design = site.design;
  if (!design) return site;
  return {
    ...site,
    bookingSettings: { ...site.bookingSettings, locale },
    services: site.services.map((service) => {
      const copy = design.serviceCopy.find(
        (item) => item.serviceId === service._id,
      );
      return {
        ...service,
        name: translatedWebsiteText(
          design,
          locale,
          `service.${service._id}.name`,
          copy?.name || service.name,
        ),
        consumerDescription: translatedWebsiteText(
          design,
          locale,
          `service.${service._id}.description`,
          copy?.description || service.consumerDescription || "",
        ),
        categoryName: translatedWebsiteText(
          design,
          locale,
          `service.${service._id}.category`,
          service.categoryName || "",
        ),
      };
    }),
    staff: site.staff.map((member) => {
      const source = member.specialties.join(" · ");
      const translated = translatedWebsiteText(
        design,
        locale,
        `staff.${member._id}.specialties`,
        source,
      );
      return {
        ...member,
        specialties: translated === source ? member.specialties : [translated],
      };
    }),
  };
}
