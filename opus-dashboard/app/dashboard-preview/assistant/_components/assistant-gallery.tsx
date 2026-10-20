"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { ArrowUpRight, FlaskConical, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getExample,
  getExamples,
  type PreviewLanguage,
} from "../_lib/examples";
import {
  selectReportTemplate,
  type ReportTemplate,
} from "@/lib/assistant-report-presentation";
import type { DashboardTheme } from "@/lib/dashboard-theme";

const examples = getExamples("en");
const groups = [
  "Templates",
  "More metrics",
  "Edge cases",
  "Conversation",
] as const;
const templateLabels: Record<ReportTemplate, string> = {
  summary: "Quick number",
  comparison: "Period comparison",
  trend: "Trend",
  ranking: "Ranking",
  share: "Percentage / share",
  empty: "No activity",
  unavailable: "Insufficient data",
};

export function AssistantGallery() {
  const [selected, setSelected] = useState("appointments");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("chat");
  const [frameNavigation, setFrameNavigation] = useState({
    view: "chat",
    revision: 0,
  });
  const [width, setWidth] = useState("full");
  const [theme, setTheme] = useState<DashboardTheme>("clarity");
  const [language, setLanguage] = useState<PreviewLanguage>("en");
  const frame = useRef<HTMLIFrameElement>(null);
  const example = examples.find((item) => item.id === selected)!;
  const localizedExample = getExample(selected, language);
  const templates = Array.from(
    new Set(
      localizedExample.turn.reports.map((report) =>
        selectReportTemplate(report, localizedExample.turn.question),
      ),
    ),
  );
  const visible = examples.filter((item) =>
    `${item.label} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const hasReports = example.turn.reports.length > 0;
  const previewSource = (previewView: string) =>
    `/dashboard-preview/assistant/canvas?${new URLSearchParams({
      example: selected,
      view: hasReports ? previewView : "chat",
      theme,
      language,
    })}`;
  const source = previewSource(view);

  // Internal frame navigation only updates the visible control. Rewriting its
  // src would reload the page and discard the report link's hash and scroll.
  const navigateFrame = (nextView = view) => {
    setFrameNavigation(({ revision }) => ({
      view: nextView,
      revision: revision + 1,
    }));
  };

  useEffect(() => {
    const syncView = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        typeof event.data !== "object" ||
        event.data === null ||
        event.data.type !== "assistant-preview-view" ||
        event.data.example !== selected ||
        !["chat", "report"].includes(event.data.view)
      ) {
        return;
      }
      setView(event.data.view);
    };
    window.addEventListener("message", syncView);
    return () => window.removeEventListener("message", syncView);
  }, [selected]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-5 py-5 lg:px-8">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <FlaskConical className="size-3.5" aria-hidden />
            <span>OPUS / Design previews</span>
            <Badge variant="secondary">Development only</Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Assistant response templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A fitting layout for each question. Explore {examples.length}{" "}
            examples using the real assistant components and fictional data.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={source} target="_blank" rel="noreferrer">
            Open preview <ArrowUpRight data-icon="inline-end" />
          </a>
        </Button>
      </header>

      <div className="grid lg:h-[calc(100dvh-125px)] lg:min-h-[600px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b bg-card lg:border-r lg:border-b-0">
          <div className="relative m-4">
            <Search
              className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Find an example"
              placeholder="Find an example…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <nav
            aria-label="Response examples"
            className="max-h-64 flex-1 overflow-y-auto px-3 pb-4 lg:max-h-none"
          >
            {groups.map((group) => {
              const items = visible.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-5">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    {group}{" "}
                    <span className="ml-1 tabular-nums">{items.length}</span>
                  </p>
                  {items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-current={selected === item.id ? "true" : undefined}
                      onClick={() => {
                        setSelected(item.id);
                        navigateFrame();
                      }}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === item.id ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              );
            })}
            {!visible.length && (
              <p className="p-3 text-sm text-muted-foreground">
                No matching examples.
              </p>
            )}
          </nav>
        </aside>

        <section
          aria-label="Response preview"
          className="flex min-h-0 min-w-0 flex-col"
        >
          <div className="flex flex-wrap items-end gap-3 border-b bg-card px-5 py-4">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              View
              <PreviewSelect
                aria-label="Preview view"
                value={hasReports ? view : "chat"}
                disabled={!hasReports}
                onValueChange={(value) => {
                  setView(value);
                  navigateFrame(value);
                }}
              >
                <SelectItem value="report">Full report</SelectItem>
                <SelectItem value="chat">Chat response</SelectItem>
              </PreviewSelect>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Viewport
              <PreviewSelect
                aria-label="Preview viewport"
                value={width}
                onValueChange={setWidth}
              >
                <SelectItem value="full">Fit to window</SelectItem>
                <SelectItem value="1440">Desktop · 1440px</SelectItem>
                <SelectItem value="768">Tablet · 768px</SelectItem>
                <SelectItem value="390">Phone · 390px</SelectItem>
              </PreviewSelect>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Appearance
              <PreviewSelect
                aria-label="Preview appearance"
                value={theme}
                onValueChange={(value) => {
                  setTheme(value as DashboardTheme);
                  navigateFrame();
                }}
              >
                <SelectItem value="clarity">Clarity</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
              </PreviewSelect>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Language
              <PreviewSelect
                aria-label="Preview language"
                value={language}
                onValueChange={(value) => {
                  setLanguage(value as PreviewLanguage);
                  navigateFrame();
                }}
              >
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="mk">Македонски</SelectItem>
              </PreviewSelect>
            </label>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-4">
            <h2 className="text-sm font-medium">{example.label}</h2>
            <p className="text-xs text-muted-foreground">
              {example.description}
            </p>
            {templates.length > 0 && (
              <p className="w-full text-xs text-muted-foreground">
                Automatically chosen:{" "}
                <span className="font-medium text-foreground">
                  {templates
                    .map((template) => templateLabels[template])
                    .join(" + ")}
                </span>
                {example.turn.answer?.recommendations.length
                  ? " + recommended next step"
                  : ""}
              </p>
            )}
          </div>
          <div className="min-h-[640px] flex-1 overflow-auto bg-muted/50 px-4 pb-4 lg:min-h-0">
            <iframe
              key={frameNavigation.revision}
              ref={frame}
              title={`${example.label} — assistant preview`}
              src={previewSource(frameNavigation.view)}
              className="mx-auto block h-full min-h-[620px] rounded-xl border bg-background lg:min-h-full"
              style={{ width: width === "full" ? "100%" : `${width}px` }}
            />
          </div>
          <details className="border-t bg-card px-5 py-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Where to tweak the design
            </summary>
            <p className="mt-3 leading-relaxed">
              Edit <code>components/business-assistant/ReportVisual.tsx</code>{" "}
              for the template visuals and{" "}
              <code>components/business-assistant/AnalysisReport.tsx</code> for
              the report frame and details.
            </p>
            <p className="mt-2 leading-relaxed">
              Edit{" "}
              <code>components/business-assistant/AssistantResponse.tsx</code>{" "}
              for answers, recommendations, and supporting-report disclosures.
              These components are shared with the live assistant and refresh
              here as you edit.
            </p>
            <p className="mt-2 leading-relaxed">
              Sample content lives in{" "}
              <code>app/dashboard-preview/assistant/_lib/examples.ts</code>.
              Phone and tablet previews use a real iframe viewport, including
              responsive breakpoints.
            </p>
            <p className="mt-2 leading-relaxed">
              Automatic layout selection lives in{" "}
              <code>lib/assistant-report-presentation.ts</code>. It uses the
              question, grouping, comparison, and available values; these
              samples do not force a template.
            </p>
          </details>
        </section>
      </div>
    </main>
  );
}

function PreviewSelect({
  children,
  "aria-label": label,
  ...props
}: ComponentProps<typeof Select> & { "aria-label": string }) {
  return (
    <Select {...props}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
