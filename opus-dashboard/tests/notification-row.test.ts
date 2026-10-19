import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import {
  NotificationRow,
  type DashboardNotification,
} from "@/components/notifications/NotificationRow";
import type { Id } from "@/convex/_generated/dataModel";

const state = vi.hoisted(() => ({
  navigate: undefined as
    | ((event: { preventDefault: () => void }) => void)
    | undefined,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onNavigate,
  }: {
    children: ReactNode;
    href: string;
    onNavigate: typeof state.navigate;
  }) => {
    state.navigate = onNavigate;
    return createElement("a", { href }, children);
  },
}));
vi.mock("@/components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({
    language: "en",
    locale: "en-GB",
    t: (english: string) => english,
  }),
}));

test.each([false, true])(
  "a notification link navigates immediately while read tracking is unresolved (pending: %s)",
  (pending) => {
    const notification: DashboardNotification = {
      _id: "notification" as Id<"dashboard_notifications">,
      _creationTime: 1,
      orgId: "org" as Id<"orgs">,
      type: "new_booking",
      title: "New Booking",
      body: "An appointment was added.",
      isRead: false,
      isDismissed: false,
      createdAt: 1,
      href: "/beauty/bookings?booking=booking-a&date=2026-10-22",
      bookingDate: "2026-10-22",
    };
    const onRead = vi.fn(() => new Promise<boolean>(() => {}));
    const onOpened = vi.fn();
    const html = renderToStaticMarkup(
      createElement(NotificationRow, {
        notification,
        pending,
        onRead,
        onOpened,
        onDismiss: vi.fn(async () => true),
      }),
    );
    const preventDefault = vi.fn();
    state.navigate?.({ preventDefault });
    expect(html).toContain(
      'href="/beauty/bookings?booking=booking-a&amp;date=2026-10-22"',
    );
    expect(onRead).toHaveBeenCalledWith(notification, true);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onOpened).toHaveBeenCalledOnce();
  },
);
