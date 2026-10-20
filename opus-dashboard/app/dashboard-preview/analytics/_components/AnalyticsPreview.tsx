"use client";

import { useState } from "react";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardAppearanceProvider } from "@/components/dashboard/DashboardAppearanceProvider";
import {
  ClientsView,
  DEFAULT_CLIENT_FILTERS,
} from "@/components/clients/ClientsView";
import { ClientProfileSheet } from "@/components/clients/ClientProfileSheet";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { buildAnalyticsDemo } from "@/lib/analytics-demo";
import {
  studioMonth,
  validAnalyticsMonths,
  type AnalyticsFilters,
} from "@/lib/analytics-filters";
import { selectClients, type ClientRecord } from "@/convex/lib/clientDirectory";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import s from "@/components/dashboard/clarity.module.css";

const records: ClientRecord[] = [
  "Ana Petrova",
  "Elena Stojanovska",
  "Sara Nikolova",
  "Marija Dimitrova",
  "Ivana Kostova",
].map((name, index) => ({
  id: `sample-${index}`,
  name,
  email: `sample${index + 1}@example.com`,
  phone: null,
  avatarUrl: null,
  createdAt: Date.UTC(2026, 7, 1),
  visits: 12 - index * 2,
  firstVisitAt: Date.UTC(2026, 7, index + 1),
  lastVisitAt: Date.UTC(2026, 9, 17 - index),
  completedValue: [
    { currency: "MKD", amountMinorUnits: (12 - index * 2) * 150000 },
  ],
}));

/** Localhost-only visual harness; the live workspace always queries Convex. */
export function AnalyticsPreview() {
  const { language, setLanguage } = useDashboardI18n();
  const [theme, setTheme] = useState<DashboardTheme>("clarity");
  const [demo, setDemo] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startMonth: studioMonth(),
    endMonth: studioMonth(),
    staffId: "",
    currency: "",
  });
  const [clientFilters, setClientFilters] = useState(DEFAULT_CLIENT_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const data = validAnalyticsMonths(filters.startMonth, filters.endMonth)
    ? buildAnalyticsDemo(filters)
    : undefined;
  if (data && empty) {
    for (const key of Object.keys(
      data.summary,
    ) as (keyof typeof data.summary)[])
      data.summary[key] = 0;
    data.previous.summary = { ...data.summary };
    data.trend = data.trend.map((point) => ({
      ...point,
      appointments: 0,
      completedVisits: 0,
      appointmentValueMinorUnits: 0,
    }));
    data.statuses = data.statuses.map((status) => ({ ...status, count: 0 }));
    data.topServices = [];
  }
  const client = records.find((record) => record.id === selected);
  return (
    <DashboardAppearanceProvider theme={theme}>
      <div
        className={`dashboard-shell ${s.scope}`}
        data-dashboard-theme={theme}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card px-6 py-3 text-xs">
          <span>Local preview · synthetic data</span>
          <div className="flex flex-wrap items-center gap-4">
            <label>
              Theme{" "}
              <select
                aria-label="Preview theme"
                value={theme}
                onChange={(event) =>
                  setTheme(event.target.value as DashboardTheme)
                }
              >
                <option value="clarity">Clarity</option>
                <option value="studio">Studio</option>
              </select>
            </label>
            <label>
              Language{" "}
              <select
                aria-label="Preview language"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as "en" | "mk" | "sq")
                }
              >
                <option value="en">English</option>
                <option value="mk">Македонски</option>
                <option value="sq">Shqip</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={demo}
                onChange={(event) => setDemo(event.target.checked)}
              />
              Free preview
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={empty}
                onChange={(event) => setEmpty(event.target.checked)}
              />
              Empty studio
            </label>
          </div>
        </div>
        <DashboardHeader
          accountMenu={
            <span className="text-sm text-muted-foreground">Demo Owner</span>
          }
          activePath="/beauty/analytics"
          profile={{
            user: { name: "Demo Owner" },
            role: "owner",
            plan: demo ? "free" : "paid",
          }}
        />
        <main className="dashboard-workspace dashboard-page">
          <AnalyticsDashboard
            data={data}
            filters={filters}
            onFiltersChange={setFilters}
            demo={demo}
            onGetReportData={async () => {
              if (demo || !data)
                throw new Error("Demo reports are unavailable.");
              return data;
            }}
            clients={
              <ClientsView
                embedded
                data={selectClients(empty ? [] : records, clientFilters)}
                filters={clientFilters}
                onFiltersChange={setClientFilters}
                onSelect={setSelected}
              />
            }
          />
          <ClientProfileSheet
            open={!demo && !!client}
            profile={
              client
                ? {
                    client,
                    upcoming: [],
                    history: [
                      {
                        id: "sample-visit",
                        startAt: client.lastVisitAt!,
                        endAt: client.lastVisitAt! + 3_600_000,
                        status: "completed",
                        services: ["Gel manicure"],
                        staffName: "Sample specialist",
                        priceMinorUnits: 150000,
                        currency: "MKD",
                      },
                    ],
                    cancelled: 0,
                    noShows: 0,
                    favouriteService: "Gel manicure",
                  }
                : undefined
            }
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
          />
        </main>
      </div>
    </DashboardAppearanceProvider>
  );
}
