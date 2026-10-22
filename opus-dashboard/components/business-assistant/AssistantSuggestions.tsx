"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";

export function AssistantSuggestions({
  prompts,
  disabled,
  onPrompt,
}: {
  prompts: string[];
  disabled: boolean;
  onPrompt: (prompt: string) => void;
}) {
  const { t } = useDashboardI18n();
  return (
    <div
      role="group"
      aria-label={t(
        "Suggested questions",
        "Предложени прашања",
        "Pyetje të sugjeruara",
      )}
      className="flex min-w-0 scroll-fade-x gap-2 overflow-x-auto overscroll-x-contain py-1 scrollbar-none"
    >
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0 rounded-full sm:min-h-9"
          disabled={disabled}
          onClick={() => onPrompt(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
