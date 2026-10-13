import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type ReservationVenue = NonNullable<
  FunctionReturnType<typeof api.reservationPublic.getVenue>
>;
export type ManagedReservation = NonNullable<
  FunctionReturnType<typeof api.reservationPublic.getManaged>
>;
