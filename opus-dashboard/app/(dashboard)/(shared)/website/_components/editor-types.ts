import type { PublicSite } from "@/components/public-site/types";
import type {
  WebsiteDesign,
  WebsitePanel,
} from "../../../../../../shared/website-design";

export interface EditorControlProps {
  design: WebsiteDesign;
  site: PublicSite;
  change: (design: WebsiteDesign) => void;
  select: (panel: WebsitePanel) => void;
}
