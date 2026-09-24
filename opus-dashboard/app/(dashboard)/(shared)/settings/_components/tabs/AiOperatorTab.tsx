"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";
import {
  SettingsCard,
  SettingsSection,
  SettingsToggleRow,
} from "../SettingsCard";
import { AiStudioContext } from "./AiStudioContext";
import { InstagramConnection } from "./InstagramConnection";

const TONES = [
  { value: "friendly", labelEn: "Friendly", labelMk: "Пријателски" },
  {
    value: "professional",
    labelEn: "Professional",
    labelMk: "Професионален",
  },
  { value: "casual", labelEn: "Casual", labelMk: "Опуштен" },
  { value: "formal", labelEn: "Formal", labelMk: "Формален" },
] as const;

const LANGUAGES = [
  { value: "auto", labelEn: "Auto-detect", labelMk: "Автоматски" },
  { value: "en", labelEn: "English", labelMk: "English" },
  { value: "mk", labelEn: "Македонски", labelMk: "Македонски" },
] as const;

const DAYS = [
  { en: "Sun", mk: "Нед" },
  { en: "Mon", mk: "Пон" },
  { en: "Tue", mk: "Вто" },
  { en: "Wed", mk: "Сре" },
  { en: "Thu", mk: "Чет" },
  { en: "Fri", mk: "Пет" },
  { en: "Sat", mk: "Саб" },
] as const;

