// JSON-only contracts shared by the native client and the existing Convex backend.
export type BookingStatus =
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";
export type MobileService = {
  id: string;
  name: string;
  durationMins: number;
  priceMinorUnits: number;
  currency: string;
  staffIds: string[];
};
export type MobileStudio = {
  available: true;
  orgId: string;
  name: string;
  timezone: string;
  today: number;
  now: number;
  plan: "free" | "paid";
  profile: {
    name: string;
    email: string;
    role: "owner" | "manager" | "staff";
    bookingAccess?: "own" | "team";
    theme: "clarity" | "studio";
  };
  services: MobileService[];
  team: { id: string; name: string; role: "owner" | "manager" | "staff" }[];
};
export type MobileBootstrap =
  | MobileStudio
  | { available: false; message: string };
export type MobileAppointment = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  staffId: string;
  staffName: string;
  serviceIds: string[];
  serviceName: string;
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
  currency: string;
  status: BookingStatus;
  note: string | null;
};
export type MobileSlot = {
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
};
export type MobileBookingDraft = {
  staffId: string;
  serviceId: string;
  startAt: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
};
export type MobileClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  visits: number;
  lastVisitAt: number | null;
  completedValue: { currency: string; amountMinorUnits: number }[];
};
export type MobileClientDirectory = {
  clients: MobileClient[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    clients: number;
    completedVisits: number;
    returningClients: number;
  };
};
export type MobileClientProfile = {
  client: MobileClient;
  upcoming: ClientAppointment[];
  history: ClientAppointment[];
  cancelled: number;
  noShows: number;
  favouriteService: string | null;
};
export type ClientAppointment = {
  id: string;
  startAt: number;
  endAt: number;
  status: BookingStatus;
  services: string[];
  staffName: string;
  priceMinorUnits: number;
  currency: string;
};

export type MobileOverview = {
  today: number;
  count: number;
  completedCount: number;
  completedValue: { currency: string; amountMinorUnits: number }[];
  next: MobileAppointment | null;
  appointments: MobileAppointment[];
};

export type TeamRole = "owner" | "manager" | "staff";
export type WeeklyHours = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  breaks: { startTime: string; endTime: string }[];
};
export type TeamCapacity = {
  isFree: boolean;
  staffCount: number;
  ownerCount: number;
  totalCount: number;
  staffLimit: number;
  ownerLimit: number;
  totalLimit: number;
  canUseStaffRole: boolean;
  canUseOwnerRole: boolean;
};
export type ManagedService = MobileService & {
  description: string;
  isActive: boolean;
  isOpusVisible: boolean;
};
export type ManagedTeamMember = {
  id: string;
  name: string;
  role: TeamRole;
  bio: string;
  specialties: string[];
  isActive: boolean;
  hasAccess: boolean;
  pendingInviteEmail: string | null;
  canEdit: boolean;
  canRemove: boolean;
  canChangeRole: boolean;
  canSetInactive: boolean;
  capacity: TeamCapacity;
  hours: WeeklyHours[];
};
export type MobileManagement = {
  canManage: boolean;
  callerId: string;
  currency: string;
  slotDurationMins: number;
  capacity: TeamCapacity;
  defaultHours: WeeklyHours[];
  services: ManagedService[];
  team: ManagedTeamMember[];
};
export type ServiceDraft = {
  serviceId?: string;
  name: string;
  description: string;
  durationMins: number;
  priceMinorUnits: number;
  staffIds: string[];
  isActive: boolean;
  isOpusVisible: boolean;
};
export type TeamMemberDraft = {
  staffId?: string;
  signInEmail?: string;
  displayName: string;
  role: TeamRole;
  bio: string;
  specialties: string[];
  isActive: boolean;
  serviceIds: string[];
  hours: WeeklyHours[];
};
