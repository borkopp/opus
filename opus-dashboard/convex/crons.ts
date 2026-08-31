import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs every minute to pick up pending notifications and process them asynchronously
crons.interval(
  "process-notifications",
  { minutes: 1 },
  internal.notifications.processNotifications,
);

// Hourly reconciliation is a recovery path for existing bookings after an
// owner changes reminder settings. New bookings schedule their reminders
// immediately at the exact configured offsets.
crons.interval(
  "reconcile-booking-reminders",
  { hours: 1 },
  internal.notifications.reconcileAllBookingReminders,
);

// Runs daily at 03:00 Europe/Skopje (01:00 UTC) to refresh per-org
// reputation snippets. Skips orgs where reviews haven't changed
// (sourceHash dedup in embedEntity keeps OpenAI calls cheap).
crons.cron(
  "refresh-marketplace-reputations",
  "0 1 * * *",
  internal.marketplace.embeddings.refreshAllReputations,
);

export default crons;
