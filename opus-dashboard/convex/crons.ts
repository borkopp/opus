import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs every minute to pick up pending notifications and process them asynchronously
crons.interval(
  "process-notifications",
  { minutes: 1 },
  internal.notifications.processNotifications,
);

// Runs daily at 8am to queue booking reminders
crons.cron(
  "queue-daily-reminders",
  "0 8 * * *",
  internal.notifications.queueDailyReminders,
);

export default crons;
