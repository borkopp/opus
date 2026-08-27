import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type BookingView = FunctionReturnType<typeof api.bookings.listBookingsByOrg>[number];
export type StaffView = FunctionReturnType<typeof api.staff.listStaffMembers>[number];
