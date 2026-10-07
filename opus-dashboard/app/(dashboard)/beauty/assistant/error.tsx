"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export default function AssistantError({ reset }: { reset: () => void }) {
  const { t } = useDashboardI18n();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          {t(
            "This conversation is unavailable",
            "Овој разговор не е достапен",
            "Kjo bisedë nuk është e disponueshme",
          )}
        </EmptyTitle>
        <EmptyDescription>
          {t(
            "Check that you are using the correct studio and account.",
            "Проверете дали го користите соодветното студио и профил.",
            "Sigurohuni që po përdorni studion dhe llogarinë e duhur.",
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button data-replay-public onClick={reset}>
          {t("Try again", "Обидете се повторно", "Provoni përsëri")}
        </Button>
        <Button variant="outline" asChild>
          <Link data-replay-public href="/beauty/assistant">
            {t("Back to assistant", "Назад кон асистентот", "Kthehu te asistenti")}
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