function ConfidenceMeter({ value }: { value: number }) {
  const { t } = useDashboardI18n();
  const percentage =
    Math.max(0, Math.min(1, Number.isNaN(value) ? 0 : value)) * 100;
  const color =
    percentage >= 70
      ? "bg-success"
      : percentage >= 40
        ? "bg-highlight"
        : "bg-danger";
  const label =
    percentage >= 70
      ? t(
          "Higher confidence, fewer automatic replies",
          "Повисока сигурност, помалку автоматски одговори",
        )
      : percentage >= 40
        ? t(
            "Balanced confidence and escalation",
            "Балансирана сигурност и пренасочување кон човек",
          )
        : t(
            "Lower confidence, more automatic replies",
            "Пониска сигурност, повеќе автоматски одговори",
          );

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface AiOperatorTabProps {
  orgId: Id<"orgs">;
  isPaid: boolean;
  initialData: {
    aiEnabled: boolean;
    aiPersonaName: string;
    aiConfidenceThreshold: number;
    aiHandoffPhoneNumber: string;
    aiWebchatEnabled: boolean;
    aiInstagramEnabled: boolean;
    aiSystemPrompt: string;
    aiStudioContext: string;
    aiGreetingMessage: string;
    aiTone: "friendly" | "professional" | "casual" | "formal";
    aiLanguage: "auto" | "en" | "mk";
    aiWorkingHoursEnabled: boolean;
    aiWorkingHours: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    aiWorkingHoursEnabled_days: boolean[];
    aiAwayMessage: string;
  };
}

export function AiOperatorTab({
  orgId,
  isPaid,
  initialData,
}: AiOperatorTabProps) {
  const { t } = useDashboardI18n();
  const [ai, setAi] = useState(initialData);
  const status = useQuery(api.ai.connections.getStatus, {});
  const [personaError, setPersonaError] = useState<string>();
  const [confidenceError, setConfidenceError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const updateAiSettings = useMutation(api.orgSettings.updateAiSettings);

  const controlsDisabled = !isPaid || !status?.canManage || isSaving;

  const handleSave = async () => {
    if (controlsDisabled) return;
    let hasErrors = false;
    if (!ai.aiPersonaName.trim()) {
      setPersonaError(
        t(
          "Enter the name shown to customers.",
          "Внесете го името што ќе им се прикажува на клиентите.",
        ),
      );
      hasErrors = true;
    }
    if (
      !Number.isFinite(ai.aiConfidenceThreshold) ||
      ai.aiConfidenceThreshold < 0.7 ||
      ai.aiConfidenceThreshold > 1
    ) {
      setConfidenceError(
        t("Enter a number between 0.7 and 1.", "Внесете број помеѓу 0.7 и 1."),
      );
      hasErrors = true;
    }
    if (hasErrors) return;

    setPersonaError(undefined);
    setConfidenceError(undefined);
    setIsSaving(true);
    try {
      const activeHours = ai.aiWorkingHours.filter(
        (entry) => ai.aiWorkingHoursEnabled_days[entry.dayOfWeek],
      );
      await updateAiSettings({
        orgId,
        aiEnabled: ai.aiEnabled,
        aiPersonaName: ai.aiPersonaName.trim(),
        aiConfidenceThreshold: ai.aiConfidenceThreshold,
        aiHandoffPhoneNumber: ai.aiHandoffPhoneNumber,
        aiWebchatEnabled: ai.aiWebchatEnabled,
        aiInstagramEnabled: ai.aiInstagramEnabled,
        aiSystemPrompt: ai.aiSystemPrompt,
        aiStudioContext: ai.aiStudioContext,
        aiGreetingMessage: ai.aiGreetingMessage,
        aiTone: ai.aiTone,
        aiLanguage: ai.aiLanguage,
        aiWorkingHoursEnabled: ai.aiWorkingHoursEnabled,
        aiWorkingHours: activeHours,
        aiAwayMessage: ai.aiAwayMessage,
      });
      toast.success(
        t(
          "AI front-desk settings saved",
          "Поставките за AI рецепција се зачувани",
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Failed to save AI front-desk settings.",
              "Не успеа зачувувањето на поставките за AI рецепција.",
            ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateWorkingHour = (
    dayOfWeek: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setAi((current) => ({
      ...current,
      aiWorkingHours: current.aiWorkingHours.map((entry) =>
        entry.dayOfWeek === dayOfWeek ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  return (
    <TabsContent value="ai" className="m-0">
      <fieldset disabled={controlsDisabled} className="min-w-0">
        <SettingsCard
          title={t("AI front desk", "AI рецепција")}
          description={t(
            "Manage your assistant identity, customer channels, and team handoff preferences.",
            "Управувајте со идентитетот на асистентот, каналите за клиенти и поставките за предавање на разговорите на тимот.",
          )}
          action={
            <div className="flex items-center gap-2">
              <Badge variant="pro">Pro</Badge>
            </div>
          }
          contentClassName="flex flex-col gap-7"
          footer={
            isPaid && (
              <Button onClick={handleSave} disabled={controlsDisabled}>
                {isSaving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                {isSaving
                  ? t("Saving…", "Се зачувува…")
                  : t("Save AI settings", "Зачувај AI поставки")}
              </Button>
            )
          }
        >
          {!isPaid && (
            <p className="text-sm text-muted-foreground">
              {t(
                "AI front desk is included in Pro. Contact OPUS to upgrade and activate it for your studio.",
                "AI рецепцијата е дел од Pro. Контактирајте нè за надградба и активирање за вашето студио.",
              )}
            </p>
          )}
          <SettingsToggleRow
            title={t("Enable AI front desk", "Овозможи AI рецепција")}
            description={t(
              "Use this configuration on connected and enabled customer channels.",
              "Користете ја оваа конфигурација на поврзаните и овозможени канали за клиенти.",
            )}
            control={
              <Switch
                disabled={controlsDisabled}
                id="ai-enabled"
                aria-label={t("Enable AI front desk", "Овозможи AI рецепција")}
                checked={isPaid && ai.aiEnabled}
                onCheckedChange={(checked) =>
                  setAi((current) => ({ ...current, aiEnabled: checked }))
                }
              />
            }
          />

          <Separator />
          <InstagramConnection disabled={controlsDisabled} />
          <Separator />
          <AiStudioContext
            value={ai.aiStudioContext}
            onChange={(value) =>
              setAi((current) => ({ ...current, aiStudioContext: value }))
            }
            canPreview={!controlsDisabled && !!status?.provider.ai}
          />

          {
            <>
              <Separator />

              <SettingsSection
                title={t("Assistant identity", "Идентитет на асистент")}
                description={t(
                  "Set the customer-facing name, confidence threshold, and handoff route.",
                  "Поставете го името за клиенти, прагот на сигурност и контактот за пренасочување.",
                )}
              >
                <FieldGroup className="max-w-2xl">
                  <Field data-invalid={Boolean(personaError)}>
                    <FieldLabel htmlFor="persona-name">
                      {t("Assistant name", "Име на асистент")}
                    </FieldLabel>
                    <Input
                      id="persona-name"
                      value={ai.aiPersonaName}
                      maxLength={50}
                      aria-describedby="persona-name-description"
                      aria-invalid={Boolean(personaError)}
                      onChange={(event) => {
                        setAi((current) => ({
                          ...current,
                          aiPersonaName: event.target.value,
                        }));
                        if (personaError) setPersonaError(undefined);
                      }}
                    />
                    <FieldDescription id="persona-name-description">
                      {t(
                        "The name customers see in automated conversations.",
                        "Името што клиентите го гледаат во автоматските разговори.",
                      )}
                    </FieldDescription>
                    <FieldError>{personaError}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(confidenceError)}>
                    <FieldLabel htmlFor="confidence-threshold">
                      {t("Confidence threshold", "Праг на сигурност")}
                    </FieldLabel>
                    <Input
                      id="confidence-threshold"
                      type="number"
                      min="0.7"
                      max="1"
                      step="0.05"
                      value={
                        Number.isFinite(ai.aiConfidenceThreshold)
                          ? String(ai.aiConfidenceThreshold)
                          : ""
                      }
                      aria-describedby="confidence-description"
                      aria-invalid={Boolean(confidenceError)}
                      onChange={(event) => {
                        setAi((current) => ({
                          ...current,
                          aiConfidenceThreshold: Number.parseFloat(
                            event.target.value,
                          ),
                        }));
                        if (confidenceError) setConfidenceError(undefined);
                      }}
                    />
                    <ConfidenceMeter value={ai.aiConfidenceThreshold} />
                    <FieldDescription id="confidence-description">
                      {t(
                        "Below this score, the conversation is handed to a person.",
                        "Под оваа оцена, разговорот се пренасочува кон вработен.",
                      )}
                    </FieldDescription>
                    <FieldError>{confidenceError}</FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="handoff-phone">
                      {t(
                        "Handoff phone number",
                        "Телефонски број за пренасочување",
                      )}
                    </FieldLabel>
                    <Input
                      id="handoff-phone"
                      value={ai.aiHandoffPhoneNumber}
                      placeholder="+389 71 234 567"
                      onChange={(event) =>
                        setAi((current) => ({
                          ...current,
                          aiHandoffPhoneNumber: event.target.value,
                        }))
                      }
                    />
                    <FieldDescription>
                      {t(
                        "Customers can be directed here when the assistant cannot help.",
                        "Клиентите може да бидат пренасочени тука кога асистентот не може да помогне.",
                      )}
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </SettingsSection>

              <Separator />

              <SettingsSection
                title={t("Channels", "Канали")}
                description={t(
                  "These switches permit an existing channel connection; they do not configure the provider itself.",
                  "Овие прекинувачи овозможуваат постоечка врска со канал; тие не го конфигурираат самиот провајдер.",
                )}
              >
                <div className="flex flex-col gap-3">
                  <SettingsToggleRow
                    title={t("Instagram DM", "Instagram пораки")}
                    description={t(
                      "Allow the assistant on the configured Instagram connection.",
                      "Дозволи го асистентот на конфигурираната Instagram сметка.",
                    )}
                    control={
                      <Switch
                        disabled={controlsDisabled}
                        id="instagram-enabled"
                        aria-label={t(
                          "Enable Instagram DM",
                          "Овозможи Instagram пораки",
                        )}
                        checked={ai.aiInstagramEnabled}
                        onCheckedChange={(checked) =>
                          setAi((current) => ({
                            ...current,
                            aiInstagramEnabled: checked,
                          }))
                        }
                      />
                    }
                  />
                </div>
              </SettingsSection>

              <Separator />

              <SettingsSection
                title={t("Conversation style", "Стил на разговор")}
                description={t(
                  "Choose how the assistant speaks and opens a conversation.",
                  "Изберете како асистентот зборува и започнува разговор.",
                )}
              >
                <FieldGroup className="max-w-2xl">
                  <Field>
                    <FieldLabel>{t("Tone", "Тон на обраќање")}</FieldLabel>
                    <ToggleGroup
                      disabled={controlsDisabled}
                      type="single"
                      value={ai.aiTone}
                      onValueChange={(value) => {
                        if (!value) return;
                        setAi((current) => ({
                          ...current,
                          aiTone:
                            value as AiOperatorTabProps["initialData"]["aiTone"],
                        }));
                      }}
                      variant="outline"
                      spacing={2}
                      aria-label={t("Assistant tone", "Тон на асистентот")}
                      className="flex flex-wrap"
                    >
                      {TONES.map((tone) => (
                        <ToggleGroupItem key={tone.value} value={tone.value}>
                          {t(tone.labelEn, tone.labelMk)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>

                  <Field>
                    <FieldLabel>{t("Language", "Јазик")}</FieldLabel>
                    <ToggleGroup
                      disabled={controlsDisabled}
                      type="single"
                      value={ai.aiLanguage}
                      onValueChange={(value) => {
                        if (!value) return;
                        setAi((current) => ({
                          ...current,
                          aiLanguage:
                            value as AiOperatorTabProps["initialData"]["aiLanguage"],
                        }));
                      }}
                      variant="outline"
                      spacing={2}
                      aria-label={t(
                        "Assistant language",
                        "Јазик на асистентот",
                      )}
                      className="flex flex-wrap"
                    >
                      {LANGUAGES.map((language) => (
                        <ToggleGroupItem
                          key={language.value}
                          value={language.value}
                        >
                          {t(language.labelEn, language.labelMk)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <FieldDescription>
                      {t(
                        "Auto-detect replies in English or Macedonian based on the customer's message.",
                        "Автоматско одговарање на англиски или македонски јазик во зависност од пораката на клиентот.",
                      )}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="greeting-message">
                      {t("Greeting message", "Порака за поздрав")}
                    </FieldLabel>
                    <Input
                      id="greeting-message"
                      value={ai.aiGreetingMessage}
                      placeholder={t(
                        "Hi! How can I help with your appointment?",
                        "Здраво! Како можам да ви помогнам со вашиот термин?",
                      )}
                      onChange={(event) =>
                        setAi((current) => ({
                          ...current,
                          aiGreetingMessage: event.target.value,
                        }))
                      }
                    />
                    <FieldDescription>
                      {t(
                        "A greeting preference for the assistant’s first reply.",
                        "Пример за поздрав во првиот одговор на асистентот.",
                      )}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="custom-instructions">
                      {t("Custom instructions", "Прилагодени упатства")}
                    </FieldLabel>
                    <Textarea
                      id="custom-instructions"
                      value={ai.aiSystemPrompt}
                      rows={4}
                      placeholder={t(
                        "Preferred wording and conversation rules.",
                        "Претпочитани формулации и правила за разговорот.",
                      )}
                      onChange={(event) =>
                        setAi((current) => ({
                          ...current,
                          aiSystemPrompt: event.target.value,
                        }))
                      }
                    />
                    <FieldDescription>
                      {t(
                        "Add boundaries, special policies, or preferred wording.",
                        "Додајте ограничувања, посебни правила или претпочитани формулации.",
                      )}
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </SettingsSection>

              <Separator />

              <SettingsSection
                title={t("Working hours", "Работно време")}
                description={t(
                  "Optionally limit automated replies to a weekly schedule in your studio’s timezone.",
                  "Изборно ограничете ги автоматските одговори на неделен распоред во временската зона на студиото.",
                )}
              >
                <SettingsToggleRow
                  title={t("Use working hours", "Користи работно време")}
                  description={t(
                    "Send the away message outside the selected times.",
                    "Испраќај порака за отсутност надвор од избраното време.",
                  )}
                  control={
                    <Switch
                      disabled={controlsDisabled}
                      id="working-hours-enabled"
                      aria-label={t(
                        "Use AI working hours",
                        "Користи AI работно време",
                      )}
                      checked={ai.aiWorkingHoursEnabled}
                      onCheckedChange={(checked) =>
                        setAi((current) => ({
                          ...current,
                          aiWorkingHoursEnabled: checked,
                        }))
                      }
                    />
                  }
                />

                {ai.aiWorkingHoursEnabled && (
                  <div className="flex max-w-2xl flex-col gap-3">
                    {DAYS.map((day, dayOfWeek) => {
                      const hours = ai.aiWorkingHours.find(
                        (entry) => entry.dayOfWeek === dayOfWeek,
                      );
                      const enabled =
                        ai.aiWorkingHoursEnabled_days[dayOfWeek] ?? false;

                      return (
                        <div
                          key={day.en}
                          className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 sm:grid-cols-[auto_2.5rem_minmax(0,1fr)_auto_minmax(0,1fr)]"
                        >
                          <Checkbox
                            disabled={controlsDisabled}
                            id={`ai-day-${dayOfWeek}`}
                            checked={enabled}
                            onCheckedChange={(checked) => {
                              const enabledDays = [
                                ...ai.aiWorkingHoursEnabled_days,
                              ];
                              enabledDays[dayOfWeek] = checked === true;
                              setAi((current) => ({
                                ...current,
                                aiWorkingHoursEnabled_days: enabledDays,
                              }));
                            }}
                          />
                          <Label htmlFor={`ai-day-${dayOfWeek}`}>
                            {t(day.en, day.mk)}
                          </Label>
                          <div className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:contents">
                            <Input
                              type="time"
                              aria-label={t(
                                `${day.en} start time`,
                                `${day.mk} време на почеток`,
                              )}
                              disabled={!enabled}
                              value={hours?.startTime ?? "09:00"}
                              onChange={(event) =>
                                updateWorkingHour(
                                  dayOfWeek,
                                  "startTime",
                                  event.target.value,
                                )
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {t("to", "до")}
                            </span>
                            <Input
                              type="time"
                              aria-label={t(
                                `${day.en} end time`,
                                `${day.mk} време на крај`,
                              )}
                              disabled={!enabled}
                              value={hours?.endTime ?? "18:00"}
                              onChange={(event) =>
                                updateWorkingHour(
                                  dayOfWeek,
                                  "endTime",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}

                    <Field>
                      <FieldLabel htmlFor="away-message">
                        {t("Away message", "Порака за отсутност")}
                      </FieldLabel>
                      <Textarea
                        id="away-message"
                        value={ai.aiAwayMessage}
                        rows={3}
                        placeholder={t(
                          "We are currently outside business hours.",
                          "Моментално сме надвор од работното време.",
                        )}
                        onChange={(event) =>
                          setAi((current) => ({
                            ...current,
                            aiAwayMessage: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                )}
              </SettingsSection>
            </>
          }
        </SettingsCard>
      </fieldset>
    </TabsContent>
  );
}
