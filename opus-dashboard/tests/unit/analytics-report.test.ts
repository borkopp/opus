import { describe, expect, test } from "vitest";
import {
  analyticsCsvCell,
  createAnalyticsCsv,
  createAnalyticsHtml,
  createAnalyticsReport,
  type AnalyticsReportOptions,
} from "../../lib/analytics-report";
import type { StudioAnalytics } from "../../lib/studio-analytics";

const options: AnalyticsReportOptions = {
  sections: ["summary", "trend", "services", "clients"],
  includeComparison: true,
  language: "en",
};

function data(): StudioAnalytics {
  const summary: StudioAnalytics["summary"] = {
    totalAppointments: 7,
    completedVisits: 4,
    visitedClients: 3,
    newClients: 2,
    returningClients: 1,
    returningClientPercent: 33,
    appointmentValueMinorUnits: 123456,
    valuedVisits: 4,
    averageAppointmentValueMinorUnits: 30864,
    cancelledAppointments: 2,
    noShowAppointments: 1,
  };
  return {
    studioName: "Studio Luna",
    timezone: "Europe/Skopje",
    generatedAt: Date.UTC(2026, 9, 20, 10, 0),
    currency: "EUR",
    currencies: ["EUR", "MKD"],
    staff: [],
    selectedStaffId: null,
    period: {
      startMonth: "2026-10",
      endMonth: "2026-10",
      startMs: Date.UTC(2026, 9, 1),
      endMs: Date.UTC(2026, 10, 1),
    },
    summary,
    previous: {
      period: {
        startMonth: "2026-09",
        endMonth: "2026-09",
        startMs: Date.UTC(2026, 8, 1),
        endMs: Date.UTC(2026, 9, 1),
      },
      summary: {
        ...summary,
        totalAppointments: 12,
        appointmentValueMinorUnits: 98765,
      },
    },
    trendGranularity: "day",
    trend: [
      {
        key: "2026-10-01",
        startAt: Date.UTC(2026, 9, 1),
        appointments: 7,
        completedVisits: 4,
        appointmentValueMinorUnits: 123456,
      },
    ],
    statuses: [
      { status: "completed", count: 4 },
      { status: "cancelled", count: 2 },
      { status: "no_show", count: 1 },
    ],
    topServices: [
      { id: "service-internal-id", name: "Hair & beauty", completedVisits: 4 },
    ],
    clients: [
      {
        id: "customer-internal-id",
        name: "Ana",
        visits: 2,
        appointmentValueMinorUnits: 45000,
        firstVisitAt: Date.UTC(2026, 9, 1, 0, 15),
        lastVisitAt: Date.UTC(2026, 9, 19, 15, 0),
        returning: true,
      },
    ],
  };
}

describe("analytics CSV security", () => {
  test.each([
    '=HYPERLINK("https://example.test","click")',
    "+SUM(1,2)",
    "-1+2",
    "@SUM(A1:A4)",
    "  =1+1",
    "\t=1+1",
    "\r=1+1",
    "\n=1+1",
    "\u0000=1+1",
  ])("neutralizes untrusted formula input %j", (input) => {
    expect(analyticsCsvCell(input)).toBe(`"'${input.replaceAll('"', '""')}"`);
  });

  test("quotes commas, quotes and embedded lines without corrupting data", () => {
    expect(analyticsCsvCell('Ana, "Luna"\nStudio')).toBe(
      '"Ana, ""Luna""\nStudio"',
    );
    expect(analyticsCsvCell(-42)).toBe('"-42"');
    expect(analyticsCsvCell("Ана")).toBe('"Ана"');
  });

  test("protects formula-like studio, service and client names in exports", () => {
    const source = data();
    source.studioName = "=1+1";
    source.topServices[0].name = "@SUM(1)";
    source.clients[0].name = "+danger";
    const csv = createAnalyticsCsv(source, options);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Studio","\'=1+1"\r\n');
    expect(csv).toContain('"\'@SUM(1)","4"');
    expect(csv).toContain(`"'+danger"`);
    expect(csv).not.toContain("customer-internal-id");
    expect(csv).not.toContain("service-internal-id");
  });
});

