"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Search } from "lucide-react";
import { DashboardI18nProvider } from "@/components/dashboard-i18n-provider";
import { AnalysisReport } from "@/components/business-assistant/AnalysisReport";
import type { AssistantTurn } from "@/components/business-assistant/ConversationPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  initialChats,
  sampleTurn,
  type DesignVariant,
  type SampleChat,
} from "../_lib/design-data";
import { ChatDesign, BriefDesign, DeskDesign } from "./design-variants";
import { HistoryList } from "./design-parts";
import s from "../designs.module.css";
import dashboard from "@/components/dashboard/clarity.module.css";

type DesignContextValue = {
  variant: DesignVariant;
  chats: SampleChat[];
  selected: SampleChat | undefined;
  question: string;
  setQuestion: (question: string) => void;
  deep: boolean;
  setDeep: (deep: boolean) => void;
  busy: boolean;
  send: (question?: string) => void;
  newChat: () => void;
  selectChat: (id: string) => void;
  openHistory: () => void;
  openReport: (turn: AssistantTurn) => void;
  notice: string;
  copy: (text: string) => void;
};
const DesignContext = createContext<DesignContextValue | null>(null);
export function useDesign() {
  const value = useContext(DesignContext);
  if (!value) throw new Error("Design parts require DesignWorkspace");
  return value;
}

export function DesignWorkspace({
  variant,
  conversation,
}: {
  variant: DesignVariant;
  conversation: boolean;
}) {
  return (
    <DashboardI18nProvider locale="en">
      <Workspace variant={variant} conversation={conversation} />
    </DashboardI18nProvider>
  );
}

function Workspace({
  variant,
  conversation,
}: {
  variant: DesignVariant;
  conversation: boolean;
}) {
  const [chats, setChats] = useState(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>(
    conversation ? "month" : null,
  );
  const [question, setQuestion] = useState("");
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<AssistantTurn | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = chats.find((item) => item.id === selectedId);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function cancelPending() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
  }
  function selectChat(id: string) {
    cancelPending();
    setSelectedId(id);
    setQuestion("");
    setHistoryOpen(false);
    setNotice("");
  }
  function newChat() {
    cancelPending();
    setSelectedId(null);
    setQuestion("");
    setHistoryOpen(false);
    setNotice("");
  }
  function send(value = question) {
    const text = value.trim();
    if (!text || busy) return;
    const id = selectedId ?? `chat-${crypto.randomUUID()}`;
    const turn = {
      ...sampleTurn(text),
      depth: deep ? ("deep" as const) : ("standard" as const),
    };
    if (!selectedId) {
      setChats((current) => [
        {
          id,
          title: text,
          category: "New conversation",
          date: "Today",
          exampleId: "",
          turns: [],
        },
        ...current,
      ]);
      setSelectedId(id);
    }
    setQuestion("");
    setBusy(true);
    setNotice("");
    // Simulated response delay, with no provider or database calls.
    timer.current = setTimeout(() => {
      setChats((current) =>
        current.map((chat) =>
          chat.id === id ? { ...chat, turns: [...chat.turns, turn] } : chat,
        ),
      );
      setBusy(false);
      timer.current = null;
    }, 500);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Answer copied.");
    } catch {
      setNotice(
        "Copy unavailable in this browser. You can select the answer text.",
      );
    }
  }
  const value: DesignContextValue = {
    variant,
    chats,
    selected,
    question,
    setQuestion,
    deep,
    setDeep,
    busy,
    send,
    newChat,
    selectChat,
    openHistory: () => {
      setSearch("");
      setHistoryOpen(true);
    },
    openReport: setReport,
    notice,
    copy,
  };
  return (
    <DesignContext.Provider value={value}>
      <div
        className={
          variant === "chat"
            ? `dashboard-shell ${dashboard.scope} ${s.opusSurface}`
            : s.surface
        }
        data-dashboard-theme={variant === "chat" ? "clarity" : undefined}
        data-design={variant}
        lang="en"
      >
        {variant === "chat" ? (
          <ChatDesign />
        ) : variant === "brief" ? (
          <BriefDesign />
        ) : (
          <DeskDesign />
        )}
      </div>
      <PreviewDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Your conversations"
        description="Pick up where you left off. All conversations here use sample data."
      >
        <label className={s.historySearch}>
          <Search size={16} />
          <input
            autoComplete="off"
            placeholder="Search conversations…"
            aria-label="Search conversations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <HistoryList search={search} />
      </PreviewDialog>
      <PreviewDialog
        open={Boolean(report)}
        onOpenChange={(open) => {
          if (!open) setReport(null);
        }}
        title="Behind the answer"
        description="The fictional September snapshot used for this response. Expand Data & calculation for the details."
      >
        {report?.reports.map((item) => (
          <AnalysisReport
            key={item.key}
            report={item}
            question={report.question}
            expanded
          />
        ))}
      </PreviewDialog>
    </DesignContext.Provider>
  );
}

function PreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { variant } = useDesign();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${variant === "chat" ? s.opusSurface : s.surface} ${s.previewDialog}`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
