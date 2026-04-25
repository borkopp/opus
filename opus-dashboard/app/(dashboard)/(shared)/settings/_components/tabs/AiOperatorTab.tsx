"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DebouncedTextarea } from "@/components/ui/debounced-textarea";
import { IconDeviceFloppy, IconAlertCircle, IconRobot } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validConfidence } from "../validation";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <IconAlertCircle size={13} className="shrink-0" />
      {message}
    </p>
  );
}

const TONE_CONFIG = {
  friendly: { emoji: "🤝", label: "Friendly" },
  professional: { emoji: "💼", label: "Professional" },
  casual: { emoji: "😌", label: "Casual" },
  formal: { emoji: "🎩", label: "Formal" },
} as const;

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, isNaN(value) ? 0 : value)) * 100;
  const color =
    pct >= 70 ? "bg-emerald-500" :
      pct >= 40 ? "bg-amber-500" :
        "bg-red-500";
  const label =
    pct >= 70 ? "High — AI handles most requests autonomously" :
      pct >= 40 ? "Moderate — balances autonomy and escalation" :
        "Low — escalates to you frequently";
  return (
    <div className="max-w-xl space-y-1.5">
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
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
    aiWorkingHours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    aiWorkingHoursEnabled_days: boolean[];
    aiAwayMessage: string;
  };
}

