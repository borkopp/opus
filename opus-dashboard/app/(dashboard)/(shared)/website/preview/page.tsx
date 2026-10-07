import type { Metadata } from "next";
import { WebsitePreviewFrame } from "@/components/website/WebsitePreviewFrame";

export const metadata: Metadata = {
  title: "OPUS Sites preview",
  robots: { index: false, follow: false },
};
export default function WebsiteEditorPreviewPage() {
  return <WebsitePreviewFrame />;
}
