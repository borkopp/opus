export function getGoogleCalendarUrl({
  title,
  description,
  location,
  startAt,
  endAt,
}: {
  title: string;
  description: string;
  location: string;
  startAt: number;
  endAt: number;
}): string {
  const formatGCalDate = (ts: number) =>
    new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = formatGCalDate(startAt);
  const end = formatGCalDate(endAt);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location,
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile({
  title,
  description,
  location,
  startAt,
  endAt,
  filename = "opus-termin.ics",
}: {
  title: string;
  description: string;
  location: string;
  startAt: number;
  endAt: number;
  filename?: string;
}): void {
  const formatIcsDate = (ts: number) =>
    new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OPUS//Booking//MK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${startAt}-${Date.now()}@opus.mk`,
    `DTSTAMP:${formatIcsDate(Date.now())}`,
    `DTSTART:${formatIcsDate(startAt)}`,
    `DTEND:${formatIcsDate(endAt)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
