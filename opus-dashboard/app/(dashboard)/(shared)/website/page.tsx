import type { Metadata } from "next";
import { WebsiteEditor } from "./_components/WebsiteEditor";

export const metadata: Metadata = {
  title: "OPUS Sites",
  robots: { index: false, follow: false },
};

export default function WebsiteEditorPage() {
  return <WebsiteEditor />;
}