describe("analytics report output", () => {
  test("HTML escapes studio, service and client text and has no executable content", () => {
    const source = data();
    source.studioName = '</title><script>alert("studio")</script>';
    source.topServices[0].name = '<img src=x onerror="alert(1)">';
    source.clients[0].name = "Ana <svg/onload=alert(1)> & 'Co'";
    const html = createAnalyticsHtml(source, options);
    expect(html).toContain("&lt;/title&gt;&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain(
      "Ana &lt;svg/onload=alert(1)&gt; &amp; &#39;Co&#39;",
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<svg");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("@media print");
    expect(html).toContain("Save as PDF");
  });

  test("respects section choices and only compares the overview when selected", () => {
    const selected: AnalyticsReportOptions = {
      ...options,
      sections: ["services"],
    };
    const html = createAnalyticsHtml(data(), selected);
    expect(html).toContain('id="services"');
    expect(html).not.toContain('id="summary"');
    expect(html).not.toContain('id="trend"');
    expect(html).not.toContain('id="clients"');
    expect(html).not.toContain("Previous period");
    const csv = createAnalyticsCsv(data(), {
      ...options,
      sections: ["summary"],
      includeComparison: false,
    });
    expect(csv).toContain('"Appointments","7"\r\n');
    expect(csv).not.toContain("Previous period");
    expect(csv).not.toContain("Service breakdown");
    expect(csv).not.toContain('"Ana"');
  });

  test("includes the preceding period and monetary definitions with exact cents", () => {
    const csv = createAnalyticsCsv(data(), options);
    expect(csv).toContain('"Previous period","September 2026"');
    expect(csv).toContain('"Appointments","7","12"');
    expect(csv).toContain(
      '"Completed appointment value","€1,234.56","€987.65"',
    );
    expect(csv).toContain("not collected revenue");
    expect(csv).toContain("Counts include all currencies");
    expect(csv).toContain("Multi-service appointments");
    expect(csv).toContain('"1 Oct 2026"');
    expect(csv).toContain('"Value currency","EUR"');
    expect(csv).toContain('"First studio visit"');
    expect(csv).not.toContain("First visit in period");
  });

  test("localizes report labels and retains studio calendar dates", () => {
    const html = createAnalyticsHtml(data(), { ...options, language: "mk" });
    expect(html).toContain('<html lang="mk">');
    expect(html).toContain("Аналитика на студиото");
    expect(html).toContain("октомври 2026");
    expect(html).toContain("1.234,56");
    const albanian = createAnalyticsCsv(data(), { ...options, language: "sq" });
    expect(albanian).toContain("Analitika e studios");
    expect(albanian).toContain("Klientët");
  });

  test("includes every supplied client and service without a silent display limit", () => {
    const source = data();
    source.clients = Array.from({ length: 151 }, (_, index) => ({
      ...source.clients[0],
      id: `client-id-${index}`,
      name: `Client ${index}`,
    }));
    source.topServices = Array.from({ length: 31 }, (_, index) => ({
      id: `service-id-${index}`,
      name: `Service ${index}`,
      completedVisits: 1,
    }));
    const csv = createAnalyticsCsv(source, options);
    const html = createAnalyticsHtml(source, options);
    expect(csv).toContain('"Client 150"');
    expect(csv).toContain('"Service 30"');
    expect(html).toContain("Client 150</th>");
    expect(html).toContain("Service 30</th>");
    expect(html).not.toContain("client-id-150");
  });

  test("supports empty activity without inventing rows", () => {
    const source = data();
    source.clients = [];
    source.topServices = [];
    source.trend = [];
    const html = createAnalyticsHtml(source, {
      ...options,
      sections: ["clients"],
    });
    expect(html).toContain("No activity in this period.");
    expect(html).not.toContain("Ana");
  });

  test("rejects an empty report and uses safe deterministic download metadata", () => {
    expect(() =>
      createAnalyticsCsv(data(), { ...options, sections: [] }),
    ).toThrow("Choose at least one report section.");
    const csv = createAnalyticsReport(data(), options, "csv");
    expect(csv.fileName).toBe("opus-analytics-2026-10-2026-10.csv");
    expect(csv.mimeType).toBe("text/csv;charset=utf-8");
    const html = createAnalyticsReport(data(), options, "html");
    expect(html.fileName).toBe("opus-analytics-2026-10-2026-10.html");
    expect(html.mimeType).toBe("text/html;charset=utf-8");
    expect(html.content.startsWith("<!doctype html>")).toBe(true);
  });
});
