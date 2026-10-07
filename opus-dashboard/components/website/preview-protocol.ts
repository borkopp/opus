import type { WebsiteCanvasProps } from "./website-types";
import type {
  WebsiteContentKey,
  WebsitePanel,
} from "../../../shared/website-design";
import type { Locale } from "../../../shared/i18n/locale";

export type WebsitePreviewState = Pick<
  WebsiteCanvasProps,
  "site" | "design" | "locale"
> & { selected: WebsitePanel; mode: "edit" | "interact" };
export type WebsitePreviewEvent =
  | { type: "opus-sites-ready" }
  | { type: "opus-sites-select"; panel: WebsitePanel }
  | { type: "opus-sites-content"; key: WebsiteContentKey; value: string }
  | { type: "opus-sites-locale"; locale: Locale };
export type WebsitePreviewCommand =
  | { type: "opus-sites-update"; state: WebsitePreviewState }
  | { type: "opus-sites-scroll"; panel: WebsitePanel };
