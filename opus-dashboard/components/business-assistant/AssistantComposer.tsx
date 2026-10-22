"use client";

import { useId, type Ref } from "react";
import { ArrowUp, BrainCircuit, Zap } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
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
  detailedAllowed = true,
  onSend,
  inputRef,
}: {
  question: string;
  setQuestion: (value: string) => void;
  depth: "standard" | "deep";
  setDepth: (value: "standard" | "deep") => void;
  disabled: boolean;
  pending: boolean;
  deepRemaining: number | null;
  detailedAllowed?: boolean;
  onSend: () => void;
  inputRef?: Ref<HTMLTextAreaElement>;
}) {
  const { t } = useDashboardI18n();
  const inputId = useId();
  const cannotSend =
    disabled ||
    pending ||
    !question.trim() ||
    (depth === "deep" && deepRemaining === 0);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!cannotSend) onSend();
      }}
      className="shrink-0 pt-3"
    >
      <FieldGroup>
        <Field>
          <FieldLabel data-replay-public htmlFor={inputId} className="sr-only">
            {t(
              "Ask about your studio",
              "Прашајте за вашето студио",
              "Pyesni për studion tuaj",
            )}
          </FieldLabel>
          <InputGroup
            className="dashboard-assistant-composer"
            data-disabled={disabled && !pending}
          >
            <InputGroupTextarea
              ref={inputRef}
              className="max-h-[min(12rem,25dvh)] min-h-11 overflow-y-auto overscroll-contain px-3 py-2.5"
              id={inputId}
              value={question}
              maxLength={2000}
              disabled={disabled && !pending}
              rows={1}
              placeholder={t(
                "What would you like to understand about your studio?",
                "Што сакате да дознаете за вашето студио?",
                "Çfarë dëshironi të kuptoni rreth studios suaj?",
              )}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (!cannotSend) onSend();
                }
              }}
            />
            <InputGroupAddon
              align="block-end"
              className="justify-between gap-2 px-2 pt-0.5 pb-1.5"
            >
              <ToggleGroup
                type="single"
                value={depth}
                size="sm"
                variant="default"
                spacing={1}
                className="shrink-0 rounded-full border border-border/70 bg-muted/60 p-0.5"
                aria-label={t(
                  "Analysis depth",
                  "Длабочина на анализа",
                  "Thellësia e analizës",
                )}
                disabled={pending}
                onValueChange={(value) => {
                  if (value === "standard" || value === "deep") setDepth(value);
                }}
              >
                <ToggleGroupItem
                  value="standard"
                  className="group/mode h-9 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm motion-reduce:transition-none sm:h-8"
                  title={t(
                    "Fast answers and essential figures",
                    "Брзи одговори и клучни бројки",
                    "Përgjigje të shpejta dhe shifra thelbësore",
                  )}
                >
                  <Zap
                    aria-hidden
                    className="hidden group-data-[state=on]/mode:text-primary sm:block"
                  />
                  {t("Fast", "Брза", "E shpejtë")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="deep"
                  className="group/mode h-9 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm motion-reduce:transition-none sm:h-8"
                  disabled={!detailedAllowed || deepRemaining === 0}
                  title={
                    !detailedAllowed
                      ? t(
                          "Detailed analysis is available with OPUS Pro",
                          "Деталната анализа е достапна со OPUS Pro",
                          "Analiza e detajuar është e disponueshme me OPUS Pro",
                        )
                      : deepRemaining === null
                        ? t(
                            "More context and recommendations",
                            "Повеќе детали и препораки",
                            "Më shumë kontekst dhe rekomandime",
                          )
                        : t(
                            `More context and recommendations · ${deepRemaining} remaining`,
                            `Повеќе детали и препораки · Преостанати: ${deepRemaining}`,
                            `Më shumë kontekst dhe rekomandime · ${deepRemaining} të mbetura`,
                          )
                  }
                >
                  <BrainCircuit
                    aria-hidden
                    className="hidden group-data-[state=on]/mode:text-primary sm:block"
                  />
                  {t("Detailed", "Детална", "E detajuar")}
                  {!detailedAllowed && <span className="text-[10px]">Pro</span>}
                </ToggleGroupItem>
              </ToggleGroup>
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                className="size-11 shrink-0 rounded-full sm:size-9"
                disabled={cannotSend}
                aria-label={t(
                  "Send question",
                  "Испрати прашање",
                  "Dërgo pyetjen",
                )}
              >
                {pending ? <Spinner aria-hidden="true" /> : <ArrowUp />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
    </form>
  );
}
