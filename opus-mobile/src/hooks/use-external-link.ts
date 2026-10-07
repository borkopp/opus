import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { useStudio } from "@/providers/studio-provider";

export function useExternalLink() {
  const { t } = useStudio();
  const [linkError, setLinkError] = useState<string | null>(null);
  const openLink = useCallback(async (url: string) => {
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError(t("Could not open this link. Please try again.", "Линкот не се отвори. Обиди се повторно."));
    }
  }, [t]);
  return { openLink, linkError };
}
