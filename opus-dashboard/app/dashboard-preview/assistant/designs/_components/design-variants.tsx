"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  FileText,
  History,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { AssistantChatWorkspace } from "@/components/business-assistant/AssistantChatWorkspace";
import { ConversationPanel } from "@/components/business-assistant/ConversationPanel";
import { AnalysisReport } from "@/components/business-assistant/AnalysisReport";
import { previewAssistantReport } from "@/lib/assistant-report-presentation";
import {
  Brand,
  CloseButton,
  Composer,
  ComposerFootnote,
  HistoryList,
  IconButton,
  NewChatButton,
  Profile,
  PromptList,
  Thread,
} from "./design-parts";
import { useDesign } from "./design-workspace";
import s from "../designs.module.css";

export function ChatDesign() {
  const {
    selected,
    chats,
    newChat,
    selectChat,
    setQuestion,
    busy,
    openReport,
  } = useDesign();
  return (
    <AssistantChatWorkspace
      conversations={chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        updatedAt: Date.UTC(2026, 9, 20),
      }))}
      selectedId={selected?.id}
      onSelect={selectChat}
      onNew={newChat}
      navigationDisabled={busy}
      paid
      usage={{ remaining: 42, limit: 50, resetAt: Date.UTC(2026, 10, 1) }}
      account={<Profile />}
      isEmpty={!selected}
      onPrompt={setQuestion}
      promptDisabled={busy}
      composer={<Composer />}
      backHref="/dashboard-preview/implementation"
      preview
    >
      <ConversationPanel
        key={selected?.id ?? "new"}
        turns={(selected?.turns ?? []).map((turn) => ({
          ...turn,
          reports: turn.reports.map((report) =>
            previewAssistantReport(report, turn.question),
          ),
        }))}
        loading={busy && !selected?.turns.length}
        disabled={busy}
        onPrompt={setQuestion}
        onOpenReport={(turn) =>
          openReport(
            selected?.turns.find((item) => item._id === turn._id) ?? turn,
          )
        }
      />
    </AssistantChatWorkspace>
  );
}

export function BriefDesign() {
  const { chats, selected, selectChat, newChat, openHistory } = useDesign();
  return (
    <div className={s.briefLayout}>
      <header className={s.briefNav}>
        <Brand />
        <div className={s.briefBreadcrumb}>
          <span>Atelier Luna</span>
          <span>/</span>
          <strong>Assistant</strong>
        </div>
        <div className={s.briefNavActions}>
          <button type="button" onClick={openHistory}>
            <History size={16} />
            <span>Conversations</span>
          </button>
          <span className={s.avatar}>AL</span>
        </div>
      </header>
      {selected ? (
        <div className={s.briefActive}>
          <div className={s.briefActiveHeading}>
            <div>
              <p className={s.eyebrow}>A CONVERSATION WITH YOUR STUDIO</p>
              <h1>{selected.title}</h1>
            </div>
            <CloseButton onClick={newChat} />
          </div>
          <div className={s.briefConversationGrid}>
            <div className={s.briefPaper}>
              <Thread key={selected.id} />
              <div className={s.briefComposerDock}>
                <Composer />
                <ComposerFootnote />
              </div>
            </div>
            <aside className={s.briefHistoryAside}>
              <p className={s.eyebrow}>YOUR NOTEBOOK</p>
              <NewChatButton />
              <HistoryList />
              <div className={s.briefNote}>
                <Sparkles size={20} />
                <p>Good questions make room for better decisions.</p>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <main className={s.briefHome}>
          <div className={s.briefDateline}>
            <span>THE STUDIO NOTEBOOK</span>
            <span>Tuesday, 20 October</span>
          </div>
          <section className={s.briefHero}>
            <div className={s.briefWriting}>
              <h1>
                A fresh perspective
                <br />
                on <em>your studio.</em>
              </h1>
              <p>
                Make sense of the month. Find a pattern. Follow a thought.
                <br className={s.mobileHidden} /> Your next good question starts
                here.
              </p>
              <Composer large />
              <ComposerFootnote />
            </div>
            <aside className={s.briefPrompts}>
              <div className={s.briefIllustration} aria-hidden>
                <div />
                <div />
                <div />
                <Sparkles size={30} strokeWidth={1} />
              </div>
              <p className={s.eyebrow}>A LITTLE INSPIRATION</p>
              <PromptList detailed />
              <span className={s.briefPromptNote}>
                One question can reveal a lot.
              </span>
            </aside>
          </section>
          <section className={s.notebook} aria-label="Previous conversations">
            <header>
              <div>
                <span className={s.eyebrow}>CONTINUE THE CONVERSATION</span>
                <h2>Pick up a thought.</h2>
              </div>
              <button type="button" onClick={openHistory}>
                View all <ArrowRight size={16} />
              </button>
            </header>
            <div className={s.notebookCards}>
              {chats.slice(0, 3).map((chat, index) => (
                <button
                  type="button"
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={s.notebookCard}
                >
                  <div>
                    <span>{chat.category}</span>
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{chat.title}</h3>
                  <p>{chat.turns[0]?.answer?.text}</p>
                  <footer>
                    <span>{chat.date}</span>
                    <ArrowUpRight size={18} />
                  </footer>
                </button>
              ))}
            </div>
          </section>
          <footer className={s.briefFooter}>
            <span>
              <Sparkles size={14} />
              Thoughtful answers, grounded in your appointments.
            </span>
            <span>
              42 of 50 answers available <span>·</span> Pro
            </span>
          </footer>
        </main>
      )}
    </div>
  );
}

