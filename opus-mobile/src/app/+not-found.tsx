import { router } from "expo-router";
import { FileQuestion } from "lucide-react-native";
import { Screen } from "@/components/dashboard/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useStudio } from "@/providers/studio-provider";

export default function NotFound() {
  const { t } = useStudio();
  return (
    <Screen underHeader>
      <EmptyState
        icon={FileQuestion}
        title={t("Page unavailable", "Страницата не е достапна")}
        description={t(
          "This link is unavailable or you no longer have access to this page.",
          "Линкот не е достапен или повеќе немаш пристап до оваа страница.",
        )}
      />
      <Button
        label={t("Back to dashboard", "Назад кон прегледот")}
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
