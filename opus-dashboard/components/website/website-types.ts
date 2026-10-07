import type { PublicSite } from "@/components/public-site/types";
import type { Locale } from "../../../shared/i18n/locale";
import type {
  WebsiteContentKey,
  WebsiteDesign,
  WebsitePanel,
} from "../../../shared/website-design";

export interface WebsiteEditing {
  selected: WebsitePanel;
  select: (panel: WebsitePanel) => void;
  content: (key: WebsiteContentKey, value: string) => void;
}

export interface WebsiteCanvasProps {
  site: PublicSite;
  design: WebsiteDesign;
  locale: Locale;
  onLocaleChange?: (locale: Locale) => void;
  editing?: WebsiteEditing;
}