export function DeskDesign() {
  const { chats, selected, selectChat, newChat, openHistory, openReport } =
    useDesign();
  const [mobilePane, setMobilePane] = useState<"chat" | "report">("chat");
  const latest = selected?.turns.at(-1);
  return (
    <div className={s.deskLayout}>
      <aside className={s.deskRail} aria-label="Workspace tools">
        <Brand compact />
        <div>
          <IconButton label="New conversation" onClick={newChat}>
            <Plus size={21} />
          </IconButton>
          <IconButton label="Search conversations" onClick={openHistory}>
            <Search size={20} />
          </IconButton>
          <span className={s.railActive} title="Assistant">
            <Sparkles size={21} />
          </span>
        </div>
        <span className={s.railAvatar}>AL</span>
      </aside>
      <div className={s.deskMain}>
        <header className={s.deskHeader}>
          <div>
            <span className={s.deskName}>
              Assistant <span>workspace</span>
            </span>
            <span className={s.deskStudio}>Atelier Luna</span>
          </div>
          <button
            type="button"
            aria-label="All conversations"
            onClick={openHistory}
          >
            <History size={15} />
            <span>All conversations</span>
          </button>
        </header>
        <nav className={s.conversationTabs} aria-label="Open conversations">
          {chats.slice(0, 3).map((chat) => (
            <button
              type="button"
              key={chat.id}
              aria-current={selected?.id === chat.id ? "page" : undefined}
              onClick={() => {
                selectChat(chat.id);
                setMobilePane("chat");
              }}
            >
              <MessageSquare size={14} />
              <span>{chat.title}</span>
            </button>
          ))}
          <IconButton label="Start a new conversation" onClick={newChat}>
            <Plus size={18} />
          </IconButton>
        </nav>
        <div
          className={s.mobilePaneTabs}
          role="group"
          aria-label="Workspace pane"
        >
          <button
            type="button"
            aria-pressed={mobilePane === "chat"}
            onClick={() => setMobilePane("chat")}
          >
            <MessageSquare size={15} />
            Conversation
          </button>
          <button
            type="button"
            aria-pressed={mobilePane === "report"}
            onClick={() => setMobilePane("report")}
          >
            <ChartNoAxesCombined size={15} />
            Report
            {latest?.reports.length ? (
              <span>{latest.reports.length}</span>
            ) : null}
          </button>
        </div>
        <main className={s.deskSplit} data-mobile-pane={mobilePane}>
          <section className={s.deskChat} aria-label="Conversation">
            <div className={s.deskPaneHeading}>
              <span>
                <span className={s.statusDot} />
                LET’S LOOK CLOSER
              </span>
              <span className={s.proBadge}>PRO</span>
            </div>
            <div className={s.deskChatScroll}>
              {selected ? (
                <Thread key={selected.id} detachedReports />
              ) : (
                <div className={s.deskWelcome}>
                  <span className={s.deskWelcomeIcon}>
                    <Sparkles size={25} />
                  </span>
                  <h1>
                    Find your
                    <br />
                    next insight.
                  </h1>
                  <p>
                    Ask a question here. Explore the numbers in the space beside
                    you.
                  </p>
                  <PromptList detailed />
                </div>
              )}
            </div>
            <div className={s.deskComposerDock}>
              <Composer />
              <ComposerFootnote />
            </div>
          </section>
          <section className={s.deskReports} aria-label="Report workspace">
            <div className={s.deskReportTop}>
              <span>
                <FileText size={15} />
                {latest?.reports.length ? "Supporting reports" : "Your canvas"}
              </span>
              <span>SEPTEMBER 2026 · SAMPLE</span>
            </div>
            {latest?.reports.length ? (
              <div className={s.deskReportContent}>
                <div className={s.reportTitle}>
                  <p className={s.eyebrow}>THE NUMBERS BEHIND THE ANSWER</p>
                  <h2>{selected?.title}</h2>
                  <p>A closer look at the patterns in your studio.</p>
                </div>
                {latest.reports.map((report) => (
                  <div key={report.key} className={s.deskReportCard}>
                    <AnalysisReport
                      report={previewAssistantReport(report, latest.question)}
                      question={latest.question}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className={s.reportSource}
                  onClick={() => openReport(latest)}
                >
                  <span>
                    <FileText size={16} />
                    Inspect the full report
                  </span>
                  <ArrowUpRight size={16} />
                </button>
                <p className={s.reportSnapshot}>
                  Saved sample snapshot · 1 October 2026
                  <br />
                  Appointment value represents recorded activity, not payments.
                </p>
              </div>
            ) : (
              <div className={s.canvasEmpty}>
                <div className={s.emptySheets} aria-hidden>
                  <div />
                  <div>
                    <ChartNoAxesCombined size={40} strokeWidth={1} />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <h2>Room for a closer look.</h2>
                <p>
                  {selected
                    ? "This response has no supporting report. Try a question about appointments or services."
                    : "Your reports appear here as you explore. Start with a question, and we’ll put the details in view."}
                </p>
                <button type="button" onClick={() => selectChat("month")}>
                  Explore a sample report <ArrowUpRight size={16} />
                </button>
              </div>
            )}
          </section>
        </main>
        <footer className={s.deskFooter}>
          <span>
            <span className={s.statusDot} />
            Sample studio workspace
          </span>
          <span>
            42 answers available <span>·</span> Resets 1 Nov{" "}
            <ArrowDown size={11} />
          </span>
        </footer>
      </div>
    </div>
  );
}
