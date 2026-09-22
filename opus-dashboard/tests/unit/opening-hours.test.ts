import { expect, it } from "vitest";
import { applyHoursToOpenDays } from "../../lib/opening-hours";

it("copies hours to open days while preserving closed days and day identities", () => {
  const hours = [
    { dayOfWeek: 0, open: "10:00", close: "17:00", isClosed: false },
    { dayOfWeek: 1, open: "09:00", close: "18:00", isClosed: false },
    { dayOfWeek: 6, open: "09:00", close: "18:00", isClosed: true },
  ];
  const result = applyHoursToOpenDays(hours, hours[0]);
  expect(result[1]).toEqual({ ...hours[1], open: "10:00", close: "17:00" });
  expect(result[2]).toEqual(hours[2]);
  expect(hours[1].open).toBe("09:00");
});
