"use client";

import { ArrowUp, BrainCircuit, LoaderCircle, Zap } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
  InputGroupText,
} from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function AssistantComposer({
  question,
  setQuestion,
  depth,
  setDepth,
  disabled,
  pending,
  deepRemaining,
  onSend,
}: {
  question: string;
  setQuestion: (value: string) => void;
  depth: "standard" | "deep";
  setDepth: (value: "standard" | "deep") => void;
  disabled: boolean;
  pending: boolean;
  deepRemaining: number | null;
  onSend: () => void;
}) {
  const { t } = useDashboardI18n();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      className="shrink-0 pt-4"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="business-question" className="sr-only">
            {t("Ask about your studio", "Прашајте за вашето студио")}
          </FieldLabel>
          <InputGroup className="dashboard-assistant-composer">
            <InputGroupTextarea
              id="business-question"
              value={question}
              maxLength={2000}
              disabled={disabled}
              rows={2}
              placeholder={t(
                "What would you like to understand about your studio?",
                "Што сакате да дознаете за вашето студио?",
              )}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  onSend();
                }
              }}
            />
            <InputGroupAddon
              align="block-end"
              className="justify-between gap-2"
            >
              <ToggleGroup
                type="single"
                value={depth}
                size="sm"
                variant="default"
                spacing={1}
                className="shrink-0 rounded-full border border-border/70 bg-muted/60 p-1"
                aria-label={t("Analysis depth", "Длабочина на анализа")}
                disabled={pending}
                onValueChange={(value) => {
                  if (value === "standard" || value === "deep") setDepth(value);
                }}
              >
                <ToggleGroupItem
                  value="standard"
                  className="group/mode h-10 gap-2 rounded-full px-3 text-muted-foreground transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm motion-reduce:transition-none sm:px-4"
                  title={t(
                    "Fast answers and essential figures",
                    "Брзи одговори и клучни бројки",
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-background/60 text-muted-foreground transition-colors group-data-[state=on]/mode:bg-primary/15 group-data-[state=on]/mode:text-primary motion-reduce:transition-none">
                    <Zap aria-hidden className="size-3.5" />
                  </span>
                  {t("Fast", "Брза")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="deep"
                  className="group/mode h-10 gap-2 rounded-full px-3 text-muted-foreground transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm motion-reduce:transition-none sm:px-4"
                  disabled={deepRemaining === 0}
                  title={
                    deepRemaining === null
                      ? t(
                          "More context and recommendations",
                          "Повеќе детали и препораки",
                        )
                      : t(
                          `More context and recommendations · ${deepRemaining} remaining`,
                          `Повеќе детали и препораки · Преостанати: ${deepRemaining}`,
                        )
                  }
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-background/60 text-muted-foreground transition-colors group-data-[state=on]/mode:bg-primary/15 group-data-[state=on]/mode:text-primary motion-reduce:transition-none">
                    <BrainCircuit aria-hidden className="size-3.5" />
                  </span>
                  {t("Detailed", "Детална")}
                </ToggleGroupItem>
              </ToggleGroup>
              <InputGroupText className="ml-auto hidden sm:inline">
                {question.length}/2000
              </InputGroupText>
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                disabled={
                  disabled ||
                  pending ||
                  !question.trim() ||
                  (depth === "deep" && deepRemaining === 0)
                }
                aria-label={t("Send question", "Испрати прашање")}
              >
                {pending ? (
                  <LoaderCircle className="motion-safe:animate-spin" />
                ) : (
                  <ArrowUp />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
    </form>
  );
}
