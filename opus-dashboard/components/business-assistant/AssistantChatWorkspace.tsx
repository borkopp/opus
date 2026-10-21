"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useAssistantPrompts } from "@/hooks/use-assistant-prompts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import s from "./assistant-chat.module.css";

export type AssistantHistoryItem = {
  id: string;
  title: string;
  updatedAt: number;
};
export type AssistantUsage = {
  remaining: number;
  limit: number;
  resetAt: number;
};

export function AssistantChatWorkspace({
  conversations,
  selectedId,
  onSelect,
  onNew,
  navigationDisabled = false,
  paid,
  usage,
  account,
  isEmpty,
  children,
  composer,
  onPrompt,
  promptDisabled = false,
  notices,
  backHref = "/beauty",
  preview = false,
}: {
  conversations: AssistantHistoryItem[] | undefined;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  navigationDisabled?: boolean;
  paid: boolean;
  usage?: AssistantUsage;
  account?: ReactNode;
  isEmpty: boolean;
  children: ReactNode;
  composer: ReactNode;
  onPrompt: (question: string) => void;
  promptDisabled?: boolean;
  notices?: ReactNode;
  backHref?: string;
  preview?: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const composerRef = useRef<HTMLDivElement>(null);
  const sidebarId = useId();
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const restoreSidebarFocus = useRef(false);
  useEffect(() => {
    if (!restoreSidebarFocus.current) return;
    const target = collapsed ? expandButtonRef : collapseButtonRef;
    target.current?.focus({ preventScroll: true });
    restoreSidebarFocus.current = false;
  }, [collapsed]);
  function toggleSidebar(next: boolean) {
    restoreSidebarFocus.current = true;
    setCollapsed(next);
  }
  const prompts = useAssistantPrompts();
  const title = t("AI Assistant", "AI асистент", "Asistenti AI");
  const historyLabel = t(
    "Conversation history",
    "Историја на разговори",
    "Historia e bisedave",
  );
  function openHistory() {
    setSearch("");
    setHistoryOpen(true);
  }
  function select(id: string) {
    onSelect(id);
    setHistoryOpen(false);
  }
  function startNew() {
    onNew();
    setHistoryOpen(false);
  }
  function choosePrompt(question: string) {
    onPrompt(question);
    composerRef.current?.querySelector("textarea")?.focus();
  }
  const history = (filter = "") => (
    <AssistantHistoryList
      conversations={conversations}
      selectedId={selectedId}
      onSelect={select}
      search={filter}
      disabled={navigationDisabled}
    />
  );
  const newChat = (
    <Button
      data-replay-public
      onClick={startNew}
      disabled={navigationDisabled}
      className={s.newChat}
    >
      <Plus size={17} />
      {t("New chat", "Нов разговор", "Bisedë e re")}
    </Button>
  );
  const composerContent = (
    <>
      <div ref={composerRef}>{composer}</div>
      <p className={s.footnote}>
        {preview
          ? t(
              "Sample data · Answers stay in this preview",
              "Примерни податоци · Одговорите остануваат во прегледот",
              "Të dhëna shembull · Përgjigjet mbeten në këtë pamje",
            )
          : paid
            ? t(
                "Answers are based on your recorded appointments.",
                "Одговорите се засноваат на евидентираните термини.",
                "Përgjigjet bazohen në terminet tuaja të regjistruara.",
              )
            : t(
                "Studio insights are available with OPUS Pro.",
                "Деловните анализи се достапни со OPUS Pro.",
                "Analizat e studios janë të disponueshme me OPUS Pro.",
              )}
      </p>
    </>
  );

  return (
    <section
      className={s.workspace}
      data-collapsed={collapsed}
      aria-label={title}
    >
      <aside
        id={sidebarId}
        className={s.sidebar}
        aria-label={historyLabel}
        aria-hidden={collapsed}
        inert={collapsed}
      >
        <div className={s.brandRow}>
          <Link
            href={backHref}
            aria-label={t(
              "Back to dashboard",
              "Назад кон контролната табла",
              "Kthehu te paneli",
            )}
          >
            <Logo className={s.logo} markClassName={s.logoMark} />
          </Link>
          <Button
            ref={collapseButtonRef}
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleSidebar(true)}
            aria-controls={sidebarId}
            aria-expanded={!collapsed}
            aria-label={t(
              "Collapse sidebar",
              "Скриј ја страничната лента",
              "Mbyll shiritin anësor",
            )}
          >
            <PanelLeftClose />
          </Button>
        </div>
        {newChat}
        <Button
          data-replay-public
          variant="ghost"
          className={s.searchButton}
          onClick={openHistory}
        >
          <Search size={16} />
          {t("Search conversations", "Пребарај разговори", "Kërko biseda")}
        </Button>
        <div className={s.sidebarHistory}>{history()}</div>
        <div className={s.sidebarFooter}>
          {usage && (
            <div className={s.usage}>
              <p data-replay-public>
                {t(
                  "Your monthly answers",
                  "Твои месечни одговори",
                  "Përgjigjet e tua mujore",
                )}
              </p>
              <strong>
                {usage.remaining}{" "}
                <span>
                  {t(
                    `of ${usage.limit} remaining`,
                    `од ${usage.limit} преостанати`,
                    `nga ${usage.limit} të mbetura`,
                  )}
                </span>
              </strong>
              <div className={s.usageTrack} aria-hidden>
                <i
                  style={{
                    width: `${usage.limit > 0 ? Math.min(100, Math.max(0, (usage.remaining / usage.limit) * 100)) : 0}%`,
                  }}
                />
              </div>
              <p>
                {t("Renews", "Се обновува", "Rinovohet")}{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(usage.resetAt)}
              </p>
            </div>
          )}
          {account && <div className={s.account}>{account}</div>}
        </div>
      </aside>
      <div className={s.main}>
        <header className={s.header}>
          <div className={s.headerIdentity}>
            <Button
              className={s.mobileBack}
              variant="ghost"
              size="icon"
              asChild
            >
              <Link
                data-replay-public
                href={backHref}
                aria-label={t(
                  "Back to studio",
                  "Назад кон студиото",
                  "Kthehu te studioja",
                )}
                title={t(
                  "Back to studio",
                  "Назад кон студиото",
                  "Kthehu te studioja",
                )}
              >
                <ArrowLeft />
              </Link>
            </Button>
            {collapsed && (
              <Button
                ref={expandButtonRef}
                className={s.expandSidebar}
                variant="ghost"
                size="icon"
                aria-label={t(
                  "Expand sidebar",
                  "Прикажи ја страничната лента",
                  "Hap shiritin anësor",
                )}
                onClick={() => toggleSidebar(false)}
                aria-controls={sidebarId}
                aria-expanded={!collapsed}
              >
                <PanelLeftOpen />
              </Button>
            )}
            <div>
              <span data-replay-public className={s.headerTitle}>
                {title}
              </span>
              {usage && (
                <span className={s.mobileUsage}>
                  {t(
                    `${usage.remaining} of ${usage.limit} answers remaining`,
                    `Преостанати одговори: ${usage.remaining} од ${usage.limit}`,
                    `${usage.remaining} nga ${usage.limit} përgjigje të mbetura`,
                  )}
                </span>
              )}
            </div>
          </div>
          <div className={s.headerActions}>
            <Button
              className={s.mobileHistory}
              variant="ghost"
              size="icon"
              aria-label={historyLabel}
              onClick={openHistory}
            >
              <PanelLeftOpen />
            </Button>
            <Button
              data-replay-public
              variant="ghost"
              size="icon"
              onClick={startNew}
              disabled={navigationDisabled}
              aria-label={t("New chat", "Нов разговор", "Bisedë e re")}
            >
              <Plus />
            </Button>
          </div>
        </header>
        <div className={s.body}>
          {notices && <div className={s.notices}>{notices}</div>}
          {isEmpty ? (
            <div className={s.welcomeScroll}>
              <div className={s.welcome}>
                <LogoMark className={s.welcomeMark} />
                <p data-replay-public className={s.eyebrow}>
                  {t(
                    "Your studio. A little clearer.",
                    "Твоето студио. Малку појасно.",
                    "Studioja jote. Pak më qartë.",
                  )}
                </p>
                <h1 data-replay-public>
                  {t(
                    "What’s on your mind?",
                    "Што те интересира?",
                    "Çfarë ke në mendje?",
                  )}
                </h1>
                <p data-replay-public className={s.description}>
                  {t(
                    "A fresh look at your appointments, clients, and the patterns in between.",
                    "Нов поглед на термините, клиентите и трендовите во твоето студио.",
                    "Një vështrim i ri mbi terminet, klientët dhe prirjet e studios sate.",
                  )}
                </p>
                {composerContent}
                <div className={s.prompts}>
                  {prompts.map(({ icon: Icon, label, question }) => (
                    <Button
                      data-replay-public
                      key={question}
                      variant="ghost"
                      disabled={promptDisabled}
                      onClick={() => choosePrompt(question)}
                      title={question}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={s.conversation}>
              <div className={s.transcript}>{children}</div>
              <div className={s.composerDock}>{composerContent}</div>
            </div>
          )}
        </div>
        <footer className={s.back}>
          <Link data-replay-public href={backHref}>
            <ArrowLeft size={13} />
            {t("Back to studio", "Назад кон студиото", "Kthehu te studioja")}
          </Link>
        </footer>
      </div>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className={s.historyDialog}>
          <DialogHeader>
            <DialogTitle>{historyLabel}</DialogTitle>
            <DialogDescription>
              {t(
                "Pick up where you left off.",
                "Продолжи таму каде што застана.",
                "Vazhdo aty ku e le.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className={s.historySearch}>
            <Search aria-hidden size={16} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t(
                "Search conversations",
                "Пребарај разговори",
                "Kërko biseda",
              )}
              placeholder={t(
                "Search conversations…",
                "Пребарај разговори…",
                "Kërko biseda…",
              )}
            />
          </div>
          {history(search)}
          {usage && (
            <p className={s.dialogUsage}>
              {t("Renews", "Се обновува", "Rinovohet")}{" "}
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                usage.resetAt,
              )}
            </p>
          )}
          {account && <div className={s.mobileAccount}>{account}</div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AssistantHistoryList({
  conversations,
  selectedId,
  onSelect,
  search,
  disabled,
}: {
  conversations: AssistantHistoryItem[] | undefined;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  search: string;
  disabled: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  if (!conversations)
    return (
      <div
        className={s.historyLoading}
        role="status"
        aria-label={t(
          "Loading conversations",
          "Се вчитуваат разговорите",
          "Duke ngarkuar bisedat",
        )}
      >
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  const visible = conversations.filter((chat) =>
    chat.title
      .toLocaleLowerCase(locale)
      .includes(search.trim().toLocaleLowerCase(locale)),
  );
  const format = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const groups = new Map<string, AssistantHistoryItem[]>();
  for (const chat of visible) {
    const month = format.format(chat.updatedAt);
    groups.set(month, [...(groups.get(month) ?? []), chat]);
  }
  return (
    <div className={s.historyList}>
      {!visible.length ? (
        <p className={s.noResults}>
          {search.trim()
            ? t(
                "No conversations found. Try another search.",
                "Нема пронајдени разговори. Пробај друго пребарување.",
                "Nuk u gjetën biseda. Provo një kërkim tjetër.",
              )
            : t(
                "No saved conversations yet.",
                "Сè уште нема зачувани разговори.",
                "Ende nuk ka biseda të ruajtura.",
              )}
        </p>
      ) : (
        [...groups].map(([month, chats]) => (
          <div key={month}>
            <p className={s.historyDate}>{month}</p>
            {chats.map((chat) => (
              <Button
                key={chat.id}
                type="button"
                variant="ghost"
                disabled={disabled}
                aria-current={selectedId === chat.id ? "true" : undefined}
                onClick={() => onSelect(chat.id)}
                title={chat.title}
              >
                <MessageSquare size={15} />
                <span>{chat.title}</span>
              </Button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
