import { makeFunctionReference } from "convex/server";
import type {
  PushPreferences,
  PushSettings,
} from "../../../shared/push-notifications";
import type {
  BookingStatus,
  MobileAppointment,
  MobileBookingDraft,
  MobileBootstrap,
  MobileClientDirectory,
  MobileClientProfile,
  MobileSlot,
  MobileOverview,
  MobileManagement,
  ServiceDraft,
  TeamMemberDraft,
} from "../../../shared/mobile";
export type {
  BookingStatus,
  MobileAppointment,
  MobileBookingDraft,
  MobileStudio,
  MobileClient,
} from "../../../shared/mobile";
// JSON-only contracts keep the native build independent of Next.js.
export const backend = {
  pushSettings: makeFunctionReference<
    "query",
    Record<string, never>,
    PushSettings
  >("pushNotifications:getSettings"),
  savePushPreferences: makeFunctionReference<
    "mutation",
    { preferences: PushPreferences },
    void
  >("pushNotifications:savePreferences"),
  registerPushDevice: makeFunctionReference<
    "mutation",
    { deviceId: string; token: string; locale: "en" | "mk" },
    void
  >("pushNotifications:registerMobile"),
  unregisterPushDevice: makeFunctionReference<
    "mutation",
    { deviceId: string },
    void
  >("pushNotifications:unregisterDevice"),
  openPushNotification: makeFunctionReference<
    "mutation",
    { notificationId: string },
    { kind: "appointment" | "ai_inbox"; id: string; date?: string } | null
  >("pushNotifications:openNotification"),
  deletionStatus: makeFunctionReference<
    "query",
    Record<string, never>,
    { requestedAt: number; dueAt: number } | null
  >("accountDeletion:getStatus"),
  requestDeletion: makeFunctionReference<
    "mutation",
    { confirmation: "delete-my-account" },
    { requestedAt: number; dueAt: number } | null
  >("accountDeletion:request"),
  ensureUser: makeFunctionReference<"mutation", Record<string, never>, string>(
    "users:ensureUser",
  ),
  bootstrap: makeFunctionReference<
    "query",
    Record<string, never>,
    MobileBootstrap
  >("mobile:bootstrap"),
  overview: makeFunctionReference<
    "query",
    { refreshMinute: number },
    MobileOverview
  >("mobile:overview"),
  calendar: makeFunctionReference<
    "query",
    { day: number; endDay?: number },
    MobileAppointment[]
  >("mobile:calendar"),
  appointment: makeFunctionReference<
    "query",
    { bookingId: string },
    MobileAppointment | null
  >("mobile:getAppointment"),
  slots: makeFunctionReference<
    "query",
    { staffId: string; serviceId: string; date: string; refreshMinute: number },
    MobileSlot[]
  >("mobile:slots"),
  create: makeFunctionReference<"mutation", MobileBookingDraft, string>(
    "mobile:createAppointment",
  ),
  status: makeFunctionReference<
    "mutation",
    {
      bookingId: string;
      status: Exclude<BookingStatus, "confirmed" | "checked_in">;
    },
    boolean
  >("mobile:changeAppointmentStatus"),
  theme: makeFunctionReference<
    "mutation",
    { theme: "clarity" | "studio" },
    void
  >("users:setDashboardTheme"),
  clients: makeFunctionReference<
    "query",
    {
      search: string;
      segment: "all" | "returning" | "unvisited";
      sort: "recent" | "visits" | "name";
      page: number;
    },
    MobileClientDirectory
  >("clients:getDirectory"),
  management: makeFunctionReference<
    "query",
    Record<string, never>,
    MobileManagement
  >("mobileManagement:list"),
  // The live pre-1.0.2 API still validates currency. It comes from studio
  // settings/existing service data, never from an editable mobile setting.
  saveService: makeFunctionReference<"mutation", ServiceDraft & { currency: string }, string>(
    "mobileManagement:saveService",
  ),
  removeService: makeFunctionReference<"mutation", { serviceId: string }, void>(
    "mobileManagement:removeService",
  ),
  saveTeamMember: makeFunctionReference<"mutation", TeamMemberDraft, string>(
    "mobileManagement:saveTeamMember",
  ),
  removeTeamMember: makeFunctionReference<
    "mutation",
    { staffId: string },
    void
  >("mobileManagement:removeTeamMember"),
  inviteTeamMember: makeFunctionReference<
    "mutation",
    { staffId: string; email: string },
    void
  >("mobileManagement:inviteTeamMember"),
  client: makeFunctionReference<
    "query",
    { customerId: string },
    MobileClientProfile | null
  >("clients:getProfile"),
};
export function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof error.data === "string"
  )
    return error.data;
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof error.data.message === "string"
  )
    return error.data.message;
  return "Could not finish this action. Check your connection and try again.";
}
