// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Config — Defines what each industry vertical's dashboard looks like
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetId =
    | "live-schedule"
    | "revenue-trends"
    | "staff-capacity"
    | "ai-performance"
    | "insights-today"
    ;

export type DashboardConfig = {
    industry: string;
    primaryEntity: "booking";
    calendarView: "appointment";
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
