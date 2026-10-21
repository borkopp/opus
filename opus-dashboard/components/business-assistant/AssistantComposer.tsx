"use client";

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
          <FieldLabel
            data-replay-public
            htmlFor="business-question"
            className="sr-only"
          >
            {t(
              "Ask about your studio",
              "Прашајте за вашето студио",
              "Pyesni për studion tuaj",
            )}
          </FieldLabel>
          <InputGroup className="dashboard-assistant-composer">
            <InputGroupTextarea
              className="max-h-[min(15rem,25dvh)] min-h-12 overflow-y-auto overscroll-contain py-2"
              id="business-question"
              value={question}
              maxLength={2000}
              disabled={disabled}
              rows={2}
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
                  onSend();
                }
              }}
            />
            <InputGroupAddon
              align="block-end"
              className="justify-between gap-2 px-2.5 pt-0.5 pb-2"
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
                  className="group/mode h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm motion-reduce:transition-none"
                  title={t(
                    "Fast answers and essential figures",
                    "Брзи одговори и клучни бројки",
                    "Përgjigje të shpejta dhe shifra thelbësore",
                  )}
                >
                  <Zap
                    aria-hidden
                    className="size-3.5 group-data-[state=on]/mode:text-primary"
                  />
                  {t("Fast", "Брза", "E shpejtë")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="deep"
                  className="group/mode h-8 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm motion-reduce:transition-none"
                  disabled={deepRemaining === 0}
                  title={
                    deepRemaining === null
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
                    className="size-3.5 group-data-[state=on]/mode:text-primary"
                  />
                  {t("Detailed", "Детална", "E detajuar")}
                </ToggleGroupItem>
              </ToggleGroup>
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