export function AiOperatorTab({ orgId, initialData }: AiOperatorTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [ai, setAi] = useState({ ...initialData });
  const [confidenceError, setConfidenceError] = useState<string | undefined>();
  const [personaError, setPersonaError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAi({ ...initialData });
  }, [
    initialData.aiEnabled,
    initialData.aiPersonaName,
    initialData.aiConfidenceThreshold,
    initialData.aiHandoffPhoneNumber,
    initialData.aiWebchatEnabled,
    initialData.aiInstagramEnabled,
    initialData.aiSystemPrompt,
    initialData.aiGreetingMessage,
    initialData.aiTone,
    initialData.aiLanguage,
    initialData.aiWorkingHoursEnabled,
    initialData.aiAwayMessage,
  ]);

  const updateAiSettings = useMutation(api.orgSettings.updateAiSettings);

  const handleSave = async () => {
    let hasErrors = false;
    if (!ai.aiPersonaName.trim()) {
      setPersonaError("Persona name is required.");
      hasErrors = true;
    }
    if (!validConfidence(ai.aiConfidenceThreshold)) {
      setConfidenceError("Enter a number between 0 and 1 (e.g. 0.75).");
      hasErrors = true;
    }
    if (hasErrors) return;
    setPersonaError(undefined);
    setConfidenceError(undefined);
    setIsSaving(true);
    try {
      const activeHours = ai.aiWorkingHours.filter(
        (h, i) => ai.aiWorkingHoursEnabled_days[i] !== false,
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
      if (isMounted.current) toast.success("AI settings saved");
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to save AI settings.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="ai"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        {/* ── Section header with live status badge ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-medium font-display tracking-tight">
              AI Booking <span className="serif-accent-inline text-2xl">Assistant</span>
            </h2>
            {ai.aiEnabled && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Let an AI handle customer messages and booking requests automatically.
          </p>
        </div>

        <div className="space-y-10">
          {/* ── Enable toggle ── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="ai-enabled" className="select-none font-medium cursor-pointer">
                Activate AI Operator
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable the autonomous Claude-powered booking engine.
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={ai.aiEnabled}
              onCheckedChange={(c) => setAi({ ...ai, aiEnabled: c })}
            />
          </div>

          {ai.aiEnabled && (
            <div className="space-y-6 mt-4">
              {/* ── Core Settings ── */}
              <div className="grid gap-6 p-6 border border-border/60 rounded-xl bg-background shadow-sm">
                {/* Persona Name with live chat bubble preview */}
                <div className="grid gap-2 max-w-xl">
                  <Label htmlFor="persona-name">Persona Name</Label>
                  <DebouncedInput
                    id="persona-name"
                    value={ai.aiPersonaName}
                    maxLength={50}
                    aria-describedby={personaError ? "persona-name-error" : undefined}
                    aria-invalid={!!personaError}
                    className={cn("bg-white", personaError && "border-destructive")}
                    onChange={(val) => {
                      setAi({ ...ai, aiPersonaName: val });
                      personaError && setPersonaError(undefined);
                    }}
                  />
                  {/* Live persona preview — updates as you type */}
                  {!personaError && ai.aiPersonaName.trim() ? (
                    <div className="flex items-start gap-2 mt-1">
                      <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <IconRobot size={12} className="text-primary" />
                      </div>
                      <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs text-muted-foreground">
                        Hi! I&apos;m{" "}
                        <span className="font-medium text-foreground">{ai.aiPersonaName.trim()}</span>
                        , your booking assistant. How can I help?
                      </div>
                    </div>
                  ) : !personaError ? (
                    <p className="text-xs text-muted-foreground">
                      The name shown to customers (e.g. &ldquo;Aria&rdquo;).
                    </p>
                  ) : null}
                  <FieldError id="persona-name-error" message={personaError} />
                </div>

                {/* Confidence threshold with visual meter */}
                <div className="grid gap-2 max-w-xl">
                  <Label htmlFor="confidence-threshold">
                    Confidence Threshold
                    <span className="text-muted-foreground font-normal ml-1">(0–1)</span>
                  </Label>
                  <DebouncedInput
                    id="confidence-threshold"
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={String(ai.aiConfidenceThreshold)}
                    aria-describedby={confidenceError ? "confidence-error" : "confidence-hint"}
                    aria-invalid={!!confidenceError}
                    className={cn("bg-white", confidenceError && "border-destructive")}
                    onChange={(val) => {
                      setAi({ ...ai, aiConfidenceThreshold: parseFloat(val) });
                      confidenceError && setConfidenceError(undefined);
                    }}
                  />
                  {!confidenceError && (
                    <>
                      <ConfidenceMeter value={ai.aiConfidenceThreshold} />
                      <p id="confidence-hint" className="text-xs text-muted-foreground">
                        How sure the AI needs to be before responding on its own. Lower = handles more, higher = escalates more. Try 0.75 to start.
                      </p>
                    </>
                  )}
                  <FieldError id="confidence-error" message={confidenceError} />
                </div>

                <div className="grid gap-2 max-w-xl">
                  <Label htmlFor="handoff-phone">Escalation Phone Number</Label>
                  <DebouncedInput
                    id="handoff-phone"
                    value={ai.aiHandoffPhoneNumber}
                    className="bg-white"
                    placeholder="+38971234567"
                    onChange={(val) => setAi({ ...ai, aiHandoffPhoneNumber: val })}
                  />
                  <p className="text-xs text-muted-foreground">
                    When the AI can&apos;t help, the customer can be directed to call this number.
                  </p>
                </div>
              </div>

              {/* ── Channels with live-dot indicators ── */}
              <div className="p-6 border border-border/60 rounded-xl bg-background shadow-sm space-y-4">
                <div>
                <h3 className="font-medium text-sm mb-0.5">Active <span className="serif-accent-inline text-sm">Channels</span></h3>
                  <p className="text-xs text-muted-foreground">
                    Choose which channels the AI will handle.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between max-w-xl">
                    <div className="flex items-center gap-2">
                      {ai.aiWebchatEnabled && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
                      )}
                      <span className={cn("text-sm font-medium transition-colors", ai.aiWebchatEnabled && "text-foreground")}>
                        Webchat Widget
                      </span>
                      <span className="text-xs text-muted-foreground">
                        — embedded chat on your booking page
                      </span>
                    </div>
                    <Switch
                      id="webchat-enabled"
                      checked={ai.aiWebchatEnabled}
                      onCheckedChange={(c) => setAi({ ...ai, aiWebchatEnabled: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between max-w-xl">
                    <div className="flex items-center gap-2">
                      {ai.aiInstagramEnabled && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
                      )}
                      <span className={cn("text-sm font-medium transition-colors", ai.aiInstagramEnabled && "text-foreground")}>
                        Instagram DM
                      </span>
                      <span className="text-xs text-muted-foreground">
                        — replies to customer DMs automatically
                      </span>
                    </div>
                    <Switch
                      id="instagram-enabled"
                      checked={ai.aiInstagramEnabled}
                      onCheckedChange={(c) => setAi({ ...ai, aiInstagramEnabled: c })}
                    />
                  </div>
                </div>
              </div>

              {/* ── Conversation Style ── */}
              <div className="space-y-5">
                <div>
                  <h3 className="font-medium text-sm mb-0.5">Conversation <span className="serif-accent-inline text-sm">Style</span></h3>
                  <p className="text-xs text-muted-foreground">
                    Shape how the AI communicates with your customers.
                  </p>
                </div>

                {/* Tone pills with emoji */}
                <div className="grid gap-2 max-w-xl">
                  <Label>Tone</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(["friendly", "professional", "casual", "formal"] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        aria-pressed={ai.aiTone === tone}
                        onClick={() => setAi({ ...ai, aiTone: tone })}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-sm border transition-all duration-150 flex items-center gap-1.5",
                          "active:scale-95",
                          ai.aiTone === tone
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                        )}
                      >
                        <span aria-hidden="true">{TONE_CONFIG[tone].emoji}</span>
                        {TONE_CONFIG[tone].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language pills */}
                <div className="grid gap-2 max-w-xl">
                  <Label>Language</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        { value: "auto", label: "Auto-detect" },
                        { value: "en", label: "English" },
                        { value: "mk", label: "Македонски" },
                      ] as const
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={ai.aiLanguage === value}
                        onClick={() => setAi({ ...ai, aiLanguage: value })}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm border transition-all duration-150",
                          "active:scale-95",
                          ai.aiLanguage === value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-detect replies in the same language the customer writes in (English or
                    Macedonian).
                  </p>
                </div>

                <div className="grid gap-2 max-w-xl">
                  <Label htmlFor="greeting-message">Greeting Message</Label>
                  <DebouncedInput
                    id="greeting-message"
                    value={ai.aiGreetingMessage}
                    className="bg-white"
                    placeholder="Hi! I'm Aria, your booking assistant. How can I help you today?"
                    onChange={(val) => setAi({ ...ai, aiGreetingMessage: val })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sent automatically when a new conversation starts.
                  </p>
                </div>
                <div className="grid gap-2 max-w-xl">
                  <Label htmlFor="custom-instructions">Custom Instructions</Label>
                  <DebouncedTextarea
                    id="custom-instructions"
                    value={ai.aiSystemPrompt}
                    onChange={(val) => setAi({ ...ai, aiSystemPrompt: val })}
                    placeholder="Always greet customers by name. Never discuss competitor pricing. Only offer services from our menu..."
                    rows={4}
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add extra rules or context for the AI — e.g. how to greet customers, what not to discuss, or special policies.
                  </p>
                </div>
              </div>

              {/* ── Working Hours ── */}
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-sm">Working Hours</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Restrict the AI to specific hours. Outside these, it sends the away message.
                    </p>
                  </div>
                  <Switch
                    id="working-hours-enabled"
                    checked={ai.aiWorkingHoursEnabled}
                    onCheckedChange={(c) => setAi({ ...ai, aiWorkingHoursEnabled: c })}
                  />
                </div>
                {ai.aiWorkingHoursEnabled && (
                  <div className="space-y-3">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
                      const dayIndex = i;
                      const hoursEntry = ai.aiWorkingHours.find(
                        (h) => h.dayOfWeek === dayIndex,
                      );
                      const isEnabled = ai.aiWorkingHoursEnabled_days[i] ?? false;
                      return (
                        <div key={day} className="flex items-center gap-3 max-w-xl">
                          <div className="w-12 flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              id={`day-${day}`}
                              checked={isEnabled}
                              onChange={(e) => {
                                const updated = [...ai.aiWorkingHoursEnabled_days];
                                updated[i] = e.target.checked;
                                setAi({ ...ai, aiWorkingHoursEnabled_days: updated });
                              }}
                              className="rounded"
                            />
                            <Label
                              htmlFor={`day-${day}`}
                              className="text-sm text-muted-foreground"
                            >
                              {day}
                            </Label>
                          </div>
                          <DebouncedInput
                            type="time"
                            disabled={!isEnabled}
                            value={hoursEntry?.startTime ?? "09:00"}
                            className="bg-white w-28 text-sm"
                            onChange={(val) => {
                              const updated = ai.aiWorkingHours.map((h) =>
                                h.dayOfWeek === dayIndex ? { ...h, startTime: val } : h,
                              );
                              setAi({ ...ai, aiWorkingHours: updated });
                            }}
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <DebouncedInput
                            type="time"
                            disabled={!isEnabled}
                            value={hoursEntry?.endTime ?? "18:00"}
                            className="bg-white w-28 text-sm"
                            onChange={(val) => {
                              const updated = ai.aiWorkingHours.map((h) =>
                                h.dayOfWeek === dayIndex ? { ...h, endTime: val } : h,
                              );
                              setAi({ ...ai, aiWorkingHours: updated });
                            }}
                          />
                        </div>
                      );
                    })}
                    <div className="grid gap-2 max-w-xl pt-2">
                      <Label htmlFor="away-message">Away Message</Label>
                      <DebouncedTextarea
                        id="away-message"
                        value={ai.aiAwayMessage}
                        onChange={(val) => setAi({ ...ai, aiAwayMessage: val })}
                        placeholder="We're currently outside business hours. Please reach out again during our working hours!"
                        rows={3}
                        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform">
            <IconDeviceFloppy size={18} /> {isSaving ? "Saving…" : "Save AI Settings"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
