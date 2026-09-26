import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type PromotionWorkspace = FunctionReturnType<
  typeof api.promotions.getWorkspace
>;
export type PromotionOpening = FunctionReturnType<
  typeof api.promotions.getOpenings
>[number];
export type PromotionTab = "opening" | "kit" | "replies";

export function promotionTab(value: string | null): PromotionTab {
  return value === "opening" || value === "replies" ? value : "kit";
}

export function openingBookingUrl(
  bookingUrl: string,
  serviceId: string,
  opening: PromotionOpening,
) {
  const url = new URL(bookingUrl);
  url.searchParams.set("service", serviceId);
  url.searchParams.set("staff", opening.staffId);
  url.searchParams.set(
    "date",
    new Date(opening.startAt).toISOString().slice(0, 10),
  );
  url.searchParams.set("at", String(opening.startAt));
  return url.toString();
}

export function validPromotionDate(
  value: string | undefined | null,
  today: string,
  maxDate: string,
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < today ||
    value > maxDate
  )
    return today;
  const time = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === value
    ? value
    : today;
}

export function promotionTimestamp(value: string | undefined | null) {
  if (!value || !/^\d{10,13}$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) &&
    !Number.isNaN(new Date(number).getTime())
    ? number
    : undefined;
}
