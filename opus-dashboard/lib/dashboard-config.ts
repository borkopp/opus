// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Config — Defines what each industry vertical's dashboard looks like
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetId =
    | "live-schedule"
    | "revenue-trends"
    | "staff-capacity"
    | "ai-performance"
    | "insights-today"
    // Hospitality widgets — will be added when that vertical is built
    | "floor-plan-live"
    | "covers-today"
    | "reservation-timeline"
    | "table-turnover";

export type DashboardConfig = {
    industry: string;
    primaryEntity: "booking" | "reservation";
    calendarView: "appointment" | "floor-plan";
    widgets: WidgetId[];
};

// ── Beauty & Wellness ───────────────────────────────────────────────────────
export const beautyDashboardConfig: DashboardConfig = {
    industry: "beauty_wellness",
    primaryEntity: "booking",
    calendarView: "appointment",
    widgets: [
        "live-schedule",
        "revenue-trends",
        "staff-capacity",
        "ai-performance",
        "insights-today",
    ],
};

// ── Hospitality ──────────────────────────────────────────────────────────
export const hospitalityDashboardConfig: DashboardConfig = {
    industry: "hospitality",
    primaryEntity: "reservation",
    calendarView: "floor-plan",
    widgets: [
        "floor-plan-live",
        "covers-today",
        "reservation-timeline",
        "table-turnover",
        "ai-performance",
    ],
};
