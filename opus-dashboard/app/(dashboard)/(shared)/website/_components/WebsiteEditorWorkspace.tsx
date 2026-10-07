"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Globe2,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  Scissors,
  Users,
  MapPin,
  PanelTop,
  PanelBottom,
  Languages,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  MousePointer2,
  Hand,
  SlidersHorizontal,
  Eye,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { websiteEditorReducer } from "@/lib/website-editor-state";
import { WEBSITE_LANGUAGE_NAMES } from "@/lib/website-i18n";
import {
  defaultWebsiteDesign,
  WEBSITE_CONTENT_KEYS,
  WEBSITE_PANELS,
  type WebsiteDesign,
  type WebsitePanel,
} from "../../../../../../shared/website-design";
import { isLocale, type Locale } from "../../../../../../shared/i18n/locale";
import type { WebsitePreviewEvent } from "@/components/website/preview-protocol";
import { DesignControls } from "./DesignControls";
import { SectionControls } from "./SectionControls";
import { LanguageControls } from "./LanguageControls";

type EditorData = FunctionReturnType<typeof api.websiteDesigns.getEditor>;

export function WebsiteEditorWorkspace({ data }: { data: EditorData }) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  const [state, dispatch] = useReducer(websiteEditorReducer, {
    present: data.draft,
    saved: data.draft,
    revision: data.revision,
    past: [],
    future: [],
  });
  const design = state.present;
  const [selected, setSelected] = useState<WebsitePanel>("design");
  const [device, setDevice] = useState("desktop");
  const [mode, setMode] = useState<"edit" | "interact">("edit");
  const [previewLocale, setPreviewLocale] = useState<Locale>(
    design.primaryLanguage,
  );
  const [mobilePanel, setMobilePanel] = useState<"preview" | "controls">(
    "preview",
  );
  const [operation, setOperation] = useState<
    "save" | "publish" | "translate" | null
  >(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [frameReady, setFrameReady] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const working = useRef(false);
  const revision = useRef(state.revision);
  const saveDraft = useMutation(api.websiteDesigns.saveDraft);
  const publishDesign = useMutation(api.websiteDesigns.publish);
  const translateDraft = useMutation(api.websiteDesigns.translateDraft);
  const dirty = JSON.stringify(design) !== JSON.stringify(state.saved);
  const locale = design.languages.includes(previewLocale)
    ? previewLocale
    : design.primaryLanguage;
  const panels = [
    {
      id: "design",
      label: t("Design", "Дизајн", "Dizajni"),
      icon: LayoutTemplate,
      description: t(
        "Set the mood. Make it yours.",
        "Изберете стил што ве претставува.",
        "Zgjidhni stilin që ju përfaqëson.",
      ),
    },
    {
      id: "header",
      label: t("Navigation", "Навигација", "Navigimi"),
      icon: PanelTop,
      description: t(
        "A warm welcome starts here.",
        "Добредојде што почнува тука.",
        "Mirëseardhja fillon këtu.",
      ),
    },
    {
      id: "hero",
      label: t("Hero", "Насловна", "Ballina"),
      icon: Type,
      description: t(
        "Your studio’s first impression.",
        "Првиот впечаток за вашето студио.",
        "Përshtypja e parë e studios suaj.",
      ),
    },
    {
      id: "services",
      label: t("Services", "Услуги", "Shërbimet"),
      icon: Scissors,
      description: t(
        "Make the next appointment easy to find.",
        "Олеснете го изборот на следниот термин.",
        "Bëni më të lehtë zgjedhjen e terminit.",
      ),
    },
    {
      id: "about",
      label: t("About", "За студиото", "Rreth studios"),
      icon: Globe2,
      description: t(
        "Tell the story behind your studio.",
        "Раскажете ја приказната на студиото.",
        "Tregoni historinë e studios.",
      ),
    },
    {
      id: "gallery",
      label: t("Gallery", "Галерија", "Galeria"),
      icon: ImageIcon,
      description: t(
        "Let your work do the talking.",
        "Вашата работа нека зборува.",
        "Lëreni punën tuaj të flasë.",
      ),
    },
    {
      id: "team",
      label: t("Team", "Тим", "Ekipi"),
      icon: Users,
      description: t(
        "Introduce the people behind the craft.",
        "Претставете го вашиот тим.",
        "Prezantoni ekipin tuaj.",
      ),
    },
    {
      id: "info",
      label: t("Visit & contact", "Посета и контакт", "Vizita dhe kontakti"),
      icon: MapPin,
      description: t(
        "Everything clients need for their visit.",
        "Сè што клиентите треба да знаат за посетата.",
        "Gjithçka që klientët duhet të dinë për vizitën.",
      ),
    },
    {
      id: "footer",
      label: t("Footer", "Подножје", "Fundi"),
      icon: PanelBottom,
      description: t(
        "Give your page a finishing touch.",
        "Завршен допир на страницата.",
        "Jepini faqes prekjen përfundimtare.",
      ),
    },
    {
      id: "languages",
      label: t("Languages", "Јазици", "Gjuhët"),
      icon: Languages,
      description: t(
        "One website. Write your content once.",
        "Една страница. Содржината ја пишувате еднаш.",
        "Një uebsajt. Shkruani përmbajtjen një herë.",
      ),
    },
  ] as const;
  const current = panels.find((panel) => panel.id === selected)!;
  const siteUrl = tenantSiteUrl(
    data.site.slug,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk",
  );

  function change(next: WebsiteDesign) {
    dispatch({ type: "change", design: next });
  }
  function select(panel: WebsitePanel) {
    setSelected(panel);
    setMobilePanel("controls");
    if (!["design", "languages"].includes(panel))
      frame.current?.contentWindow?.postMessage(
        { type: "opus-sites-scroll", panel },
        window.location.origin,
      );
  }
  useEffect(() => {
    dispatch({
      type: "translations",
      design: data.draft,
      revision: data.revision,
    });
  }, [data.draft, data.revision]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    const receive = (event: MessageEvent<WebsitePreviewEvent>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data?.type === "opus-sites-ready")
        setFrameReady((ready) => ready + 1);
      if (event.data?.type === "opus-sites-select") {
        const panel = event.data.panel;
        if (WEBSITE_PANELS.includes(panel)) {
          setSelected(panel);
          setMobilePanel("controls");
        }
      }
      if (
        event.data?.type === "opus-sites-content" &&
        WEBSITE_CONTENT_KEYS.includes(event.data.key) &&
        typeof event.data.value === "string"
      )
        dispatch({
          type: "change",
          design: {
            ...design,
            content: { ...design.content, [event.data.key]: event.data.value },
          },
        });
      if (
        event.data?.type === "opus-sites-locale" &&
        isLocale(event.data.locale) &&
        design.languages.includes(event.data.locale)
      )
        setPreviewLocale(event.data.locale);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [design]);
  useEffect(() => {
    if (!frameReady) return;
    frame.current?.contentWindow?.postMessage(
      {
        type: "opus-sites-update",
        state: { site: data.site, design, locale, selected, mode },
      },
      window.location.origin,
    );
  }, [frameReady, data.site, design, locale, selected, mode]);
  useEffect(() => {
    if (!frameReady || selected === "design" || selected === "languages")
      return;
    const resize = requestAnimationFrame(() =>
      frame.current?.contentWindow?.postMessage(
        { type: "opus-sites-scroll", panel: selected },
        window.location.origin,
      ),
    );
    return () => cancelAnimationFrame(resize);
  }, [device, frameReady, selected]);

  async function persist() {
    if (!dirty && revision.current > 0) return revision.current;
    const snapshot = design;
    const result = await saveDraft({
      design: snapshot,
      baseRevision: revision.current,
    });
    revision.current = result.revision;
    dispatch({ type: "saved", design: snapshot, revision: result.revision });
    return result.revision;
  }
  async function perform(action: "save" | "publish" | "translate") {
    if (working.current) return;
    working.current = true;
    setOperation(action);
    try {
      const currentRevision = await persist();
      if (action === "publish") {
        await publishDesign({ revision: currentRevision });
        toast.success(
          t(
            "Your website design is published",
            "Дизајнот е објавен",
            "Dizajni i uebsajtit u publikua",
          ),
        );
      } else if (action === "translate") {
        await translateDraft({ revision: currentRevision });
        toast.success(
          t(
            "Translations are being prepared",
            "Преводите се подготвуваат",
            "Përkthimet po përgatiten",
          ),
        );
      } else
        toast.success(t("Draft saved", "Нацртот е зачуван", "Drafti u ruajt"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[CONVEX[^]*?\] /, "")
          : t(
              "Could not save. Please try again.",
              "Не може да се зачува. Обидете се повторно.",
              "Nuk mund të ruhej. Provoni përsëri.",
            ),
      );
    } finally {
      working.current = false;
      setOperation(null);
    }
  }
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void perform("save");
      }
      if (
        (event.target as HTMLElement)?.closest(
          "input, textarea, [contenteditable]",
        )
      )
        return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  const tipButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    disabled = false,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  const controlProps = { design, site: data.site, change, select };
  return (
    <div
      className="sites-editor"
      data-mobile-panel={mobilePanel}
      data-replay-private
    >
      <header className="sites-editor-header">
        {tipButton(
          t("Back to studio", "Назад во студио", "Kthehuni në studio"),
          <ArrowLeft />,
          () => (dirty ? setLeaveOpen(true) : router.push("/beauty")),
        )}
        <a
          href="/website"
          className="sites-editor-brand"
          onClick={(event) => event.preventDefault()}
        >
          <Logo />
          <span>Sites</span>
        </a>
        <span className="sites-header-divider" aria-hidden="true" />
        <div className="sites-editor-studio">
          <span>{data.site.name}</span>
          <span className="sites-save-status" aria-live="polite">
            {operation === "save"
              ? t("Saving…", "Се зачувува…", "Duke ruajtur…")
              : dirty
                ? t(
                    "Unsaved changes",
                    "Незачувани промени",
                    "Ndryshime të paruajtura",
                  )
                : state.revision === 0
                  ? t("New draft", "Нов нацрт", "Draft i ri")
                  : t("Draft saved", "Нацртот е зачуван", "Drafti u ruajt")}
          </span>
        </div>
        <div className="sites-editor-actions">
          <div className="sites-history-controls">
            {tipButton(
              t("Undo", "Врати", "Zhbëni"),
              <Undo2 />,
              () => dispatch({ type: "undo" }),
              !state.past.length,
            )}
            {tipButton(
              t("Redo", "Повтори", "Ribëni"),
              <Redo2 />,
              () => dispatch({ type: "redo" }),
              !state.future.length,
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("Save draft", "Зачувај нацрт", "Ruani draftin")}
            onClick={() => void perform("save")}
            disabled={!!operation || (!dirty && state.revision > 0)}
          >
            <Save data-icon="inline-start" />
            <span className="sites-save-label">
              {t("Save draft", "Зачувај нацрт", "Ruani draftin")}
            </span>
          </Button>
          <Button
            size="sm"
            onClick={() => void perform("publish")}
            disabled={!!operation || !data.canPublish}
          >
            {operation === "publish" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ArrowUpRight data-icon="inline-end" />
            )}
            {t("Publish", "Објави", "Publikoni")}
          </Button>
        </div>
      </header>
      <div className="sites-editor-body">
        <nav
          className="sites-editor-rail"
          aria-label={t(
            "Website sections",
            "Секции на веб-страницата",
            "Seksionet e uebsajtit",
          )}
        >
          {panels.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={selected === id}
                  onClick={() => select(id)}
                  data-active={selected === id}
                >
                  <Icon aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <aside
          className="sites-editor-controls"
          aria-label={t(
            "Section controls",
            "Контроли за секција",
            "Kontrollet e seksionit",
          )}
        >
          <div className="sites-controls-title">
            <p>
              OPUS SITES <ChevronRight aria-hidden="true" />
              {t("Customize", "Уреди", "Personalizoni")}
            </p>
            <h1
              className={
                selected === "languages" ? "flex items-center gap-3" : undefined
              }
            >
              {current.label}
              {selected === "languages" && <Badge variant="pro">Pro</Badge>}
            </h1>
            <span>{current.description}</span>
          </div>
          <div className="sites-controls-scroll" key={selected}>
            {data.revision !== state.revision && !operation && (
              <Alert>
                <AlertDescription>
                  {t(
                    "Another window saved a newer draft. Reload before saving your changes.",
                    "Во друг прозорец е зачуван понов нацрт. Освежете пред зачувување.",
                    "Një dritare tjetër ruajti një draft më të ri. Rifreskoni para se të ruani.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {!data.canPublish && (
              <Alert>
                <AlertDescription>
                  {t(
                    "Complete your studio’s booking setup before publishing. You can save and customize this draft.",
                    "Завршете го поставувањето на закажувањето пред објавување. Нацртот може да се уредува и зачува.",
                    "Përfundoni konfigurimin e rezervimeve para publikimit. Mund ta ruani dhe personalizoni draftin.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {selected === "design" ? (
              <DesignControls {...controlProps} />
            ) : selected === "languages" ? (
              <LanguageControls
                {...controlProps}
                translate={() => void perform("translate")}
                translating={
                  operation === "translate" ||
                  data.translationStatus === "queued"
                }
                available={data.translationAvailable}
                status={data.translationStatus}
                canManageLanguages={data.canManageLanguages}
              />
            ) : (
              <SectionControls {...controlProps} panel={selected} />
            )}
            {selected === "design" && (
              <Button variant="ghost" onClick={() => setResetOpen(true)}>
                {t("Reset design", "Ресетирај дизајн", "Rivendosni dizajnin")}
              </Button>
            )}
          </div>
          <div className="sites-controls-foot">
            <span className="sites-draft-dot" />
            <p>
              {t(
                "Design changes stay in your draft until you publish.",
                "Измените на дизајнот остануваат во нацртот до објавување.",
                "Ndryshimet e dizajnit mbeten në draft derisa të publikoni.",
              )}
            </p>
          </div>
        </aside>
        <section
          className="sites-editor-preview"
          aria-label={t(
            "Live website preview",
            "Преглед во живо",
            "Pamja paraprake në kohë reale",
          )}
        >
          <div className="sites-preview-toolbar">
            <div className="sites-preview-address">
              <Globe2 aria-hidden="true" />
              <span>{new URL(siteUrl).host}</span>
              <Badge variant="secondary">
                {t("Preview", "Преглед", "Pamja paraprake")}
              </Badge>
            </div>
            <ToggleGroup
              type="single"
              value={device}
              onValueChange={(value) => {
                if (value) setDevice(value);
              }}
              className="sites-device-controls"
              aria-label={t(
                "Preview screen size",
                "Големина на преглед",
                "Madhësia e pamjes paraprake",
              )}
            >
              <ToggleGroupItem
                value="desktop"
                aria-label={t("Desktop", "Компјутер", "Kompjuter")}
              >
                <Monitor />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="tablet"
                aria-label={t("Tablet", "Таблет", "Tablet")}
              >
                <Tablet />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="mobile"
                aria-label={t("Phone", "Телефон", "Telefon")}
              >
                <Smartphone />
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="sites-preview-tools">
              <Select
                value={locale}
                onValueChange={(value) => setPreviewLocale(value as Locale)}
              >
                <SelectTrigger
                  aria-label={t(
                    "Preview language",
                    "Јазик на преглед",
                    "Gjuha e pamjes paraprake",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {design.languages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {WEBSITE_LANGUAGE_NAMES[language]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                  if (value) setMode(value as "edit" | "interact");
                }}
                aria-label={t(
                  "Preview interaction",
                  "Интеракција со преглед",
                  "Ndërveprimi me pamjen paraprake",
                )}
              >
                <ToggleGroupItem
                  value="edit"
                  aria-label={t(
                    "Select sections",
                    "Избери секции",
                    "Zgjidhni seksionet",
                  )}
                >
                  <MousePointer2 />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="interact"
                  aria-label={t(
                    "Browse preview",
                    "Разгледај преглед",
                    "Shfletoni pamjen paraprake",
                  )}
                >
                  <Hand />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <div className="sites-preview-stage">
            <div className="sites-preview-device" data-device={device}>
              <iframe
                ref={frame}
                src="/website/preview"
                title={t(
                  "Your studio website preview",
                  "Преглед на веб-страницата на студиото",
                  "Pamja paraprake e uebsajtit të studios",
                )}
                onLoad={() => setFrameReady((ready) => ready + 1)}
              />
            </div>
          </div>
          <div className="sites-preview-foot">
            <span>
              <MousePointer2 aria-hidden="true" />
              {mode === "edit"
                ? t(
                    "Click a section to customize · Double-click text to edit",
                    "Кликнете на секција за уредување · Двапати на текст за измени",
                    "Klikoni seksionin për ta personalizuar · Dy herë mbi tekst për ta redaktuar",
                  )
                : t(
                    "Try the menus and gallery in your preview",
                    "Испробајте ги менијата и галеријата во прегледот",
                    "Provoni menutë dhe galerinë në pamjen paraprake",
                  )}
            </span>
            <span className="sites-preview-dimensions">
              {device === "desktop"
                ? t("Responsive", "Прилагодливо", "Përshtatëse")
                : device === "tablet"
                  ? "768 px"
                  : "390 px"}
            </span>
          </div>
        </section>
      </div>
      <div className="sites-mobile-switch">
        <ToggleGroup
          type="single"
          value={mobilePanel}
          onValueChange={(value) => {
            if (value) setMobilePanel(value as "controls" | "preview");
          }}
          aria-label={t(
            "Editor view",
            "Поглед во уредувач",
            "Pamja e redaktuesit",
          )}
        >
          <ToggleGroupItem value="controls">
            <SlidersHorizontal />
            {t("Customize", "Уреди", "Personalizoni")}
          </ToggleGroupItem>
          <ToggleGroupItem value="preview">
            <Eye />
            {t("Preview", "Преглед", "Pamja paraprake")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "Save your draft before leaving?",
                "Зачувајте го нацртот пред излегување?",
                "Ruani draftin para se të largoheni?",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Your latest changes have not been saved.",
                "Последните промени не се зачувани.",
                "Ndryshimet e fundit nuk janë ruajtur.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t(
                "Keep editing",
                "Продолжи со уредување",
                "Vazhdoni redaktimin",
              )}
            </AlertDialogCancel>
            <Button variant="outline" onClick={() => router.push("/beauty")}>
              {t(
                "Leave without saving",
                "Излези без зачувување",
                "Largohuni pa ruajtur",
              )}
            </Button>
            <Button
              onClick={async () => {
                try {
                  await persist();
                  router.push("/beauty");
                } catch {
                  toast.error(
                    t(
                      "Could not save draft",
                      "Не може да се зачува нацртот",
                      "Nuk mund të ruhej drafti",
                    ),
                  );
                }
              }}
            >
              {t("Save and leave", "Зачувај и излези", "Ruani dhe largohuni")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "Reset your design?",
                "Ресетирајте го дизајнот?",
                "Rivendosni dizajnin?",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Restore the default layouts and palette. Your written content and languages are kept. You can undo this.",
                "Вратете ги почетните распореди и палета. Вашиот текст и јазици се зачувуваат. Може да ја вратите промената.",
                "Riktheni paraqitjet dhe paletën fillestare. Teksti dhe gjuhët tuaja ruhen. Mund ta zhbëni këtë.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("Cancel", "Откажи", "Anuloni")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                change({
                  ...defaultWebsiteDesign(design.primaryLanguage),
                  content: design.content,
                  serviceCopy: design.serviceCopy,
                  primaryLanguage: design.primaryLanguage,
                  languages: design.languages,
                  autoTranslate: design.autoTranslate,
                  translations: design.translations,
                })
              }
            >
              {t("Reset design", "Ресетирај дизајн", "Rivendosni dizajnin")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
