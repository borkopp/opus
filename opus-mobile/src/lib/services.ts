import type { ManagedService, MobileService } from "../../../shared/mobile";

export function mobileServiceLabel(
  service: Pick<MobileService, "name" | "categoryName">,
) {
  return service.categoryName
    ? `${service.name} · ${service.categoryName}`
    : service.name;
}

export function serviceAvailability(
  service?: Pick<ManagedService, "isActive" | "isOpusVisible">,
) {
  return {
    isActive: service?.isActive ?? true,
    isOpusVisible: service?.isOpusVisible ?? true,
  };
}
