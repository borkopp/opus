export type SettingsSection =
  | "studio"
  | "booking"
  | "notifications"
  | "ai"
  | "billing";

/** Keep saved links, onboarding links, and older native clients compatible. */
export function resolveSettingsNavigation(
  tab: string | null,
  isOwner: boolean,
) {
  if (!isOwner || tab === "themes") {
    return {
      section: "studio" as const,
      redirect: "/notifications/preferences",
    };
  }
  if (tab === "gaps") {
    return {
      section: "studio" as const,
      redirect: "/gap-optimizer?settings=open",
    };
  }
  if (
    tab === "booking" ||
    tab === "notifications" ||
    tab === "ai" ||
    tab === "billing"
  ) {
    return { section: tab, redirect: null };
  }
  return { section: "studio" as const, redirect: null };
}
