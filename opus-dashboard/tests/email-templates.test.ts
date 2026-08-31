import { describe, expect, test } from "vitest";
import {
  renderClientConfirmationEmail,
  renderStaffNewBookingEmail,
} from "../convex/lib/emailTemplates";
import { wallClockTimestampToInstant } from "../convex/lib/bookingTime";

describe("transactional email templates", () => {
  const appointment = {
    studioName: "Atelier & Co",
    customerName: "<script>alert('x')</script>",
    customerEmail: "client@example.com",
    customerPhone: "+38970123456",
    serviceName: "Signature <Glow>",
    staffName: "Elena & Ana",
    startAt: Date.UTC(2026, 6, 1, 10, 0),
    endAt: Date.UTC(2026, 6, 1, 10, 45),
    generatedAt: Date.UTC(2026, 0, 1, 0, 0),
    priceMinorUnits: 1_800,
    currency: "MKD",
    locale: "en-GB",
    timezone: "Europe/Skopje",
    address: "Macedonia Street 12",
    city: "Skopje",
    latitude: 41.9981,
    longitude: 21.4254,
    studioPhone: "+389 70 111 222",
    dashboardUrl: "https://studio.opus.mk/beauty/bookings?booking=test",
  };

  test("renders a safe premium client email with calendar, directions, and call actions", () => {
    const email = renderClientConfirmationEmail(appointment);

    expect(email.subject).toBe("Appointment confirmed · Atelier & Co");
    expect(email.html).toContain("OPUS");
    expect(email.html).toContain("#6d4aff");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("calendar.google.com/calendar/render");
    expect(email.html).toContain("google.com/maps/dir/");
    expect(email.html).toContain("tel:+38970111222");
    expect(email.attachments).toHaveLength(1);

    const calendar = Buffer.from(
      email.attachments?.[0].content ?? "",
      "base64",
    ).toString("utf8");
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("DTSTAMP:20260101T000000Z");
    expect(calendar).toContain("DTSTART:20260701T080000Z");
    expect(calendar).toContain("DTEND:20260701T084500Z");
    expect(calendar).toContain("LOCATION:Macedonia Street 12\\, Skopje");
  });

  test("keeps the staff message in the same visual system and escapes client data", () => {
    const email = renderStaffNewBookingEmail(appointment);

    expect(email.subject).toContain("Atelier & Co");
    expect(email.html).toContain("#6d4aff");
    expect(email.html).toContain("Open appointment");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>alert");
    expect(email.text).toContain("client@example.com");
  });

  test("converts stored wall-clock booking times across Skopje DST", () => {
    expect(
      wallClockTimestampToInstant(
        Date.UTC(2026, 0, 15, 10, 0),
        "Europe/Skopje",
      ),
    ).toBe(Date.UTC(2026, 0, 15, 9, 0));
    expect(
      wallClockTimestampToInstant(
        Date.UTC(2026, 6, 15, 10, 0),
        "Europe/Skopje",
      ),
    ).toBe(Date.UTC(2026, 6, 15, 8, 0));
  });
});
