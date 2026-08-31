"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DebouncedTextarea } from "@/components/ui/debounced-textarea";
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
import { cn } from "@/lib/utils";
import {
  SettingsCard,
  SettingsSection,
  SettingsToggleRow,
} from "../SettingsCard";
import { validConfidence } from "../validation";

const TONES = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
] as const;

const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "mk", label: "Македонски" },
] as const;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ConfidenceMeter({ value }: { value: number }) {
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
      ? "Higher confidence, fewer automatic replies"
      : percentage >= 40
        ? "Balanced confidence and escalation"
        : "Lower confidence, more automatic replies";

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
  initialData: {
    aiEnabled: boolean;
    aiPersonaName: string;
    aiConfidenceThreshold: number;
    aiHandoffPhoneNumber: string;
    aiWebchatEnabled: boolean;
    aiInstagramEnabled: boolean;
    aiSystemPrompt: string;
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

export function AiOperatorTab({ orgId, initialData }: AiOperatorTabProps) {
  const [ai, setAi] = useState(initialData);
  const [personaError, setPersonaError] = useState<string>();
  const [confidenceError, setConfidenceError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const updateAiSettings = useMutation(api.orgSettings.updateAiSettings);

  const handleSave = async () => {
    let hasErrors = false;
    if (!ai.aiPersonaName.trim()) {
      setPersonaError("Enter the name shown to customers.");
      hasErrors = true;
    }
    if (!validConfidence(ai.aiConfidenceThreshold)) {
      setConfidenceError("Enter a number between 0 and 1.");
      hasErrors = true;
    }
    if (hasErrors) return;

    setPersonaError(undefined);
    setConfidenceError(undefined);
    setIsSaving(true);
    try {
      const activeHours = ai.aiWorkingHours.filter(
        (_, index) => ai.aiWorkingHoursEnabled_days[index],
      );
      await updateAiSettings({
        orgId,
        aiEnabled: ai.aiEnabled,
        aiPersonaName: ai.aiPersonaName.trim(),
        aiConfidenceThreshold: ai.aiConfidenceThreshold,
        aiHandoffPhoneNumber: ai.aiHandoffPhoneNumber || undefined,
        aiWebchatEnabled: ai.aiWebchatEnabled,
        aiInstagramEnabled: ai.aiInstagramEnabled,
        aiSystemPrompt: ai.aiSystemPrompt || undefined,
        aiGreetingMessage: ai.aiGreetingMessage || undefined,
        aiTone: ai.aiTone,
        aiLanguage: ai.aiLanguage,
        aiWorkingHoursEnabled: ai.aiWorkingHoursEnabled,
        aiWorkingHours: activeHours,
        aiAwayMessage: ai.aiAwayMessage || undefined,
      });
      toast.success("AI front-desk settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save AI front-desk settings.",
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
      <SettingsCard
        title="AI front desk"
        description="Configure assistant behavior and handoff rules. Automated channels work only when their provider connection is configured."
        action={
          <Badge variant={ai.aiEnabled ? "success" : "secondary"}>
            {ai.aiEnabled ? "Enabled" : "Off"}
          </Badge>
        }
        contentClassName="flex flex-col gap-7"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving ? "Saving…" : "Save AI settings"}
          </Button>
        }
      >
        <SettingsToggleRow
          title="Enable AI front desk"
          description="Use this configuration on connected and enabled customer channels."
          control={
            <Switch
              id="ai-enabled"
              aria-label="Enable AI front desk"
              checked={ai.aiEnabled}
              onCheckedChange={(checked) =>
                setAi((current) => ({ ...current, aiEnabled: checked }))
              }
            />
          }
        />

        {ai.aiEnabled && (
          <>
            <Separator />

            <SettingsSection
              title="Assistant identity"
              description="Set the customer-facing name, confidence threshold, and handoff route."
            >
              <FieldGroup className="max-w-2xl">
                <Field data-invalid={Boolean(personaError)}>
                  <FieldLabel htmlFor="persona-name">Assistant name</FieldLabel>
                  <DebouncedInput
                    id="persona-name"
                    value={ai.aiPersonaName}
                    maxLength={50}
                    aria-describedby="persona-name-description"
                    aria-invalid={Boolean(personaError)}
                    onChange={(value) => {
                      setAi((current) => ({
                        ...current,
                        aiPersonaName: value,
                      }));
                      if (personaError) setPersonaError(undefined);
                    }}
                  />
                  <FieldDescription id="persona-name-description">
                    The name customers see in automated conversations.
                  </FieldDescription>
                  <FieldError>{personaError}</FieldError>
                </Field>

                <Field data-invalid={Boolean(confidenceError)}>
                  <FieldLabel htmlFor="confidence-threshold">
                    Confidence threshold
                  </FieldLabel>
                  <DebouncedInput
                    id="confidence-threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={String(ai.aiConfidenceThreshold)}
                    aria-describedby="confidence-description"
                    aria-invalid={Boolean(confidenceError)}
                    onChange={(value) => {
                      setAi((current) => ({
                        ...current,
                        aiConfidenceThreshold: Number.parseFloat(value),
                      }));
                      if (confidenceError) setConfidenceError(undefined);
                    }}
                  />
                  <ConfidenceMeter value={ai.aiConfidenceThreshold} />
                  <FieldDescription id="confidence-description">
                    Below this score, the conversation is handed to a person.
                  </FieldDescription>
                  <FieldError>{confidenceError}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="handoff-phone">
                    Handoff phone number
                  </FieldLabel>
                  <DebouncedInput
                    id="handoff-phone"
                    value={ai.aiHandoffPhoneNumber}
                    placeholder="+389 71 234 567"
                    onChange={(value) =>
                      setAi((current) => ({
                        ...current,
                        aiHandoffPhoneNumber: value,
                      }))
                    }
                  />
                  <FieldDescription>
                    Customers can be directed here when the assistant cannot
                    help.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </SettingsSection>

            <Separator />

            <SettingsSection
              title="Channels"
              description="These switches permit an existing channel connection; they do not configure the provider itself."
            >
              <div className="flex flex-col gap-3">
                <SettingsToggleRow
                  title="Web chat"
                  description="Allow the assistant on the configured booking-page chat."
                  control={
                    <Switch
                      id="webchat-enabled"
                      aria-label="Enable web chat"
                      checked={ai.aiWebchatEnabled}
                      onCheckedChange={(checked) =>
                        setAi((current) => ({
                          ...current,
                          aiWebchatEnabled: checked,
                        }))
                      }
                    />
                  }
                />
                <SettingsToggleRow
                  title="Instagram DM"
                  description="Allow the assistant on the configured Instagram connection."
                  control={
                    <Switch
                      id="instagram-enabled"
                      aria-label="Enable Instagram DM"
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
              title="Conversation style"
              description="Choose how the assistant speaks and opens a conversation."
            >
              <FieldGroup className="max-w-2xl">
                <Field>
                  <FieldLabel>Tone</FieldLabel>
                  <ToggleGroup
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
                    aria-label="Assistant tone"
                    className="flex flex-wrap"
                  >
                    {TONES.map((tone) => (
                      <ToggleGroupItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>

                <Field>
                  <FieldLabel>Language</FieldLabel>
                  <ToggleGroup
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
                    aria-label="Assistant language"
                    className="flex flex-wrap"
                  >
                    {LANGUAGES.map((language) => (
                      <ToggleGroupItem
                        key={language.value}
                        value={language.value}
                      >
                        {language.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <FieldDescription>
                    Auto-detect replies in English or Macedonian based on the
                    customer&apos;s message.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="greeting-message">
                    Greeting message
                  </FieldLabel>
                  <DebouncedInput
                    id="greeting-message"
                    value={ai.aiGreetingMessage}
                    placeholder="Hi! How can I help with your appointment?"
                    onChange={(value) =>
                      setAi((current) => ({
                        ...current,
                        aiGreetingMessage: value,
                      }))
                    }
                  />
                  <FieldDescription>
                    Sent when a new automated conversation starts.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="custom-instructions">
                    Custom instructions
                  </FieldLabel>
                  <DebouncedTextarea
                    id="custom-instructions"
                    value={ai.aiSystemPrompt}
                    rows={4}
                    placeholder="Add studio-specific rules and context."
                    onChange={(value) =>
                      setAi((current) => ({
                        ...current,
                        aiSystemPrompt: value,
                      }))
                    }
                  />
                  <FieldDescription>
                    Add boundaries, special policies, or preferred wording.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </SettingsSection>

            <Separator />

            <SettingsSection
              title="Working hours"
              description="Optionally limit automated replies to a weekly schedule."
            >
              <SettingsToggleRow
                title="Use working hours"
                description="Send the away message outside the selected times."
                control={
                  <Switch
                    id="working-hours-enabled"
                    aria-label="Use AI working hours"
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
                        key={day}
                        className="grid grid-cols-[auto_2.5rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3"
                      >
                        <Checkbox
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
                        <Label htmlFor={`ai-day-${dayOfWeek}`}>{day}</Label>
                        <DebouncedInput
                          type="time"
                          aria-label={`${day} start time`}
                          disabled={!enabled}
                          value={hours?.startTime ?? "09:00"}
                          onChange={(value) =>
                            updateWorkingHour(dayOfWeek, "startTime", value)
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          to
                        </span>
                        <DebouncedInput
                          type="time"
                          aria-label={`${day} end time`}
                          disabled={!enabled}
                          value={hours?.endTime ?? "18:00"}
                          onChange={(value) =>
                            updateWorkingHour(dayOfWeek, "endTime", value)
                          }
                        />
                      </div>
                    );
                  })}

                  <Field>
                    <FieldLabel htmlFor="away-message">Away message</FieldLabel>
                    <DebouncedTextarea
                      id="away-message"
                      value={ai.aiAwayMessage}
                      rows={3}
                      placeholder="We are currently outside business hours."
                      onChange={(value) =>
                        setAi((current) => ({
                          ...current,
                          aiAwayMessage: value,
                        }))
                      }
                    />
                  </Field>
                </div>
              )}
            </SettingsSection>
          </>
        )}
      </SettingsCard>
    </TabsContent>
  );
}
