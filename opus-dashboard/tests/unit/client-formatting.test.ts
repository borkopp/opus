import { expect, test } from "vitest";
import { clientDate } from "../../lib/clients";

test("client history preserves studio wall-clock time and uses bundled Macedonian dates", () => {
  const appointment = Date.UTC(2026, 8, 24, 23, 45);
  expect(clientDate(appointment, "mk-MK", true)).toBe("24 септ 2026, 23:45");
  expect(clientDate(appointment, "en-GB", true)).toBe("24 Sep 2026, 23:45");
  expect(clientDate(appointment, "mk-MK")).toBe("24 септ 2026");
  expect(clientDate(null, "en-GB")).toBe("—");
});
